<?php
// app/Http/Controllers/ParkingController.php

namespace App\Http\Controllers;

use App\Models\Parking;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class ParkingController extends Controller
{
    /**
     * GET /parkings — Liste
     */
    public function index()
    {
        /** @var User $user */
        $user = auth()->user();

        $parkings = $user->parkings()
            ->orderByDesc('created_at')
            ->get()
            ->map(fn($p) => [
                ...$p->toArray(),
                'photo_url'          => $p->photo_url,
                'annotated_file_url' => $p->annotated_file_url,
            ]);

        return Inertia::render('parking/index', [
            'parkings'    => $parkings,
            'canAdd'      => $user->canAddParking(),
            'currentPlan' => $user->mode_compte,
            'isPremium'   => $user->isPremium(),
        ]);
    }

    /**
     * GET /parkings/create — Formulaire
     */
    public function create()
    {
        /** @var User $user */
        $user = auth()->user();

        if (!$user->canAddParking()) {
            return redirect()->route('parkings.index')
                ->with('warning', 'Upgrade to PREMIUM to add more parkings.');
        }

        return Inertia::render('parking/create');
    }

    /**
     * POST /parkings — Enregistrer
     */
    public function store(Request $request)
    {
        /** @var User $user */
        $user = auth()->user();

        if (!$user->canAddParking()) {
            throw ValidationException::withMessages([
                'limit' => 'Upgrade to PREMIUM to add more parkings.',
            ]);
        }

        $validated = $request->validate([
            'name'           => ['required', 'string', 'max:255'],
            'description'    => ['nullable', 'string', 'max:1000'],
            'latitude'       => ['required', 'numeric', 'between:-90,90'],
            'longitude'      => ['required', 'numeric', 'between:-180,180'],
            'address_label'  => ['nullable', 'string', 'max:500'],
            'total_spots'    => ['required', 'integer', 'min:1'],
            'price_per_hour' => ['required', 'numeric', 'min:0'],
            'opening_time'   => ['nullable', 'date_format:H:i'],
            'closing_time'   => ['nullable', 'date_format:H:i'],
            'is_24h'         => ['boolean'],
            'photo'          => ['required', 'image', 'max:4096'],
        ]);

        $photoPath = $request->file('photo')->store('parkings', 'public');

        $parking = $user->parkings()->create([
            'name'                => $validated['name'],
            'description'         => $validated['description'] ?? null,
            'latitude'            => $validated['latitude'],
            'longitude'           => $validated['longitude'],
            'address_label'       => $validated['address_label'] ?? null,
            'total_spots'         => $validated['total_spots'],
            'available_spots'     => $validated['total_spots'],
            'detected_cars'       => 0,
            'price_per_hour'      => $validated['price_per_hour'],
            'opening_time'        => $validated['opening_time'] ?? null,
            'closing_time'        => $validated['closing_time'] ?? null,
            'is_24h'              => $validated['is_24h'] ?? false,
            'photo_path'          => $photoPath,
            'annotated_file_path' => null,
            'status'              => 'active',
        ]);

        logger('✅ Parking créé :', $parking->toArray());

        return redirect()->route('parkings.index')
            ->with('success', 'Parking "' . $parking->name . '" created successfully!');
    }

    /**
     * GET /parkings/{parking} — Voir
     */
    public function show(Parking $parking)
    {
        if ($parking->user_id !== auth()->id()) {
            abort(403);
        }

        return Inertia::render('parking/show', [
            'parking' => [
                ...$parking->toArray(),
                'photo_url'          => $parking->photo_url,
                'annotated_file_url' => $parking->annotated_file_url,
            ],
            'isPremium' => auth()->user()->isPremium(),
        ]);
    }

    /**
     * GET /parkings/{parking}/edit — Formulaire édition
     */
    public function edit(Parking $parking)
    {
        if ($parking->user_id !== auth()->id()) {
            abort(403);
        }

        return Inertia::render('parking/edit', [
            'parking' => [
                ...$parking->toArray(),
                'photo_url'          => $parking->photo_url,
                'annotated_file_url' => $parking->annotated_file_url,
            ],
        ]);
    }

    /**
     * PUT /parkings/{parking} — Mettre à jour
     */
    public function update(Request $request, Parking $parking)
    {
        if ($parking->user_id !== auth()->id()) {
            abort(403);
        }

        $validated = $request->validate([
            'name'           => ['required', 'string', 'max:255'],
            'description'    => ['nullable', 'string', 'max:1000'],
            'latitude'       => ['required', 'numeric', 'between:-90,90'],
            'longitude'      => ['required', 'numeric', 'between:-180,180'],
            'address_label'  => ['nullable', 'string', 'max:500'],
            'total_spots'    => ['required', 'integer', 'min:1'],
            'price_per_hour' => ['required', 'numeric', 'min:0'],
            'opening_time'   => ['nullable', 'date_format:H:i'],
            'closing_time'   => ['nullable', 'date_format:H:i'],
            'is_24h'         => ['boolean'],
            'photo'          => ['nullable', 'image', 'max:4096'],
        ]);

        if ($request->hasFile('photo')) {
            if ($parking->photo_path) {
                Storage::disk('public')->delete($parking->photo_path);
            }
            if ($parking->annotated_file_path) {
                Storage::disk('public')->delete($parking->annotated_file_path);
            }
            $validated['photo_path'] = $request->file('photo')->store('parkings', 'public');
            $validated['annotated_file_path'] = null;
        }

        $spotsDiff = $validated['total_spots'] - $parking->total_spots;
        $newAvailable = max(0, $parking->available_spots + $spotsDiff);

        $parking->update([
            'name'                => $validated['name'],
            'description'         => $validated['description'] ?? null,
            'latitude'            => $validated['latitude'],
            'longitude'           => $validated['longitude'],
            'address_label'       => $validated['address_label'] ?? null,
            'total_spots'         => $validated['total_spots'],
            'available_spots'     => $newAvailable,
            'price_per_hour'      => $validated['price_per_hour'],
            'opening_time'        => $validated['opening_time'] ?? null,
            'closing_time'        => $validated['closing_time'] ?? null,
            'is_24h'              => $validated['is_24h'] ?? false,
            'photo_path'          => $validated['photo_path'] ?? $parking->photo_path,
            'annotated_file_path' => $validated['annotated_file_path'] ?? $parking->annotated_file_path,
        ]);

        logger('✏️ Parking mis à jour :', $parking->fresh()->toArray());

        return redirect()->route('parkings.index')
            ->with('success', 'Parking "' . $parking->name . '" updated successfully!');
    }

    /**
     * DELETE /parkings/{parking} — Supprimer
     */
    public function destroy(Parking $parking)
    {
        if ($parking->user_id !== auth()->id()) {
            abort(403);
        }

        $name = $parking->name;

        if ($parking->photo_path) {
            Storage::disk('public')->delete($parking->photo_path);
        }
        if ($parking->annotated_file_path) {
            Storage::disk('public')->delete($parking->annotated_file_path);
        }

        $parking->delete();

        logger('🗑️ Parking supprimé : ' . $name);

        return redirect()->route('parkings.index')
            ->with('success', 'Parking "' . $name . '" deleted successfully!');
    }

    /**
     * POST /parkings/{parking}/toggle-status — Activer/Désactiver
     */
    public function toggleStatus(Parking $parking)
    {
        if ($parking->user_id !== auth()->id()) {
            abort(403);
        }

        $newStatus = $parking->status === 'active' ? 'inactive' : 'active';
        $parking->update(['status' => $newStatus]);

        $message = $newStatus === 'active'
            ? 'Parking "' . $parking->name . '" is now active.'
            : 'Parking "' . $parking->name . '" is now inactive (maintenance mode).';

        logger("🔄 Parking status: {$parking->name} → {$newStatus}");

        return back()->with(
            $newStatus === 'active' ? 'success' : 'warning',
            $message
        );
    }
}