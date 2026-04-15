<?php

namespace App\Http\Controllers;

use App\Mail\ParkingInfractionAlert;
use App\Models\Parking;
use App\Models\Reservation;
use App\Models\Vehicle;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Cache;
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
            ->whereNull('deleted_at')
            ->get();

        $reservations = $rawReservations
            ->filter(function (Reservation $reservation) use ($now) {
                if (in_array($reservation->status, ['cancelled_auto', 'cancelled_user'])) {
                    return false;
                }
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

        if ($parking->status !== 'active')    return back()->withErrors(['reservation' => 'Ce parking n\'est plus actif.']);
        if ($parking->available_spots <= 0)   return back()->withErrors(['reservation' => 'Aucune place disponible.']);
        if (!$this->isParkingOpenNow($parking)) return back()->withErrors(['reservation' => 'Ce parking est actuellement fermé.']);

        $hasActive = Reservation::where('vehicle_id', $validated['vehicle_id'])
            ->whereIn('status', ['pending', 'active'])
            ->exists();

        if ($hasActive) {
            return back()->withErrors(['vehicle_id' => 'Ce véhicule a déjà une réservation en cours.']);
        }

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

        return redirect()
            ->route('parkings.reservations.create', $parking)
            ->with('success', 'Réservation créée avec succès.');
    }

    // ══════════════════════════════════════════════════════════════════════════
    // POST /reservations/{reservation}/cancel
    // ══════════════════════════════════════════════════════════════════════════

    public function cancel(Reservation $reservation)
    {
        $user = auth()->user();
        if ($reservation->user_id !== $user->id) abort(403);

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


      public function hide(Reservation $reservation)
{
    $user = auth()->user();

    // Vérifier que l'utilisateur possède cette réservation
    if ($reservation->user_id !== $user->id) {
        abort(403, 'Vous ne pouvez pas masquer cette réservation.');
    }

    // ✅ Masquer uniquement les tickets "paid"
    if ($reservation->status !== 'paid') {
        return back()->withErrors([
            'reservation' => 'Seuls les tickets payés peuvent être masqués.'
        ]);
    }

    // Soft delete (masquer)
    $reservation->delete();

    return back()->with('success', 'Ticket masqué avec succès.');
}

    // ══════════════════════════════════════════════════════════════════════════
    // 🚗 POST /api/parking/entrance
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
            return response()->json(['status' => 'unknown', 'plate' => $plateNumber, 'message' => "Plaque '{$plateNumber}' non enregistrée."]);
        }

        $active = Reservation::where('vehicle_id', $vehicle->id)
            ->where('status', 'active')
            ->when($parkingId, fn($q) => $q->where('parking_id', $parkingId))
            ->first();

        if ($active) {
            return response()->json(['status' => 'already_inside', 'plate' => $plateNumber, 'message' => 'Véhicule déjà dans le parking.']);
        }

        $pending = Reservation::where('vehicle_id', $vehicle->id)
            ->where('status', 'pending')
            ->when($parkingId, fn($q) => $q->where('parking_id', $parkingId))
            ->latest('reserved_at')
            ->first();

        if (!$pending) {
            return response()->json(['status' => 'no_reservation', 'plate' => $plateNumber, 'message' => "Aucune réservation pour '{$plateNumber}'."]);
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
    // ══════════════════════════════════════════════════════════════════════════

    public function handleExitWebhook(Request $request)
    {
        $plateNumber = trim($request->input('plate_number', ''));
        $parkingId   = $request->input('parking_id');

        if (!$plateNumber) {
            return response()->json(['status' => 'error', 'message' => 'Aucune plaque fournie.'], 400);
        }

        Log::info("🚪 [SORTIE] Plaque : {$plateNumber} — parking #{$parkingId}");

        $vehicle = Vehicle::where(function ($q) use ($plateNumber) {
            $normalized = strtoupper(str_replace(['-', ' '], '', $plateNumber));
            $q->whereRaw("UPPER(REPLACE(REPLACE(license_plate, '-', ''), ' ', '')) = ?", [$normalized])
              ->orWhere('license_plate', 'ILIKE', $plateNumber);
        })->first();

        if (!$vehicle) {
            return response()->json(['status' => 'unknown', 'plate' => $plateNumber, 'message' => "Plaque '{$plateNumber}' non reconnue."]);
        }

        // Déjà en awaiting_payment → rappel
        $awaiting = Reservation::where('vehicle_id', $vehicle->id)
            ->where('status', 'awaiting_payment')
            ->when($parkingId, fn($q) => $q->where('parking_id', $parkingId))
            ->latest('actual_exit_at')
            ->first();

        if ($awaiting) {
            return response()->json([
                'status'           => 'awaiting_payment',
                'plate'            => $plateNumber,
                'reservation_id'   => $awaiting->id,
                'total_price'      => (float) $awaiting->total_price,
                'duration_minutes' => $awaiting->duration_minutes,
                'message'          => "Paiement en attente : {$awaiting->total_price} TND.",
            ]);
        }

        // Réservation active → awaiting_payment
        $active = Reservation::where('vehicle_id', $vehicle->id)
            ->where('status', 'active')
            ->when($parkingId, fn($q) => $q->where('parking_id', $parkingId))
            ->latest('actual_entry_at')
            ->first();

        if (!$active) {
            return response()->json(['status' => 'unknown', 'plate' => $plateNumber, 'message' => "Aucun séjour actif pour '{$plateNumber}'."]);
        }

        $now        = now();
        $entryTime  = $active->actual_entry_at ?? $active->start_time ?? $now;
        $minutes    = (int) $entryTime->diffInMinutes($now);
        $hours      = ceil($minutes / 60);
        $priceHour  = (float) ($active->parking->price_per_hour ?? 0);
        $totalPrice = round($hours * $priceHour, 2);

        $active->update([
            'status'           => 'awaiting_payment',
            'actual_exit_at'   => $now,
            'exit_plate'       => $plateNumber,
            'end_time'         => $now,
            'duration_minutes' => $minutes,
            'total_price'      => $totalPrice,
        ]);

        Log::info("💳 [SORTIE] {$plateNumber} → awaiting_payment — {$minutes}min — {$totalPrice} TND");

        return response()->json([
            'status'           => 'awaiting_payment',
            'plate'            => $plateNumber,
            'reservation_id'   => $active->id,
            'total_price'      => $totalPrice,
            'duration_minutes' => $minutes,
            'exit_time'        => $now->toIso8601String(),
            'message'          => "Paiement requis : {$totalPrice} TND.",
        ]);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 💳 POST /api/parking/{parking}/reservations/{reservation}/pay
    // ══════════════════════════════════════════════════════════════════════════

    public function markAsPaid(Request $request, Parking $parking, Reservation $reservation)
    {
        if ($reservation->parking_id !== $parking->id) {
            return response()->json(['success' => false, 'message' => 'Réservation introuvable.'], 404);
        }

        if ($reservation->status !== 'awaiting_payment') {
            return response()->json(['success' => false, 'message' => "Statut inattendu : {$reservation->status}"], 422);
        }

        $now = now();
        $reservation->update(['status' => 'paid', 'paid_at' => $now]);

        if ($parking->available_spots < $parking->total_spots) {
            $parking->increment('available_spots');
        }

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
    // Webhook Flask (premium_parking.py) — véhicule mal garé / trop longtemps
    //
    // Payload attendu :
    //   parking_id          int    — ID du parking
    //   slot_number         int    — numéro du slot (1-based)
    //   duration_minutes    float  — durée occupation continue (minutes)
    //   description         string — texte descriptif IA
    //   detected_at         string — date/heure détection
    //   vehicle_description ?string
    //   photo_url           ?string
    //
    // Comportement :
    //   - Throttle : 1 email / 30 min / (parking + slot) via Cache
    //   - Trouve le propriétaire → envoie ParkingInfractionAlert par email
    //   - Retourne status: sent | throttled | ignored | error
    // ══════════════════════════════════════════════════════════════════════════

    public function handleAlertWebhook(Request $request)
    {
        $parkingId          = (int)   $request->input('parking_id');
        $slotNumber         = (int)   $request->input('slot_number', 0);
        $durationMinutes    = (float) $request->input('duration_minutes', 0);
        $description        = $request->input('description', 'Infraction détectée');
        $photoUrl           = $request->input('photo_url');
        $vehicleDescription = $request->input('vehicle_description');

        if (!$parkingId) {
            return response()->json(['status' => 'error', 'message' => 'parking_id requis.'], 400);
        }

        Log::warning("🚨 [ALERTE] Parking #{$parkingId} · Slot #{$slotNumber} · {$durationMinutes}min");

        // ── 1. Charger le parking + propriétaire ──────────────────────────────
        $parking = Parking::with('owner')->find($parkingId);

        if (!$parking || !$parking->owner) {
            Log::warning("⚠️ [ALERTE] Parking #{$parkingId} introuvable ou sans propriétaire");
            return response()->json(['status' => 'ignored', 'message' => 'Parking ou propriétaire introuvable.'], 200);
        }

        $owner = $parking->owner;

        // ── 2. Throttle anti-spam ─────────────────────────────────────────────
        // 1 seul email toutes les 30 minutes par combinaison (parking + slot)
        $throttleKey     = "infraction_alert_{$parkingId}_slot{$slotNumber}";
        $throttleMinutes = 30;

        if (Cache::has($throttleKey)) {
            $remaining = Cache::get("{$throttleKey}_ttl", $throttleMinutes);
            Log::info("⏳ [ALERTE] Throttled — slot #{$slotNumber} — prochain email dans ~{$remaining} min");
            return response()->json([
                'status'  => 'throttled',
                'message' => "Email déjà envoyé récemment pour slot #{$slotNumber}. Prochain dans ~{$remaining} min.",
            ], 200);
        }

        // Activer le throttle
        Cache::put($throttleKey,          true,              now()->addMinutes($throttleMinutes));
        Cache::put("{$throttleKey}_ttl",  $throttleMinutes,  now()->addMinutes($throttleMinutes));

        // ── 3. Envoyer l'email ────────────────────────────────────────────────
        $detectedAt = $request->input('detected_at', now()->format('d/m/Y à H:i:s'));

        try {
            Mail::to($owner->email)->send(new ParkingInfractionAlert(
                parkingName:        $parking->name,
                parkingCity:        $parking->city ?? 'N/A',
                parkingId:          $parkingId,
                slotNumber:         $slotNumber,
                durationMinutes:    $durationMinutes,
                detectedAt:         $detectedAt,
                ownerName:          $owner->name,
                photoUrl:           $photoUrl,
                vehicleDescription: $vehicleDescription,
            ));

            Log::info("✅ [ALERTE] Email envoyé → {$owner->email} | Parking #{$parkingId} Slot #{$slotNumber}");

            return response()->json([
                'status'  => 'sent',
                'message' => "Alerte envoyée à {$owner->email}",
                'details' => [
                    'parking_id'       => $parkingId,
                    'slot_number'      => $slotNumber,
                    'duration_minutes' => $durationMinutes,
                    'owner_email'      => $owner->email,
                    'detected_at'      => $detectedAt,
                    'throttle_minutes' => $throttleMinutes,
                ],
            ], 200);

        } catch (\Exception $e) {
            Log::error("❌ [ALERTE] Échec email : " . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Alerte reçue mais email non envoyé : ' . $e->getMessage(),
            ], 500);
        }
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