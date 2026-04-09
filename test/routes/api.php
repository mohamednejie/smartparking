<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ReservationController;
use App\Models\Parking;

// ════════════════════════════════════════════════════════════════════════════
// 🚗 ENTRANCE WEBHOOK
// Appelé par Flask (gate_mode = "entrance") quand une plaque est détectée.
//
// Logique :
//   - Plaque inconnue         → "unknown"        (accès refusé)
//   - Pas de réservation      → "no_reservation" (accès refusé, toast orange)
//   - Déjà à l'intérieur      → "already_inside" (toast info)
//   - Réservation pending     → "authorized"     (pending → active, enregistre entry)
//
// Body : { plate_number, parking_id, gate_mode }
// ════════════════════════════════════════════════════════════════════════════
Route::post('/parking/entrance', [ReservationController::class, 'handleEntranceWebhook']);

// ════════════════════════════════════════════════════════════════════════════
// 🚪 EXIT WEBHOOK
// Appelé par Flask (gate_mode = "exit") quand une plaque est détectée.
//
// Logique :
//   - Plaque inconnue         → "unknown"
//   - Déjà awaiting_payment   → "awaiting_payment" (barrière toujours fermée)
//   - Séjour actif trouvé     → "exiting"  (active → awaiting_payment, calcul prix)
//   - Pas de séjour actif     → "unknown"
//
// Body : { plate_number, parking_id, gate_mode }
// ════════════════════════════════════════════════════════════════════════════
Route::post('/parking/exit', [ReservationController::class, 'handleExitWebhook']);

// ════════════════════════════════════════════════════════════════════════════
// 🚨 ALERT WEBHOOK
// Appelé par Flask (premium_parking.py) sur infraction détectée.
//
// Body : { parking_id, slot_id?, photo?, description? }
// ════════════════════════════════════════════════════════════════════════════
Route::post('/parking/alert', [ReservationController::class, 'handleAlertWebhook']);

// ════════════════════════════════════════════════════════════════════════════
// 💳 MARQUER COMME PAYÉ
// Appelé par show.tsx (bouton "Payé") — route protégée par sanctum.
// awaiting_payment → paid + libère la place + ouvre la barrière Flask.
// ════════════════════════════════════════════════════════════════════════════
Route::post(
    '/parking/{parking}/reservations/{reservation}/pay',
    [ReservationController::class, 'markAsPaid']
)->middleware('auth:sanctum');

// ════════════════════════════════════════════════════════════════════════════
// 🔓 OPEN BARRIER (override manuel)
// Appelé par show.tsx ou Laravel après paiement.
// Proxye la requête vers Flask /api/parking/{id}/open_barrier.
// ════════════════════════════════════════════════════════════════════════════
Route::post('/parking/{parking}/open_barrier', function (Request $request, Parking $parking) {
    $validated = $request->validate([
        'plate'  => 'required|string|max:20',
        'reason' => 'sometimes|string|max:100',
    ]);

    $flaskUrl = config('services.flask.url', 'http://127.0.0.1:5000');

    try {
        $response = \Illuminate\Support\Facades\Http::timeout(5)->post(
            "{$flaskUrl}/api/parking/{$parking->id}/open_barrier",
            [
                'plate'  => $validated['plate'],
                'reason' => $validated['reason'] ?? 'manual_override',
            ]
        );

        if ($response->successful()) {
            \Illuminate\Support\Facades\Log::info('🔓 Barrière ouverte manuellement', [
                'parking_id' => $parking->id,
                'plate'      => $validated['plate'],
                'reason'     => $validated['reason'] ?? 'manual_override',
            ]);
            return response()->json(['success' => true, 'message' => 'Barrière ouverte.']);
        }

        return response()->json(['success' => false, 'message' => 'Flask n\'a pas pu ouvrir la barrière.'], 502);

    } catch (\Exception $e) {
        \Illuminate\Support\Facades\Log::error('Barrier open failed', [
            'parking_id' => $parking->id,
            'plate'      => $validated['plate'],
            'error'      => $e->getMessage(),
        ]);
        return response()->json([
            'success' => false,
            'message' => 'Serveur IA injoignable : ' . $e->getMessage(),
        ], 503);
    }
})->middleware('auth:sanctum');

// ════════════════════════════════════════════════════════════════════════════
// ⚙️ PARKING CONFIG (appelé par Flask zone_worker au démarrage)
// Retourne is_premium, has_slots, slots (coordonnées relatives).
// ════════════════════════════════════════════════════════════════════════════
Route::get('/parking/{parking}/config', function (Parking $parking) {
    $parking->loadMissing('owner');

    $isPremium = $parking->owner?->isPremium() ?? false;
    $hasSlots  = !empty($parking->parking_slots);
    $slots     = ($isPremium && $hasSlots) ? $parking->slots_for_flask : [];

    return response()->json([
        'id'          => $parking->id,
        'name'        => $parking->name,
        'total_spots' => $parking->total_spots,
        'is_premium'  => $isPremium,
        'has_slots'   => $hasSlots,
        'slots'       => $slots,
        'slots_count' => count($slots),
    ]);
});

// ════════════════════════════════════════════════════════════════════════════
// 👤 AUTH
// ════════════════════════════════════════════════════════════════════════════
Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');