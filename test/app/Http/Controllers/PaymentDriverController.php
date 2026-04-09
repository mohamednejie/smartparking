<?php

namespace App\Http\Controllers;

use App\Models\Reservation;
use App\Models\Transaction;
use Braintree\Gateway;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PaymentDriverController extends Controller
{
    protected Gateway $gateway;

    public function __construct()
    {
        $this->gateway = new Gateway([
            'environment' => config('services.braintree.environment'),
            'merchantId'  => config('services.braintree.merchant_id'),
            'publicKey'   => config('services.braintree.public_key'),
            'privateKey'  => config('services.braintree.private_key'),
        ]);
    }

    /**
     * Générer un client token
     */
    public function token()
    {
        try {
            $clientToken = $this->gateway->clientToken()->generate();
            return response()->json(['token' => $clientToken]);
        } catch (\Exception $e) {
            Log::error("Braintree token error: {$e->getMessage()}");
            return response()->json(['error' => 'Failed to generate token'], 500);
        }
    }

    /**
     * Traiter le paiement d'une réservation (drivers)
     */
    public function checkoutReservation(Request $request)
    {
        $validated = $request->validate([
            'nonce'          => 'required|string',
            'reservation_id' => 'required|exists:reservations,id',
        ]);

        $user        = auth()->user();
        $reservation = Reservation::with(['parking', 'vehicle'])->findOrFail($validated['reservation_id']);

        if ($reservation->user_id !== $user->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        if ($reservation->status !== 'awaiting_payment') {
            return response()->json([
                'success' => false,
                'message' => "Cette réservation n'est pas en attente de paiement.",
            ], 422);
        }

        $amount = (float) $reservation->total_price;

        if ($amount <= 0) {
            return response()->json(['success' => false, 'message' => 'Montant invalide'], 422);
        }

        try {
            $result = $this->gateway->transaction()->sale([
                'amount'             => number_format($amount, 2, '.', ''),
                'paymentMethodNonce' => $validated['nonce'],
                'options'            => [
                    'submitForSettlement' => true,
                ],
            ]);

            if ($result->success) {
                $transaction = $result->transaction;

                // Enregistrer la transaction
                Transaction::create([
                    'user_id'                  => $user->id,
                    'reservation_id'           => $reservation->id,
                    'braintree_transaction_id' => $transaction->id,
                    'type'                     => 'parking_payment',
                    'amount'                   => $amount,
                    'status'                   => 'success',
                    'payment_method_type'      => $transaction->paymentInstrumentType ?? null,
                    'card_last_four'           => $transaction->creditCard['last4'] ?? null,
                    'card_brand'               => $transaction->creditCard['cardType'] ?? null,
                ]);

                // Mettre à jour la réservation
                $reservation->update([
                    'status'  => 'paid',
                    'paid_at' => now(),
                ]);

                // Libérer la place
                $parking = $reservation->parking;
                if ($parking && $parking->available_spots < $parking->total_spots) {
                    $parking->increment('available_spots');
                }

                // Ouvrir la barrière
                $plate    = $reservation->exit_plate ?? $reservation->vehicle?->license_plate ?? '';
                $flaskUrl = config('services.flask.url', 'http://127.0.0.1:5000');

                try {
                    \Illuminate\Support\Facades\Http::timeout(3)->post(
                        "{$flaskUrl}/api/parking/{$parking->id}/open_barrier",
                        ['plate' => $plate, 'reason' => 'payment_confirmed']
                    );
                    Log::info("🔓 [BRAINTREE] Barrière ouverte — {$plate}");
                } catch (\Exception $e) {
                    Log::warning("⚠️ [BRAINTREE] Flask injoignable : " . $e->getMessage());
                }

                Log::info("✅ [BRAINTREE] Paiement réussi — {$amount} TND — {$transaction->id}");

                return response()->json([
                    'success'            => true,
                    'message'            => 'Paiement effectué avec succès.',
                    'transaction_id'     => $transaction->id,
                    'amount'             => $amount,
                    'reservation_status' => 'paid',
                ]);

            } else {
                $errorMessage = $result->message ?? 'Paiement refusé';

                Transaction::create([
                    'user_id'                  => $user->id,
                    'reservation_id'           => $reservation->id,
                    'braintree_transaction_id' => 'FAILED_' . uniqid(),
                    'type'                     => 'parking_payment',
                    'amount'                   => $amount,
                    'status'                   => 'failed',
                    'error_message'            => $errorMessage,
                ]);

                Log::warning("❌ [BRAINTREE] Paiement échoué — {$errorMessage}");

                return response()->json([
                    'success' => false,
                    'message' => $errorMessage,
                ], 422);
            }

        } catch (\Exception $e) {
            Log::error("❌ [BRAINTREE] Exception : {$e->getMessage()}");

            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue.',
            ], 500);
        }
    }
}