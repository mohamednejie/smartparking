<?php

namespace App\Http\Controllers;

use App\Models\Parking;
use App\Models\Reservation;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class ReservationController extends Controller
{
    /**
     * Liste des réservations du driver connecté
     * + calcul du temps restant
     * + auto-annulation des pending expirées (et libération de place)
     */
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
                // Ne jamais afficher les annulées
                if (in_array($reservation->status, ['cancelled_auto', 'cancelled_user'])) {
                    return false;
                }

                // Auto-expiration des pending si délai dépassé
                if (
                    $reservation->status === 'pending' &&
                    $reservation->parking &&
                    $reservation->parking->cancel_time_limit
                ) {
                    $refTime = $reservation->reserved_at ?? $reservation->created_at;
                    $deadline = $refTime
                        ->copy()
                        ->addMinutes($reservation->parking->cancel_time_limit);

                    if ($now->greaterThanOrEqualTo($deadline)) {
                        // Marquer comme annulée automatiquement
                        $reservation->status = 'cancelled_auto';
                        $reservation->save();

                        // Libérer une place si possible
                        $parking = $reservation->parking;
                        if ($parking && $parking->available_spots < $parking->total_spots) {
                            $parking->increment('available_spots');
                        }

                        return false; // ne pas afficher
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
                    $refTime = $reservation->reserved_at ?? $reservation->created_at;
                    $deadline = $refTime
                        ->copy()
                        ->addMinutes($reservation->parking->cancel_time_limit);

                    // diff en secondes, négatif si déjà dépassé
                    $diff = $now->diffInSeconds($deadline, false);
                    $remainingSeconds = $diff > 0 ? $diff : 0;
                }

                $refTime = $reservation->reserved_at ?? $reservation->created_at;

                return [
                    'id'                => $reservation->id,
                    'status'            => $reservation->status,
                    'reserved_at'       => $refTime->toIso8601String(),
                    'remaining_seconds' => $remainingSeconds,
                    'parking'           => [
                        'name'              => $reservation->parking?->name,
                        'address_label'     => $reservation->parking?->address_label,
                        'cancel_time_limit' => $reservation->parking?->cancel_time_limit,
                    ],
                    'vehicle'           => [
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

    /**
     * Page de réservation pour un parking (choix du véhicule)
     */
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

        $canBook = $isActive && $hasSpots && $isOpenNow && $hasVehicles;

        $notBookableReason = null;
        if (!$isActive) {
            $notBookableReason = 'Ce parking n\'est pas actif pour la réservation.';
        } elseif (!$hasSpots) {
            $notBookableReason = 'Aucune place disponible dans ce parking.';
        } elseif (!$isOpenNow) {
            $notBookableReason = 'Ce parking est actuellement fermé.';
        } elseif (!$hasVehicles) {
            $notBookableReason = 'Vous devez d\'abord ajouter un véhicule à votre compte.';
        }

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

    /**
     * Création d'une réservation
     * → On réserve une place : available_spots--
     */
    public function store(Request $request, Parking $parking)
    {
        $user = auth()->user();

        if ($user->role !== 'driver') {
            abort(403, 'Seuls les drivers peuvent réserver un parking.');
        }

        $validated = $request->validate([
            'vehicle_id' => [
                'required',
                Rule::exists('vehicles', 'id')->where(fn ($q) =>
                    $q->where('user_id', $user->id)
                ),
            ],
        ]);

        // Vérifications parking (état / places / horaires)
        if ($parking->status !== 'active') {
            return back()->withErrors([
                'reservation' => 'Ce parking n\'est plus actif pour la réservation.',
            ]);
        }

        if ($parking->available_spots <= 0) {
            return back()->withErrors([
                'reservation' => 'Aucune place disponible dans ce parking.',
            ]);
        }

        if (!$this->isParkingOpenNow($parking)) {
            return back()->withErrors([
                'reservation' => 'Ce parking est actuellement fermé.',
            ]);
        }

        // Vérifier que ce véhicule n'a pas déjà une réservation en cours
        $hasActiveReservationWithVehicle = Reservation::where('vehicle_id', $validated['vehicle_id'])
            ->whereIn('status', ['pending', 'active'])
            ->exists();

        if ($hasActiveReservationWithVehicle) {
            return back()->withErrors([
                'vehicle_id' => 'Ce véhicule a déjà une réservation en cours.',
            ]);
        }

        // Création de la réservation (status pending)
        Reservation::create([
            'user_id'     => $user->id,
            'parking_id'  => $parking->id,
            'vehicle_id'  => $validated['vehicle_id'],
            'status'      => 'pending',
            'reserved_at' => now(),
        ]);

        // On considère que la place est réservée → on diminue available_spots
        if ($parking->available_spots > 0) {
            $parking->decrement('available_spots');
        }

        return redirect()
            ->route('parkings.reservations.create', $parking)
            ->with('success', 'Réservation créée avec succès.');
    }

    /**
     * Annuler manuellement une réservation
     * → Si la réservation tenait une place (pending), on libère la place : available_spots++
     */
    public function cancel(Reservation $reservation)
    {
        $user = auth()->user();

        if ($reservation->user_id !== $user->id) {
            abort(403, 'Vous ne pouvez pas annuler cette réservation.');
        }

        $reservation->load('parking');

        if (in_array($reservation->status, ['cancelled_auto', 'cancelled_user', 'completed'])) {
            return back()->withErrors([
                'reservation' => 'Cette réservation ne peut plus être annulée.',
            ]);
        }

        if ($reservation->status === 'active') {
            return back()->withErrors([
                'reservation' => 'Le véhicule est déjà entré dans le parking. Annulation impossible.',
            ]);
        }

        $parking = $reservation->parking;

        if (!$parking || !$parking->cancel_time_limit) {
            return back()->withErrors([
                'reservation' => 'Cette réservation ne peut pas être annulée automatiquement.',
            ]);
        }

        $refTime = $reservation->reserved_at ?? $reservation->created_at;
        $deadline = $refTime
            ->copy()
            ->addMinutes($parking->cancel_time_limit);

        // Délai dépassé → annulation auto + libération de place
        if (now()->greaterThanOrEqualTo($deadline)) {
            $reservation->status = 'cancelled_auto';
            $reservation->save();

            if ($parking->available_spots < $parking->total_spots) {
                $parking->increment('available_spots');
            }

            return back()->withErrors([
                'reservation' => 'Le délai d\'annulation est dépassé. La réservation a expiré.',
            ]);
        }

        // Annulation par l'utilisateur (pending)
        $reservation->status = 'cancelled_user';
        $reservation->save();

        // La réservation tenait une place (pending) → on la libère
        if ($parking->available_spots < $parking->total_spots) {
            $parking->increment('available_spots');
        }

        return back()->with('success', 'Réservation annulée avec succès.');
    }

    /**
     * Vérifie si le parking est ouvert maintenant
     */
    protected function isParkingOpenNow(Parking $parking): bool
    {
        if ($parking->is_24h) {
            return true;
        }

        if (!$parking->opening_time || !$parking->closing_time) {
            return false;
        }

        $nowTime = now()->format('H:i');

        if ($nowTime < $parking->opening_time || $nowTime >= $parking->closing_time) {
            return false;
        }

        return true;
    }
}