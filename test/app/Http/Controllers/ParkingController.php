<?php
// app/Http/Controllers/ParkingController.php

namespace App\Http\Controllers;

use App\Models\Parking;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;


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
            'city'           => ['nullable', 'string', 'max:255'],
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
            'city'                => $validated['city'] ,
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
        

        return Inertia::render('parking/show', [
            'parking' => [
                ...$parking->toArray(),
                'photo_url'          => $parking->photo_url,
                'annotated_file_url' => $parking->annotated_file_url,
            ],
            'isPremium' => auth()->user()->isPremium(),
            'isOwner'   => $parking->user_id === auth()->id(),

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
            'city'           => ['required', 'string', 'max:255'],
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
            'city'                => $validated['city'] ,
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
    


    public function available(Request $request): Response
{
    $query = Parking::where('status', 'active')
        ->with('owner:id,name,company_name');

    // ══════════════════════════════════════════════════════════════
    // 🔎 FILTRES DE RECHERCHE
    // ══════════════════════════════════════════════════════════════

    // Recherche par nom
    if ($request->filled('name')) {
        $searchTerm = $request->name;
        $query->where(function ($q) use ($searchTerm) {
            $q->where('name', 'ILIKE', '%' . $searchTerm . '%')
              ->orWhere('description', 'ILIKE', '%' . $searchTerm . '%');
        });
    }

    // Recherche par ville
    if ($request->filled('city')) {
        $city = $request->city;
        $query->where(function ($q) use ($city) {
            $q->where('city', 'ILIKE', '%' . $city . '%')
              ->orWhere('address_label', 'ILIKE', '%' . $city . '%');
        });
    }

    // Recherche par adresse
    if ($request->filled('address')) {
        $query->where('address_label', 'ILIKE', '%' . $request->address . '%');
    }

    // Recherche générale
    if ($request->filled('q')) {
        $searchTerm = $request->q;
        $query->where(function ($q) use ($searchTerm) {
            $q->where('name', 'ILIKE', '%' . $searchTerm . '%')
              ->orWhere('city', 'ILIKE', '%' . $searchTerm . '%')
              ->orWhere('address_label', 'ILIKE', '%' . $searchTerm . '%')
              ->orWhere('description', 'ILIKE', '%' . $searchTerm . '%');
        });
    }

    // ══════════════════════════════════════════════════════════════
    // 💰 FILTRES DE PRIX
    // ══════════════════════════════════════════════════════════════

    if ($request->filled('min_price')) {
        $query->where('price_per_hour', '>=', (float) $request->min_price);
    }

    if ($request->filled('max_price')) {
        $query->where('price_per_hour', '<=', (float) $request->max_price);
    }

    // ══════════════════════════════════════════════════════════════
    // 🚗 FILTRES DE DISPONIBILITÉ
    // ══════════════════════════════════════════════════════════════

    if ($request->filled('min_spots')) {
        $query->where('available_spots', '>=', (int) $request->min_spots);
    }

    if ($request->boolean('available_only')) {
        $query->where('available_spots', '>', 0);
    }

    if ($request->boolean('open_now')) {
        $now = now()->format('H:i:s');
        $query->where(function ($q) use ($now) {
            $q->where('is_24h', true)
              ->orWhere(function ($q2) use ($now) {
                  $q2->where('opening_time', '<=', $now)
                     ->where('closing_time', '>=', $now);
              });
        });
    }

    // ══════════════════════════════════════════════════════════════
    // 📍 FILTRE GÉOLOCALISATION
    // ══════════════════════════════════════════════════════════════

    $hasGeoSearch = $request->filled('latitude') && $request->filled('longitude');

    if ($hasGeoSearch) {
    $lat = (float) $request->latitude;
    $lng = (float) $request->longitude;
    $radius = (float) ($request->radius ?? 10);

    $haversine = "(6371 * acos(
        LEAST(1.0, GREATEST(-1.0,
            cos(radians(?)) *
            cos(radians(latitude)) *
            cos(radians(longitude) - radians(?)) +
            sin(radians(?)) *
            sin(radians(latitude))
        ))
    ))";

    $query->selectRaw("parkings.*, $haversine as distance", [$lat, $lng, $lat])
        ->whereNotNull('latitude')
        ->whereNotNull('longitude')
        ->whereRaw("$haversine <= ?", [$lat, $lng, $lat, $radius]); // <- Utiliser whereRaw au lieu de havingRaw
 }
    // ══════════════════════════════════════════════════════════════
    // 🔄 TRI
    // ══════════════════════════════════════════════════════════════

    $sortBy = $request->get('sort', $hasGeoSearch ? 'distance' : 'created_at');
    $sortOrder = $request->get('order', $sortBy === 'price_per_hour' ? 'asc' : ($sortBy === 'distance' ? 'asc' : 'desc'));

    $query = $this->applySorting($query, $sortBy, $sortOrder, $hasGeoSearch);

    // ══════════════════════════════════════════════════════════════
    // 📄 PAGINATION
    // ══════════════════════════════════════════════════════════════

    $parkings = $query->paginate(12)->through(fn($p) => $this->formatParking($p, $hasGeoSearch));

    // Liste des villes
    $cities = $this->getAvailableCities();

    // Plage de prix
    $priceRange = Parking::where('status', 'active')
        ->selectRaw('MIN(price_per_hour) as min_price, MAX(price_per_hour) as max_price')
        ->first();

    return Inertia::render('parking/available', [
        'parkings' => $parkings,
        'filters' => $request->only([
            'q', 'name', 'city', 'address',
            'min_price', 'max_price', 'min_spots', 'available_only', 'open_now',
            'latitude', 'longitude', 'radius',
            'sort', 'order'
        ]),
        'cities' => $cities,
        'priceRange' => [
            'min' => (float) ($priceRange->min_price ?? 0),
            'max' => (float) ($priceRange->max_price ?? 100),
        ],
        'sortOptions' => $this->getSortOptions($hasGeoSearch),
    ]);
}
    /**
     * Formate un parking pour l'API/Frontend
     */
    private function formatParking(Parking $parking, bool $includeDistance = false): array
    {
        $data = [
            'id' => $parking->id,
            'name' => $parking->name,
            'description' => $parking->description,
            'address_label' => $parking->address_label,
            'city' => $parking->city_name, // Utilise l'accessor
            'latitude' => (float) $parking->latitude,
            'longitude' => (float) $parking->longitude,
            'total_spots' => $parking->total_spots,
            'available_spots' => $parking->available_spots,
            'detected_cars' => $parking->detected_cars,
            'price_per_hour' => (float) $parking->price_per_hour,
            'opening_hours' => $parking->opening_hours,
            'is_24h' => $parking->is_24h,
            'is_open_now' => $parking->is_open_now,
            'occupancy_percent' => $parking->occupancy_percent,
            'photo_url' => $parking->photo_url,
            'annotated_file_url' => $parking->annotated_file_url,
            'owner_name' => $parking->owner?->company_name ?? $parking->owner?->name,
            'status' => $parking->status,
            'created_at' => $parking->created_at,
        ];

        // Ajouter la distance si recherche géolocalisée
        if ($includeDistance && isset($parking->distance)) {
            $data['distance'] = round((float) $parking->distance, 2);
            $data['distance_text'] = $this->formatDistance((float) $parking->distance);
        }

        return $data;
    }

    /**
     * Applique le tri à la requête
     */
    private function applySorting($query, string $sortBy, string $sortOrder, bool $hasGeoSearch = false)
    {
        $validSortFields = ['created_at', 'price_per_hour', 'available_spots', 'name'];

        if ($hasGeoSearch && $sortBy === 'distance') {
            $query->orderBy('distance', $sortOrder);
        } elseif (in_array($sortBy, $validSortFields)) {
            $query->orderBy($sortBy, $sortOrder);
        } else {
            $query->orderByDesc('created_at');
        }

        return $query;
    }

    /**
     * Récupère la liste des villes disponibles
     */
    private function getAvailableCities(): array
    {
        // D'abord essayer avec la colonne city
        $cities = Parking::where('status', 'active')
            ->whereNotNull('city')
            ->where('city', '!=', '')
            ->distinct()
            ->pluck('city')
            ->filter()
            ->sort()
            ->values()
            ->toArray();

        // Si pas de villes, extraire depuis address_label
        if (empty($cities)) {
            $addresses = Parking::where('status', 'active')
                ->whereNotNull('address_label')
                ->pluck('address_label')
                ->filter();

            $extractedCities = collect();
            foreach ($addresses as $address) {
                $parts = explode(',', $address);
                if (count($parts) >= 2) {
                    $city = trim($parts[count($parts) - 2]);
                    if (!empty($city) && strlen($city) > 2) {
                        $extractedCities->push($city);
                    }
                }
            }

            $cities = $extractedCities->unique()->sort()->values()->toArray();
        }

        return $cities;
    }

    /**
     * Formate la distance pour l'affichage
     */
    private function formatDistance(float $distance): string
    {
        if ($distance < 1) {
            return round($distance * 1000) . ' m';
        }

        return number_format($distance, 1) . ' km';
    }

    /**
     * Options de tri disponibles
     */
    private function getSortOptions(bool $hasGeoSearch): array
    {
        $options = [
            ['value' => 'created_at', 'label' => 'Most Recent', 'order' => 'desc'],
            ['value' => 'price_per_hour', 'label' => 'Price: Low to High', 'order' => 'asc'],
            ['value' => 'price_per_hour', 'label' => 'Price: High to Low', 'order' => 'desc'],
            ['value' => 'available_spots', 'label' => 'Most Available Spots', 'order' => 'desc'],
            ['value' => 'name', 'label' => 'Name (A-Z)', 'order' => 'asc'],
        ];

        if ($hasGeoSearch) {
            array_unshift($options, [
                'value' => 'distance',
                'label' => 'Nearest First',
                'order' => 'asc'
            ]);
        }

        return $options;
    }

    /**
     * API: Suggestions d'autocomplétion
     */
    public function suggestions(Request $request)
    {
        $query = $request->get('q', '');

        if (strlen($query) < 2) {
            return response()->json([]);
        }

        $suggestions = collect();

        // Suggestions de parkings
        $parkings = Parking::where('status', 'active')
            ->where(function ($q) use ($query) {
                $q->where('name', 'ILIKE', '%' . $query . '%')
                  ->orWhere('address_label', 'ILIKE', '%' . $query . '%')
                  ->orWhere('city', 'ILIKE', '%' . $query . '%');
            })
            ->limit(8)
            ->get(['id', 'name', 'city', 'address_label', 'price_per_hour', 'available_spots'])
            ->map(fn($p) => [
                'type' => 'parking',
                'id' => $p->id,
                'label' => $p->name,
                'sublabel' => $p->city_name ?? $p->address_label,
                'price' => $p->price_per_hour,
                'spots' => $p->available_spots,
            ]);

        // Suggestions de villes
        $cities = $this->getAvailableCities();
        $matchedCities = collect($cities)
            ->filter(fn($city) => stripos($city, $query) !== false)
            ->take(3)
            ->map(fn($city) => [
                'type' => 'city',
                'label' => $city,
                'sublabel' => 'City',
            ]);

        return response()->json(
            $matchedCities->concat($parkings)->take(10)->values()
        );
    }
}