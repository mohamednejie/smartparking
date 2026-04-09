<?php

namespace App\Http\Controllers;

use App\Models\Parking;
use App\Models\Reservation;
use App\Models\Vehicle;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class ReservationController extends Controller
{
    // ══════════════════════════════════════════════════════════════════════════
    // GET /reservations
    // ══════════════════════════════════════════════════════════════════════════

    public function index()
    {
        $user = auth()->user();
        $now  = now();

        $rawReservations = $user->reservations()
            ->with(['parking', 'vehicle'])
            ->orderByDesc('reserved_at')
            ->get();

        $reservations = $rawReservations
            ->filter(function (Reservation $reservation) use ($now) {
                // Masquer les annulations
                if (in_array($reservation->status, ['cancelled_auto', 'cancelled_user'])) {
                    return false;
                }

                // Auto-cancel les pending expirés
                if (
                    $reservation->status === 'pending' &&
                    $reservation->parking &&
                    $reservation->parking->cancel_time_limit
                ) {
                    $refTime  = $reservation->reserved_at ?? $reservation->created_at;
                    $deadline = $refTime->copy()->addMinutes($reservation->parking->cancel_time_limit);

                    if ($now->greaterThanOrEqualTo($deadline)) {
                        $reservation->status = 'cancelled_auto';
                        $reservation->save();

                        $parking = $reservation->parking;
                        if ($parking && $parking->available_spots < $parking->total_spots) {
                            $parking->increment('available_spots');
                        }
                        return false;
                    }
                }
                return true;
            })
            ->map(function (Reservation $reservation) use ($now) {
                $remainingSeconds = null;

                if (
                    $reservation->status === 'pending' &&
                    $reservation->parking &&
                    $reservation->parking->cancel_time_limit
                ) {
                    $refTime  = $reservation->reserved_at ?? $reservation->created_at;
                    $deadline = $refTime->copy()->addMinutes($reservation->parking->cancel_time_limit);
                    $diff     = $now->diffInSeconds($deadline, false);
                    $remainingSeconds = $diff > 0 ? $diff : 0;
                }

                $refTime = $reservation->reserved_at ?? $reservation->created_at;

                return [
                    'id'                => $reservation->id,
                    'status'            => $reservation->status,
                    'reserved_at'       => $refTime->toIso8601String(),
                    'remaining_seconds' => $remainingSeconds,

                    // ✅ Champs pour le paiement côté driver
                    'parking_id'        => $reservation->parking_id,
                    'total_price'       => (float)($reservation->total_price ?? 0),
                    'duration_minutes'  => $reservation->duration_minutes,
                    'exit_plate'        => $reservation->exit_plate,
                    'actual_exit_at'    => $reservation->actual_exit_at?->toIso8601String(),
                    'paid_at'           => $reservation->paid_at?->toIso8601String(),

                    'parking' => [
                        'name'              => $reservation->parking?->name,
                        'address_label'     => $reservation->parking?->address_label,
                        'cancel_time_limit' => $reservation->parking?->cancel_time_limit,
                    ],
                    'vehicle' => [
                        'license_plate' => $reservation->vehicle?->license_plate,
                        'brand'         => $reservation->vehicle?->brand,
                        'model'         => $reservation->vehicle?->model,
                    ],
                ];
            })
            ->values();

        return Inertia::render('Reservations/Index', [
            'reservations' => $reservations,
        ]);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // GET /parkings/{parking}/reserve
    // ══════════════════════════════════════════════════════════════════════════

    public function create(Parking $parking)
    {
        $user = auth()->user();

        if ($user->role !== 'driver') {
            abort(403, 'Seuls les drivers peuvent réserver un parking.');
        }

        $vehicles = $user->vehicles()
            ->select('id', 'license_plate', 'brand', 'model', 'is_primary')
            ->orderByDesc('is_primary')
            ->get();

        $isActive    = $parking->status === 'active';
        $hasSpots    = $parking->available_spots > 0;
        $isOpenNow   = $this->isParkingOpenNow($parking);
        $hasVehicles = $vehicles->isNotEmpty();
        $canBook     = $isActive && $hasSpots && $isOpenNow && $hasVehicles;

        $notBookableReason = null;
        if (!$isActive)        $notBookableReason = 'Ce parking n\'est pas actif.';
        elseif (!$hasSpots)    $notBookableReason = 'Aucune place disponible.';
        elseif (!$isOpenNow)   $notBookableReason = 'Ce parking est actuellement fermé.';
        elseif (!$hasVehicles) $notBookableReason = 'Vous devez d\'abord ajouter un véhicule.';

        return Inertia::render('parking/reserve', [
            'parking'  => [
                'id'                => $parking->id,
                'name'              => $parking->name,
                'address_label'     => $parking->address_label,
                'price_per_hour'    => $parking->price_per_hour,
                'available_spots'   => $parking->available_spots,
                'cancel_time_limit' => $parking->cancel_time_limit,
                'photo_url'         => $parking->photo_url,
            ],
            'vehicles'          => $vehicles,
            'canBook'           => $canBook,
            'notBookableReason' => $notBookableReason,
        ]);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // POST /parkings/{parking}/reserve
    // ══════════════════════════════════════════════════════════════════════════

    public function store(Request $request, Parking $parking)
{
    $user = auth()->user();

    if ($user->role !== 'driver') {
        abort(403, 'Seuls les drivers peuvent réserver un parking.');
    }

    $validated = $request->validate([
        'vehicle_id' => [
            'required',
            Rule::exists('vehicles', 'id')->where(fn($q) => $q->where('user_id', $user->id)),
        ],
    ]);

    // Vérifications métier
    if ($parking->status !== 'active') {
        return back()->withErrors(['reservation' => 'Ce parking n\'est plus actif.']);
    }
    if ($parking->available_spots <= 0) {
        return back()->withErrors(['reservation' => 'Aucune place disponible.']);
    }
    if (!$this->isParkingOpenNow($parking)) {
        return back()->withErrors(['reservation' => 'Ce parking est actuellement fermé.']);
    }

    // ✅ CORRECTION : Vérifier TOUS les statuts bloquants
    $blockingStatuses = ['pending', 'active', 'awaiting_payment', 'completed'];
    
    $existingReservation = Reservation::where('vehicle_id', $validated['vehicle_id'])
        ->whereIn('status', $blockingStatuses)
        ->first();

    if ($existingReservation) {
        $statusMessages = [
            'pending' => 'Ce véhicule a déjà une réservation en attente.',
            'active' => 'Ce véhicule est actuellement dans un parking.',
            'awaiting_payment' => 'Ce véhicule doit d\'abord payer sa session en cours.',
            'completed' => 'Ce véhicule a une session à finaliser.',
        ];
        
        $message = $statusMessages[$existingReservation->status] ?? 'Ce véhicule a déjà une réservation en cours.';
        
        return back()->withErrors([
            'vehicle_id' => $message . ' Veuillez la finaliser avant de réserver à nouveau.'
        ]);
    }

    // ✅ Transaction atomique
    DB::transaction(function () use ($user, $parking, $validated) {
        Reservation::create([
            'user_id'     => $user->id,
            'parking_id'  => $parking->id,
            'vehicle_id'  => $validated['vehicle_id'],
            'status'      => 'pending',
            'reserved_at' => now(),
        ]);

        if ($parking->available_spots > 0) {
            $parking->decrement('available_spots');
        }
    });

    return redirect()
        ->route('reservations.index')
        ->with('success', 'Réservation créée avec succès.');
}
    // ══════════════════════════════════════════════════════════════════════════
    // POST /reservations/{reservation}/cancel
    // ══════════════════════════════════════════════════════════════════════════

    public function cancel(Reservation $reservation)
    {
        $user = auth()->user();

        if ($reservation->user_id !== $user->id) {
            abort(403, 'Vous ne pouvez pas annuler cette réservation.');
        }

        $reservation->load('parking');

        if (in_array($reservation->status, ['cancelled_auto', 'cancelled_user', 'completed', 'paid'])) {
            return back()->withErrors(['reservation' => 'Cette réservation ne peut plus être annulée.']);
        }

        if ($reservation->status === 'active') {
            return back()->withErrors(['reservation' => 'Le véhicule est déjà dans le parking.']);
        }

        $parking = $reservation->parking;

        if (!$parking || !$parking->cancel_time_limit) {
            return back()->withErrors(['reservation' => 'Annulation impossible.']);
        }

        $refTime  = $reservation->reserved_at ?? $reservation->created_at;
        $deadline = $refTime->copy()->addMinutes($parking->cancel_time_limit);

        if (now()->greaterThanOrEqualTo($deadline)) {
            $reservation->status = 'cancelled_auto';
            $reservation->save();
            if ($parking->available_spots < $parking->total_spots) {
                $parking->increment('available_spots');
            }
            return back()->withErrors(['reservation' => 'Délai dépassé. La réservation a expiré.']);
        }

        $reservation->status = 'cancelled_user';
        $reservation->save();

        if ($parking->available_spots < $parking->total_spots) {
            $parking->increment('available_spots');
        }

        return back()->with('success', 'Réservation annulée avec succès.');
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 🚗 POST /api/parking/entrance
    // Webhook Flask — caméra ENTRÉE
    //
    //   1. Plaque inconnue           → "unknown"
    //   2. Pas de réservation pending → "no_reservation"
    //   3. Déjà actif                → "already_inside"
    //   4. Réservation pending       → "authorized" (pending → active)
    // ══════════════════════════════════════════════════════════════════════════

    public function handleEntranceWebhook(Request $request)
    {
        $plateNumber = trim($request->input('plate_number', ''));
        $parkingId   = $request->input('parking_id');

        if (!$plateNumber) {
            return response()->json(['status' => 'error', 'message' => 'Aucune plaque fournie.'], 400);
        }

        Log::info("🚗 [ENTRÉE] Plaque : {$plateNumber} — parking #{$parkingId}");

        $vehicle = Vehicle::where(function ($q) use ($plateNumber) {
            $normalized = strtoupper(str_replace(['-', ' '], '', $plateNumber));
            $q->whereRaw("UPPER(REPLACE(REPLACE(license_plate, '-', ''), ' ', '')) = ?", [$normalized])
              ->orWhere('license_plate', 'ILIKE', $plateNumber);
        })->first();

        if (!$vehicle) {
            return response()->json(['status' => 'unknown', 'plate' => $plateNumber,
                'message' => "Plaque '{$plateNumber}' non enregistrée."]);
        }

        // Déjà à l'intérieur ?
        $active = Reservation::where('vehicle_id', $vehicle->id)
            ->where('status', 'active')
            ->when($parkingId, fn($q) => $q->where('parking_id', $parkingId))
            ->first();

        if ($active) {
            return response()->json(['status' => 'already_inside', 'plate' => $plateNumber,
                'message' => 'Véhicule déjà dans le parking.']);
        }

        // Réservation pending ?
        $pending = Reservation::where('vehicle_id', $vehicle->id)
            ->where('status', 'pending')
            ->when($parkingId, fn($q) => $q->where('parking_id', $parkingId))
            ->latest('reserved_at')
            ->first();

        if (!$pending) {
            return response()->json(['status' => 'no_reservation', 'plate' => $plateNumber,
                'message' => "Aucune réservation pour '{$plateNumber}'."]);
        }

        $now = now();
        $pending->update([
            'status'          => 'active',
            'actual_entry_at' => $now,
            'entry_plate'     => $plateNumber,
            'start_time'      => $now,
        ]);

        Log::info("✅ [ENTRÉE] Autorisé — {$plateNumber} → réservation #{$pending->id}");

        return response()->json([
            'status'         => 'authorized',
            'plate'          => $plateNumber,
            'reservation_id' => $pending->id,
            'entry_time'     => $now->toIso8601String(),
        ]);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 🚪 POST /api/parking/exit
    // Webhook Flask — caméra SORTIE (SIMPLIFIÉ)
    //
    // ✅ Logique directe — PAS de statut "exiting" intermédiaire :
    //   1. Plaque inconnue                → "unknown"
    //   2. Déjà en awaiting_payment       → "awaiting_payment" (rappel)
    //   3. Réservation active trouvée     → DIRECTEMENT "awaiting_payment"
    //      calcul durée + prix → driver voit le bouton "Payer" dans /reservations
    //   4. Aucun séjour actif             → "unknown"
    // ══════════════════════════════════════════════════════════════════════════

    public function handleExitWebhook(Request $request)
{
    $plateNumber = trim($request->input('plate_number', ''));
    $parkingId   = $request->input('parking_id');

    if (!$plateNumber) {
        return response()->json(['status' => 'error', 'message' => 'Aucune plaque fournie.'], 400);
    }

    Log::info("🚪 [SORTIE] Plaque : {$plateNumber} — parking #{$parkingId}");

    // Recherche véhicule
    $vehicle = Vehicle::where(function ($q) use ($plateNumber) {
        $normalized = strtoupper(str_replace(['-', ' '], '', $plateNumber));
        $q->whereRaw("UPPER(REPLACE(REPLACE(license_plate, '-', ''), ' ', '')) = ?", [$normalized])
          ->orWhere('license_plate', 'ILIKE', $plateNumber);
    })->first();

    if (!$vehicle) {
        Log::info("❌ [SORTIE] Inconnu : {$plateNumber}");
        return response()->json([
            'status'  => 'unknown',
            'plate'   => $plateNumber,
            'message' => "Plaque '{$plateNumber}' non reconnue.",
        ]);
    }

    // Déjà en awaiting_payment ?
    $awaiting = Reservation::where('vehicle_id', $vehicle->id)
        ->where('status', 'awaiting_payment')
        ->when($parkingId, fn($q) => $q->where('parking_id', $parkingId))
        ->latest('actual_exit_at')
        ->first();

    if ($awaiting) {
        Log::info("⏳ [SORTIE] Déjà awaiting_payment : {$plateNumber} — {$awaiting->total_price} TND");
        return response()->json([
            'status'           => 'awaiting_payment',
            'plate'            => $plateNumber,
            'reservation_id'   => $awaiting->id,
            'total_price'      => (float) $awaiting->total_price,
            'duration_minutes' => $awaiting->duration_minutes,
            'message'          => "Paiement en attente : {$awaiting->total_price} TND.",
        ]);
    }

    // Réservation active
    $active = Reservation::where('vehicle_id', $vehicle->id)
        ->where('status', 'active')
        ->when($parkingId, fn($q) => $q->where('parking_id', $parkingId))
        ->with('parking') // ✅ Charger relation parking
        ->latest('actual_entry_at')
        ->first();

    if (!$active) {
        Log::info("⚠️ [SORTIE] Aucun séjour actif : {$plateNumber}");
        return response()->json([
            'status'  => 'unknown',
            'plate'   => $plateNumber,
            'message' => "Aucun séjour actif pour '{$plateNumber}'.",
        ]);
    }

    // ✅ CALCUL CORRIGÉ DU PRIX
    $now        = now();
    $entryTime  = $active->actual_entry_at ?? $active->start_time ?? $now;
    $minutes    = max(1, (int) $entryTime->diffInMinutes($now)); // Minimum 1 minute
    
    $pricePerHour   = (float) ($active->parking->price_per_hour ?? 0);
    $pricePerMinute = $pricePerHour / 60; // ✅ Prix par minute
    
    $totalPrice = round($pricePerMinute * $minutes, 2);

    // ✅ Mise à jour réservation
    $active->update([
        'status'           => 'awaiting_payment',
        'actual_exit_at'   => $now,
        'exit_plate'       => $plateNumber,
        'end_time'         => $now,
        'duration_minutes' => $minutes,
        'total_price'      => $totalPrice,
    ]);

    Log::info("💳 [SORTIE] {$plateNumber} → awaiting_payment — {$minutes}min — {$totalPrice} TND (@ {$pricePerHour} TND/h)");

    return response()->json([
        'status'           => 'awaiting_payment',
        'plate'            => $plateNumber,
        'reservation_id'   => $active->id,
        'total_price'      => $totalPrice,
        'duration_minutes' => $minutes,
        'price_per_hour'   => $pricePerHour,
        'exit_time'        => $now->toIso8601String(),
        'message'          => "Paiement requis : {$totalPrice} TND pour {$minutes} minutes.",
    ]);
}

    // ══════════════════════════════════════════════════════════════════════════
    // 💳 POST /api/parking/{parking}/reservations/{reservation}/pay
    // Driver ou propriétaire → paid + libère place + ouvre barrière
    // ══════════════════════════════════════════════════════════════════════════

    public function markAsPaid(Request $request, Parking $parking, Reservation $reservation)
    {
        if ($reservation->parking_id !== $parking->id) {
            return response()->json(['success' => false, 'message' => 'Réservation introuvable.'], 404);
        }

        if ($reservation->status !== 'awaiting_payment') {
            return response()->json([
                'success' => false,
                'message' => "Statut inattendu : {$reservation->status}",
            ], 422);
        }

        $now = now();

        $reservation->update([
            'status'  => 'paid',
            'paid_at' => $now,
        ]);

        // ✅ Libérer la place après paiement
        if ($parking->available_spots < $parking->total_spots) {
            $parking->increment('available_spots');
        }

        // ✅ Ouvrir la barrière Flask
        $plate    = $reservation->exit_plate ?? $reservation->vehicle?->license_plate ?? '';
        $flaskUrl = config('services.flask.url', 'http://127.0.0.1:5000');

        try {
            \Illuminate\Support\Facades\Http::timeout(3)->post(
                "{$flaskUrl}/api/parking/{$parking->id}/open_barrier",
                ['plate' => $plate, 'reason' => 'payment_confirmed']
            );
            Log::info("🔓 [PAY] Barrière ouverte — {$plate} — réservation #{$reservation->id}");
        } catch (\Exception $e) {
            Log::warning("⚠️ [PAY] Flask injoignable : " . $e->getMessage());
        }

        Log::info("✅ [PAY] Payé — {$plate} — {$reservation->total_price} TND — #{$reservation->id}");

        return response()->json([
            'success'          => true,
            'message'          => "Paiement enregistré. Barrière ouverte.",
            'plate'            => $plate,
            'total_price'      => (float) $reservation->total_price,
            'duration_minutes' => $reservation->duration_minutes,
            'paid_at'          => $now->toIso8601String(),
        ]);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 🚨 POST /api/parking/alert
    // ══════════════════════════════════════════════════════════════════════════

    public function handleAlertWebhook(Request $request)
    {
        $parkingId   = $request->input('parking_id');
        $description = $request->input('description', 'Infraction détectée');
        $photo       = $request->input('photo');

        Log::warning("🚨 [ALERTE] Parking #{$parkingId} — {$description}");

        return response()->json(['status' => 'received', 'message' => 'Alerte enregistrée.']);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // HELPERS
    // ══════════════════════════════════════════════════════════════════════════

    protected function isParkingOpenNow(Parking $parking): bool
    {
        if ($parking->is_24h) return true;
        if (!$parking->opening_time || !$parking->closing_time) return false;

        $nowTime = now()->format('H:i');
        return $nowTime >= $parking->opening_time && $nowTime < $parking->closing_time;
    }
}