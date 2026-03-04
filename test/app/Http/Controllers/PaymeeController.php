<?php

namespace App\Http\Controllers;

use App\Models\PaymeePayment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class PaymeeController extends Controller
{
    // Page d’upgrade : affiche bouton / iframe selon cas
    public function showPlan(Request $request)
    {
        $user = $request->user();
        // protéger l’accès pour owner uniquement si tu veux
        // if ($user->role !== 'owner') abort(403);

        $activePayment = PaymeePayment::where('user_id', $user->id)
            ->where('status', 'pending')
            ->latest()
            ->first();

        return Inertia::render('paymee/plan', [
            'isPremium'   => $user->mode_compte === 'premium',
            'planPrice'   => 19.99, // exemple
            'paymentUrl'  => $activePayment ? config('services.paymee.gateway_base', 'https://sandbox.paymee.tn/gateway/').$activePayment->token : null,
        ]);
    }

    // Lance un paiement Paymee
    public function createPayment(Request $request)
    {
        $user = $request->user();

        if ($user->mode_compte === 'premium') {
            return back()->with('success', 'Vous êtes déjà en Premium.');
        }

        $amount = 19.99; // prix de ton premium
        $apiKey = config('services.paymee.api_key');
        $baseUrl = config('services.paymee.base_url');
        $webhookUrl = route('paymee.webhook');
        $orderId = 'premium-'.$user->id.'-'.time();

        $response = Http::withHeaders([
            'Content-Type'  => 'application/json',
            'Authorization' => 'Token '.$apiKey,
        ])->post($baseUrl.'/payments/create', [
            'amount'      => $amount,
            'note'        => "Premium upgrade for user #{$user->id}",
            'first_name'  => $user->name ?? 'Owner',
            'last_name'   => 'Owner',
            'email'       => $user->email,
            'phone'       => $user->phone ?? '',
            'return_url'  => route('plan'),
            'cancel_url'  => route('plan'),
            'webhook_url' => $webhookUrl,
            'order_id'    => $orderId,
        ]);
        Log::info('Paymee response', [
    'status_code' => $response->status(),
    'body' => $response->body(),
]);

        if (!$response->ok() || !$response->json('status')) {
            Log::error('Paymee create failed', ['body' => $response->body()]);
            return back()->withErrors([
                'payment' => 'Unable to initiate payment, please try again.',
            ]);
            
        }

        $data = $response->json('data');

        PaymeePayment::create([
            'user_id'  => $user->id,
            'token'    => $data['token'],
            'order_id' => $data['order_id'] ?? $orderId,
            'amount'   => $amount,
            'status'   => 'pending',
        ]);

        // On renvoie vers la page plan, qui affichera l’iframe
        return redirect()->route('plan')
            ->with('payment_token', $data['token']);
    }

    // Webhook Paymee : met à jour le user (premium) si paiement OK
    public function webhook(Request $request)
    {
        Log::info('Paymee webhook', $request->all());

        $token         = $request->input('token');
        $paymentStatus = (bool) $request->input('payment_status');
        $checkSum      = $request->input('check_sum');
        $apiKey        = config('services.paymee.api_key');

        $expected = md5($token.($paymentStatus ? '1' : '0').$apiKey);
        if ($checkSum !== $expected) {
            Log::warning('Paymee webhook invalid checksum', [
                'expected' => $expected,
                'got'      => $checkSum,
            ]);
            return response()->json(['error' => 'invalid_checksum'], 400);
        }

        $payment = PaymeePayment::where('token', $token)->first();
        if (!$payment) {
            return response()->json(['error' => 'payment_not_found'], 404);
        }

        $payment->status = $paymentStatus ? 'paid' : 'failed';
        $payment->transaction_id  = $request->input('transaction_id');
        $payment->received_amount = $request->input('received_amount');
        $payment->cost            = $request->input('cost');
        $payment->save();

        if ($paymentStatus) {
            $user = $payment->user;
            $user->mode_compte = 'premium'; // adapte à ton modèle
            $user->is_premium  = true;      // si tu as ce champ
            $user->save();
        }

        return response()->json(['status' => 'ok']);
    }
}