<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\BraintreeService;

class BraintreeController extends Controller
{
    /**
     * Générer un client token pour le frontend
     */
    public function token(Request $request)
    {
        try {
            $gateway = BraintreeService::gateway();

            $clientToken = $gateway->clientToken()->generate();

            return response()->json([
                'success' => true,
                'token' => $clientToken // 🔑 clé token pour le frontend
            ]);

        } catch (\Exception $e) {
            \Log::error('Braintree token error', [
                'message' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Impossible de générer le token.'
            ], 500);
        }
    }

    /**
     * Traiter le paiement
     */
    public function checkout(Request $request)
    {
        // Validation du nonce
        $request->validate([
            'nonce' => 'required|string'
        ]);

        try {
            $gateway = BraintreeService::gateway();

            $result = $gateway->transaction()->sale([
                'amount' => "19.99", // 💰 change le montant ici
                'paymentMethodNonce' => $request->nonce,
                'options' => [
                    'submitForSettlement' => true
                ]
            ]);

            if ($result->success) {
                // Mettre à jour le type de compte de l'utilisateur
                $user = $request->user();
                if ($user) {
                    $user->mode_compte = 'PREMIUM';
                    $user->save();
                }

                return response()->json([
                    'success' => true,
                    'transaction_id' => $result->transaction->id
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => $result->message
            ], 400);

        } catch (\Exception $e) {
            \Log::error('Braintree checkout error', [
                'message' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur serveur lors du paiement.'
            ], 500);
        }
    }
}