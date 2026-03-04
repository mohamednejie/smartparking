<?php

namespace App\Http\Controllers;
use Inertia\Inertia;

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
    // BraintreeController.php

public function checkout(Request $request)
{
    $request->validate([
        'nonce' => 'required|string',
        // Ajoute 'minute' aux valeurs autorisées
        'plan'  => 'required|in:minute,monthly,yearly', 
    ]);

    $user = $request->user();
    $plan = $request->plan;

    // Définir montant et durée
    if ($plan === 'minute') {
        $amount = "1.00"; // 1 TND pour tester
        $duration = now()->addMinute(); 
    } elseif ($plan === 'monthly') {
        $amount = "19.99";
        $duration = now()->addMonth();
    } else {
        $amount = "199.99";
        $duration = now()->addYear();
    }

    try {
        $gateway = BraintreeService::gateway();

        $result = $gateway->transaction()->sale([
            'amount' => $amount,
            'paymentMethodNonce' => $request->nonce,
            'options' => ['submitForSettlement' => true]
        ]);

        if ($result->success) {
            $user->mode_compte = 'PREMIUM';
            $user->subscription_plan = $plan;

            // Logique d'ajout de temps
            if ($user->subscription_ends_at && $user->subscription_ends_at > now()) {
                if ($plan === 'minute') $user->subscription_ends_at = $user->subscription_ends_at->addMinute();
                elseif ($plan === 'monthly') $user->subscription_ends_at = $user->subscription_ends_at->addMonth();
                else $user->subscription_ends_at = $user->subscription_ends_at->addYear();
            } else {
                $user->subscription_ends_at = $duration;
            }
            
            $user->save();

            return response()->json(['success' => true]);
        }

        return response()->json(['success' => false, 'message' => $result->message], 400);

    } catch (\Exception $e) {
        \Log::error('Payment error', ['message' => $e->getMessage()]);
        return response()->json(['success' => false], 500);
    }
}

public function show(Request $request)
{
    $user = $request->user();

    $isPremiumActive = $user->mode_compte === 'PREMIUM' 
        && $user->subscription_ends_at 
        && $user->subscription_ends_at->isFuture();

    // 👇 Assure-toi que ce chemin correspond à ton fichier React
    // Si le fichier est resources/js/pages/BraintreePayment.tsx -> 'BraintreePayment'
    // Si c'est resources/js/pages/Settings/UpgradeToPremium.tsx -> 'Settings/UpgradeToPremium'
    return Inertia::render('BraintreePayment', [ 
        'isPremiumActive' => $isPremiumActive,
    ]);
}
}