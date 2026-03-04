<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class PayPalController extends Controller
{
    // Page d’upgrade : affiche le bouton PayPal et le prix
    public function showPlan(Request $request)
    {
        $user = $request->user();

        return Inertia::render('paypal/plan', [
            'isPremium'      => $user->is_premium ?? false,
            'planPrice'      => 19.99,
            'paypalClientId' => config('services.paypal.client_id'), // important pour le frontend
            'currency'       => 'USD',
        ]);
    }

    // Récupérer l'access token OAuth2 de PayPal
    private function getAccessToken()
    {
        $response = Http::asForm()
            ->withBasicAuth(
                config('services.paypal.client_id'),
                config('services.paypal.secret')
            )
            ->post(config('services.paypal.base_url') . '/v1/oauth2/token', [
                'grant_type' => 'client_credentials'
            ]);

        if (!$response->ok()) {
            Log::error('PayPal token error', ['body' => $response->body()]);
            abort(500, 'Impossible de récupérer le token PayPal.');
        }

        return $response->json()['access_token'];
    }

    // Créer un ordre PayPal
    public function createOrder(Request $request)
    {
        $user = $request->user();

        if ($user->is_premium ?? false) {
            return response()->json(['message' => 'Vous êtes déjà Premium.']);
        }

        $amount = 19.99;
        $token = $this->getAccessToken();

        $response = Http::withToken($token)
            ->post(config('services.paypal.base_url') . '/v2/checkout/orders', [
                "intent" => "CAPTURE",
                "purchase_units" => [[
                    "amount" => [
                        "currency_code" => "USD",
                        "value" => $amount
                    ]
                ]]
            ]);

        if (!$response->ok()) {
            Log::error('PayPal create order failed', ['body' => $response->body()]);
            return response()->json(['error' => 'Impossible d\'initier le paiement PayPal.'], 500);
        }

        $data = $response->json();
        return response()->json(['orderID' => $data['id']]);
    }

    // Capturer le paiement après approbation de l'utilisateur
public function captureOrder(Request $request, $orderId)
{
    $user = $request->user();

    try {

        $accessToken = $this->getAccessToken();

        // On récupère l'ordre au lieu de le capturer
        $response = Http::withToken($accessToken)
            ->get(config('services.paypal.base_url') . "/v2/checkout/orders/{$orderId}");

        if ($response->failed()) {
            return response()->json([
                'success' => false,
                'message' => 'Impossible de vérifier le paiement.'
            ], 500);
        }

        $data = $response->json();

        if ($data['status'] === 'COMPLETED') {

            $user->is_premium = true;
            $user->save();

            return response()->json([
                'success' => true,
                'message' => 'Paiement confirmé !'
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Paiement non complété.'
        ], 400);

    } catch (\Throwable $e) {

        return response()->json([
            'success' => false,
            'message' => 'Erreur serveur.'
        ], 500);
    }
}
}