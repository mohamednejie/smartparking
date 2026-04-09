<?php

namespace App\Http\Controllers;

use App\Models\Parking;
use App\Models\Camera;
use App\Models\User;
use App\Models\Reservation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ParkingController extends Controller
{
    // ══════════════════════════════════════════════════════════════════════════
    // GET /parkings
    // ══════════════════════════════════════════════════════════════════════════

    public function index()
    {
        /** @var User $user */
        $user           = auth()->user();
        $isPremiumValid = $user->isPremium();
        $totalParkings  = $user->parkings()->count();
        $query          = $user->parkings()->orderByDesc('created_at');

        if (!$isPremiumValid) {
            $query->limit(3);
        }

        $parkings = $query->get()->map(fn($p) => [
            ...$p->toArray(),
            'photo_url'          => $p->photo_url,
            'annotated_file_url' => $p->annotated_file_url,
        ]);

        $showUpgradeMessage = !$isPremiumValid && $totalParkings > 3;

        return Inertia::render('parking/index', [
            'parkings'           => $parkings,
            'canAdd'             => $user->canAddParking(),
            'currentPlan'        => $user->mode_compte,
            'isPremium'          => $isPremiumValid,
            'showUpgradeMessage' => $showUpgradeMessage,
            'hiddenCount'        => $showUpgradeMessage ? ($totalParkings - 3) : 0,
        ]);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // GET /parkings/create
    // ══════════════════════════════════════════════════════════════════════════

    public function create()
    {
        /** @var User $user */
        $user = auth()->user();

        if (!$user->canAddParking()) {
            return redirect()->route('parkings.index')
                ->with('warning', 'Upgrade to PREMIUM to add more parkings.');
        }

        return Inertia::render('parking/create', [
            'isPremium' => $user->isPremium(),
        ]);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // POST /parkings
    // ══════════════════════════════════════════════════════════════════════════

    public function store(Request $request)
{
    /** @var User $user */
    $user = auth()->user();

    if (!$user->canAddParking()) {
        throw ValidationException::withMessages([
            'limit' => 'You have reached the maximum number of parkings for your plan.',
        ]);
    }

    $validated = $request->validate([
        'name'              => ['required', 'string', 'max:255'],
        'description'       => ['nullable', 'string', 'max:1000'],
        'latitude'          => ['required', 'numeric', 'between:-90,90'],
        'longitude'         => ['required', 'numeric', 'between:-180,180'],
        'address_label'     => ['nullable', 'string', 'max:500'],
        'total_spots'       => ['required', 'integer', 'min:1'],
        'price_per_hour'    => ['required', 'numeric', 'min:0'],
        'opening_time'      => ['nullable', 'date_format:H:i'],
        'closing_time'      => ['nullable', 'date_format:H:i'],
        'is_24h'            => ['nullable'],
        'city'              => ['required', 'string', 'max:255'],
        'cancel_time_limit' => ['required', 'integer', 'min:10', 'max:1000'],
        'photo'             => ['required', 'image', 'max:4096'],
        'annotation_file'   => ['nullable', 'image', 'max:10240'],
        'slots'             => ['nullable', 'string'],
        'cameras'           => ['nullable', 'string'],
    ]);

    $isPremium = $user->isPremium();
    $is24h     = in_array($request->input('is_24h'), ['1', 'true', true, 1], true);

    $photoPath = $request->file('photo')->store('parkings', 'public');

    // ✅ Initialisation explicite pour éviter l'erreur de scope
    $parkingSlots  = null;
    $annotatedCount = 0;

    if ($isPremium && !empty($validated['slots'])) {
        $decoded = json_decode($validated['slots'], true);
        
        if (is_array($decoded) && count($decoded) > 0) {
            $parkingSlots = collect($decoded)->map(function ($slot) {
                return [
                    'id'     => $slot['id'] ?? uniqid(),
                    'points' => collect($slot['points'] ?? [])->map(function ($point) {
                        return [
                            'x' => (float)($point['x'] ?? 0), 
                            'y' => (float)($point['y'] ?? 0)
                        ];
                    })->toArray(),
                ];
            })->filter(fn($s) => count($s['points']) >= 3)->values()->toArray();

            $annotatedCount = count($parkingSlots);
            $totalSpots     = (int)$validated['total_spots'];

            if ($annotatedCount !== $totalSpots) {
                throw ValidationException::withMessages([
                    'slots' => "You annotated {$annotatedCount} spot(s), but declared {$totalSpots} total spots. They must match in Premium mode.",
                ]);
            }
        }
    }

    // Annotation — Premium uniquement
    $annotatedFilePath = null;
    if ($isPremium && $request->hasFile('annotation_file')) {
        $rawPath = $request->file('annotation_file')->store('parkings/raw', 'public');
        if (!empty($parkingSlots)) {
            $annotatedFilePath = $this->generateAnnotatedImage($rawPath, $parkingSlots);
        }
        if (!$annotatedFilePath) {
            $annotatedFilePath = $rawPath;
        }
    }

    $parking = $user->parkings()->create([
        'name'                => $validated['name'],
        'description'         => $validated['description'] ?? null,
        'latitude'            => $validated['latitude'],
        'longitude'           => $validated['longitude'],
        'address_label'       => $validated['address_label'] ?? null,
        'total_spots'         => (int)$validated['total_spots'],
        'available_spots'     => (int)$validated['total_spots'],
        'detected_cars'       => 0,
        'price_per_hour'      => (float)$validated['price_per_hour'],
        'opening_time'        => $validated['opening_time'] ?? null,
        'closing_time'        => $validated['closing_time'] ?? null,
        'is_24h'              => $is24h,
        'photo_path'          => $photoPath,
        'annotated_file_path' => $annotatedFilePath,
        'parking_slots'       => $parkingSlots,
        'status'              => 'active',
        'city'                => $validated['city'],
        'cancel_time_limit'   => (int)$validated['cancel_time_limit'],
    ]);

    // Caméras
    if (!empty($validated['cameras'])) {
        $cameras = json_decode($validated['cameras'], true);
        if (is_array($cameras)) {
            foreach ($cameras as $cam) {
                if (empty($cam['name']) || empty($cam['stream_url'])) continue;
                if (!in_array($cam['type'] ?? '', ['gate', 'zone'])) continue;
                
                $parking->cameras()->create([
                    'name'       => $cam['name'],
                    'type'       => $cam['type'],
                    'stream_url' => $cam['stream_url'],
                    'gate_mode'  => $cam['type'] === 'gate'
                        ? (in_array($cam['gate_mode'] ?? '', ['entrance', 'exit']) ? $cam['gate_mode'] : 'entrance')
                        : null,
                    'status'     => 'online',
                ]);
            }
        }
    }

    // ✅ Log sécurisé sans ?? dans la chaîne
    logger()->info("✅ Parking créé : {$parking->name} (ID {$parking->id}) — {$annotatedCount} spots annotés");

    return redirect()->route('parkings.index')
        ->with('success', 'Parking "' . $parking->name . '" created successfully!');
}
    // ══════════════════════════════════════════════════════════════════════════
    // GET /parkings/{parking}/edit
    // ══════════════════════════════════════════════════════════════════════════

    public function edit(Parking $parking)
    {
        if ($parking->user_id !== auth()->id()) abort(403);

        /** @var User $user */
        $user = auth()->user();
        $parking->load('cameras');

        return Inertia::render('parking/edit', [
            'parking' => [
                ...$parking->toArray(),
                'photo_url'          => $parking->photo_url,
                'annotated_file_url' => $parking->annotated_file_url,
                'cameras'            => $parking->cameras->map(fn($c) => [
                    'id'         => $c->id,
                    'name'       => $c->name,
                    'type'       => $c->type,
                    'stream_url' => $c->stream_url,
                    'status'     => $c->status,
                    'gate_mode'  => $c->gate_mode,
                ])->toArray(),
            ],
            'isPremium' => $user->isPremium(),
        ]);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PUT /parkings/{parking}
    // ══════════════════════════════════════════════════════════════════════════

    public function update(Request $request, Parking $parking)
    {
        if ($parking->user_id !== auth()->id()) abort(403);

        /** @var User $user */
        $user      = auth()->user();
        $isPremium = $user->isPremium();

        $validated = $request->validate([
            'name'              => ['required', 'string', 'max:255'],
            'description'       => ['nullable', 'string', 'max:1000'],
            'latitude'          => ['required', 'numeric', 'between:-90,90'],
            'longitude'         => ['required', 'numeric', 'between:-180,180'],
            'address_label'     => ['nullable', 'string', 'max:500'],
            'total_spots'       => ['required', 'integer', 'min:1'],
            'price_per_hour'    => ['required', 'numeric', 'min:0'],
            'opening_time'      => ['nullable', 'date_format:H:i'],
            'closing_time'      => ['nullable', 'date_format:H:i'],
            'is_24h'            => ['nullable'],
            'city'              => ['required', 'string', 'max:255'],
            'cancel_time_limit' => ['required', 'integer', 'min:10', 'max:1000'],
            'photo'             => ['nullable', 'image', 'max:4096'],
            'annotation_file'   => ['nullable', 'image', 'max:10240'],
            'slots'             => ['nullable', 'string'],
            'cameras'           => ['nullable', 'string'],
        ]);

        $is24h = in_array($request->input('is_24h'), ['1', 'true', true, 1], true);

        // Photo
        $photoPath = $parking->photo_path;
        if ($request->hasFile('photo')) {
            if ($parking->photo_path) Storage::disk('public')->delete($parking->photo_path);
            $photoPath = $request->file('photo')->store('parkings', 'public');
        }

        // Slots — Premium
        $parkingSlots = $parking->parking_slots;
        if ($isPremium && $request->has('slots')) {
            if (empty($validated['slots']) || $validated['slots'] === '[]') {
                $parkingSlots = null;
            } else {
                $decoded = json_decode($validated['slots'], true);
                if (is_array($decoded) && count($decoded) > 0) {
                    $parkingSlots = collect($decoded)->map(function ($slot) {
                        return [
                            'id'     => $slot['id'] ?? uniqid(),
                            'points' => collect($slot['points'] ?? [])->map(function ($point) {
                                return ['x' => (float)($point['x'] ?? 0), 'y' => (float)($point['y'] ?? 0)];
                            })->toArray(),
                        ];
                    })->filter(fn($s) => count($s['points']) >= 3)->values()->toArray();
                }
            }
        }

        // Annotation — Premium
        $annotatedFilePath = $parking->annotated_file_path;
        if ($isPremium) {
            $rawPath = null;
            if ($request->hasFile('annotation_file')) {
                $rawPath = $request->file('annotation_file')->store('parkings/raw', 'public');
            }
            $baseForAnnotation = $rawPath
                ?? (($parking->annotated_file_path && str_contains($parking->annotated_file_path, 'parkings/raw'))
                    ? $parking->annotated_file_path : null);

            if (!empty($parkingSlots) && $baseForAnnotation) {
                if ($parking->annotated_file_path && str_contains($parking->annotated_file_path, 'parkings/annotated')) {
                    Storage::disk('public')->delete($parking->annotated_file_path);
                }
                $newAnnotated = $this->generateAnnotatedImage($baseForAnnotation, $parkingSlots);
                if ($newAnnotated) $annotatedFilePath = $newAnnotated;
            } elseif ($rawPath) {
                if ($parking->annotated_file_path && str_contains($parking->annotated_file_path, 'parkings/annotated')) {
                    Storage::disk('public')->delete($parking->annotated_file_path);
                }
                $annotatedFilePath = $rawPath;
            } elseif (empty($parkingSlots)) {
                if ($parking->annotated_file_path && str_contains($parking->annotated_file_path, 'parkings/annotated')) {
                    Storage::disk('public')->delete($parking->annotated_file_path);
                    $annotatedFilePath = null;
                }
            }
        }

        // Mise à jour parking
        $spotsDiff    = (int)$validated['total_spots'] - $parking->total_spots;
        $newAvailable = max(0, $parking->available_spots + $spotsDiff);

        $parking->update([
            'name'                => $validated['name'],
            'description'         => $validated['description'] ?? null,
            'latitude'            => $validated['latitude'],
            'longitude'           => $validated['longitude'],
            'address_label'       => $validated['address_label'] ?? null,
            'total_spots'         => (int)$validated['total_spots'],
            'available_spots'     => $newAvailable,
            'price_per_hour'      => (float)$validated['price_per_hour'],
            'opening_time'        => $validated['opening_time'] ?? null,
            'closing_time'        => $validated['closing_time'] ?? null,
            'is_24h'              => $is24h,
            'photo_path'          => $photoPath,
            'annotated_file_path' => $annotatedFilePath,
            'parking_slots'       => $parkingSlots,
            'city'                => $validated['city'],
            'cancel_time_limit'   => (int)$validated['cancel_time_limit'],
        ]);

        // Caméras
        if (!empty($validated['cameras'])) {
            $cameras         = json_decode($validated['cameras'], true);
            $cameraIdsToKeep = [];

            if (is_array($cameras)) {
                foreach ($cameras as $cam) {
                    if (empty($cam['name']) || empty($cam['stream_url'])) continue;
                    if (!in_array($cam['type'] ?? '', ['gate', 'zone'])) continue;

                    $gateModeValue = $cam['type'] === 'gate'
                        ? (in_array($cam['gate_mode'] ?? '', ['entrance', 'exit']) ? $cam['gate_mode'] : 'entrance')
                        : null;

                    if (!empty($cam['id'])) {
                        $camera = $parking->cameras()->find($cam['id']);
                        if ($camera) {
                            $camera->update([
                                'name'       => $cam['name'],
                                'type'       => $cam['type'],
                                'stream_url' => $cam['stream_url'],
                                'gate_mode'  => $gateModeValue,
                            ]);
                            $cameraIdsToKeep[] = $camera->id;
                        }
                    } else {
                        $newCamera = $parking->cameras()->create([
                            'name'       => $cam['name'],
                            'type'       => $cam['type'],
                            'stream_url' => $cam['stream_url'],
                            'gate_mode'  => $gateModeValue,
                            'status'     => 'online',
                        ]);
                        $cameraIdsToKeep[] = $newCamera->id;
                    }
                }
            }
            $parking->cameras()->whereNotIn('id', $cameraIdsToKeep)->delete();
        } else {
            $parking->cameras()->delete();
        }

        return redirect()->route('parkings.index')
            ->with('success', 'Parking "' . $parking->name . '" updated successfully!');
    }

    // ══════════════════════════════════════════════════════════════════════════
    // GET /parkings/{parking}
    // ══════════════════════════════════════════════════════════════════════════

    public function show(Parking $parking)
    {
        $user = auth()->user();

        $isOwner   = $user && $user->id === $parking->user_id;
        $isPremium = $user ? $user->isPremium() : false;

        $reservations = [];

        if ($isOwner) {
            $parking->load('cameras');

            $reservations = Reservation::with(['driver', 'vehicle'])
                ->where('parking_id', $parking->id)
                ->latest('reserved_at')
                ->get()
                ->map(function (Reservation $r) {
                    return [
                        'id'            => $r->id,
                        'user_name'     => $r->driver?->name ?? '',
                        'user_avatar'   => $r->driver?->avatar_url ?? '',
                        'user_email'    => $r->driver?->email ?? '',
                        'vehicle_plate' => $r->vehicle?->license_plate ?? '',
                        'vehicle_brand' => $r->vehicle?->brand ?? '',
                        'vehicle_model' => $r->vehicle?->model ?? '',
                        'start_time'    => $r->start_time?->toIso8601String() ?? $r->reserved_at?->toIso8601String(),
                        'end_time'      => $r->end_time?->toIso8601String() ?? $r->reserved_at?->toIso8601String(),
                        'status'        => $this->mapStatusForOwner($r->status),
                        'total_price'   => (float)($r->total_price ?? 0),
                        'created_at'    => $r->created_at?->toIso8601String(),
                    ];
                })
                ->values();
        }

        return Inertia::render('parking/show', [
            'parking' => [
                'id'                  => $parking->id,
                'name'                => $parking->name,
                'description'         => $parking->description,
                'address_label'       => $parking->address_label,
                'latitude'            => $parking->latitude,
                'longitude'           => $parking->longitude,
                'total_spots'         => $parking->total_spots,
                'available_spots'     => $parking->available_spots,
                'detected_cars'       => $parking->detected_cars,
                'price_per_hour'      => $parking->price_per_hour,
                'is_24h'              => $parking->is_24h,
                'opening_time'        => $parking->opening_time,
                'closing_time'        => $parking->closing_time,
                'status'              => $parking->status,
                'photo_url'           => $parking->photo_url,
                'annotated_file_url'  => $parking->annotated_file_url,
                'photo_path'          => $parking->photo_path,
                'annotated_file_path' => $parking->annotated_file_path,
                'created_at'          => $parking->created_at?->toIso8601String(),
                'city'                => $parking->city,
                'cancel_time_limit'   => $parking->cancel_time_limit,
                'cameras'             => $isOwner ? $parking->cameras->map(fn($c) => [
                    'id'         => $c->id,
                    'name'       => $c->name,
                    'type'       => $c->type,
                    'stream_url' => $c->stream_url,
                    'status'     => $c->status,
                    'gate_mode'  => $c->gate_mode,
                ])->toArray() : [],
            ],
            'isPremium'    => $isPremium,
            'isOwner'      => $isOwner,
            'reservations' => $reservations,
        ]);
    }

    protected function mapStatusForOwner(string $status): string
    {
        return match ($status) {
            'cancelled_auto', 'cancelled_user' => 'cancelled',
            'pending'                          => 'pending',
            'active'                           => 'active',
            'completed'                        => 'completed',
            default                            => $status,
        };
    }

    // ══════════════════════════════════════════════════════════════════════════
    // DELETE /parkings/{parking}
    // ══════════════════════════════════════════════════════════════════════════

    public function destroy(Parking $parking)
    {
        if ($parking->user_id !== auth()->id()) abort(403);

        $name = $parking->name;
        if ($parking->photo_path)          Storage::disk('public')->delete($parking->photo_path);
        if ($parking->annotated_file_path) Storage::disk('public')->delete($parking->annotated_file_path);

        $parking->delete();
        logger()->info("🗑️ Parking supprimé : {$name}");

        return redirect()->route('parkings.index')
            ->with('success', 'Parking "' . $name . '" deleted successfully!');
    }

    // ══════════════════════════════════════════════════════════════════════════
    // POST /parkings/{parking}/toggle-status
    // ══════════════════════════════════════════════════════════════════════════

    public function toggleStatus(Parking $parking)
    {
        if ($parking->user_id !== auth()->id()) abort(403);

        $newStatus = $parking->status === 'active' ? 'inactive' : 'active';
        $parking->update(['status' => $newStatus]);

        return back()->with(
            $newStatus === 'active' ? 'success' : 'warning',
            $newStatus === 'active'
                ? 'Parking "' . $parking->name . '" is now active.'
                : 'Parking "' . $parking->name . '" is now inactive.'
        );
    }

    // ══════════════════════════════════════════════════════════════════════════
    // GET /api/parking/{parking}/config  (Flask)
    // ══════════════════════════════════════════════════════════════════════════

    public function flaskConfig(Parking $parking)
    {
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
    }

    // ══════════════════════════════════════════════════════════════════════════
    // GET /parkings/available
    // ══════════════════════════════════════════════════════════════════════════

    public function available(Request $request): Response
    {
        $query = Parking::where('status', 'active')
            ->with('owner:id,name,company_name');

        $query->where(function ($q) {
            $q->whereHas('owner', fn($uq) =>
                $uq->where('mode_compte', 'PREMIUM')
                   ->where('subscription_ends_at', '>', now())
            )->orWhereIn('id', fn($sub) =>
                $sub->select('id')->from('parkings as p')
                    ->whereRaw('p.user_id = parkings.user_id')
                    ->orderByDesc('created_at')
                    ->limit(3)
            );
        });

        if ($request->filled('q')) {
            $s = $request->q;
            $query->where(fn($q) => $q
                ->where('name',           'ILIKE', "%$s%")
                ->orWhere('city',          'ILIKE', "%$s%")
                ->orWhere('address_label', 'ILIKE', "%$s%")
                ->orWhere('description',   'ILIKE', "%$s%")
            );
        }

        if ($request->filled('city')) {
            $city = $request->city;
            $query->where(fn($q) => $q
                ->where('city',           'ILIKE', "%$city%")
                ->orWhere('address_label', 'ILIKE', "%$city%")
            );
        }

        if ($request->filled('min_price'))       $query->where('price_per_hour', '>=', (float)$request->min_price);
        if ($request->filled('max_price'))       $query->where('price_per_hour', '<=', (float)$request->max_price);
        if ($request->filled('min_spots'))       $query->where('available_spots', '>=', (int)$request->min_spots);
        if ($request->boolean('available_only')) $query->where('available_spots', '>', 0);

        if ($request->boolean('open_now')) {
            $now = now()->format('H:i:s');
            $query->where(fn($q) => $q
                ->where('is_24h', true)
                ->orWhere(fn($q2) => $q2
                    ->where('opening_time', '<=', $now)
                    ->where('closing_time', '>=', $now)
                )
            );
        }

        $hasGeoSearch = $request->filled('latitude') && $request->filled('longitude');
        if ($hasGeoSearch) {
            $lat = (float)$request->latitude;
            $lng = (float)$request->longitude;
            $rad = (float)($request->radius ?? 10);
            $hav = "(6371 * acos(LEAST(1.0, GREATEST(-1.0,
                cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) +
                sin(radians(?)) * sin(radians(latitude))
            ))))";
            $query->selectRaw("parkings.*, $hav as distance", [$lat, $lng, $lat])
                  ->whereNotNull('latitude')->whereNotNull('longitude')
                  ->whereRaw("$hav <= ?", [$lat, $lng, $lat, $rad]);
        }

        $sortBy    = $request->get('sort', $hasGeoSearch ? 'distance' : 'created_at');
        $sortOrder = $request->get('order', in_array($sortBy, ['price_per_hour', 'distance']) ? 'asc' : 'desc');
        $query     = $this->applySorting($query, $sortBy, $sortOrder, $hasGeoSearch);

        $parkings   = $query->paginate(12)->through(fn($p) => $this->formatParking($p, $hasGeoSearch));
        $priceRange = Parking::where('status', 'active')
            ->selectRaw('MIN(price_per_hour) as min_price, MAX(price_per_hour) as max_price')
            ->first();

        return Inertia::render('parking/available', [
            'parkings'    => $parkings,
            'filters'     => $request->only(['q','city','min_price','max_price','min_spots','available_only','open_now','latitude','longitude','radius','sort','order']),
            'cities'      => $this->getAvailableCities(),
            'priceRange'  => ['min' => (float)($priceRange->min_price ?? 0), 'max' => (float)($priceRange->max_price ?? 100)],
            'sortOptions' => $this->getSortOptions($hasGeoSearch),
        ]);
    }

    private function formatParking(Parking $parking, bool $includeDistance = false): array
    {
        $data = [
            'id'                 => $parking->id,
            'name'               => $parking->name,
            'description'        => $parking->description,
            'address_label'      => $parking->address_label,
            'city'               => $parking->city_name,
            'latitude'           => (float)$parking->latitude,
            'longitude'          => (float)$parking->longitude,
            'total_spots'        => $parking->total_spots,
            'available_spots'    => $parking->available_spots,
            'detected_cars'      => $parking->detected_cars,
            'price_per_hour'     => (float)$parking->price_per_hour,
            'opening_hours'      => $parking->opening_hours,
            'is_24h'             => $parking->is_24h,
            'is_open_now'        => $parking->is_open_now,
            'occupancy_percent'  => $parking->occupancy_percent,
            'photo_url'          => $parking->photo_url,
            'annotated_file_url' => $parking->annotated_file_url,
            'owner_name'         => $parking->owner?->company_name ?? $parking->owner?->name,
            'status'             => $parking->status,
            'created_at'         => $parking->created_at,
        ];

        if ($includeDistance && isset($parking->distance)) {
            $data['distance']      = round((float)$parking->distance, 2);
            $data['distance_text'] = $this->formatDistance((float)$parking->distance);
        }

        return $data;
    }

    private function applySorting($query, string $sortBy, string $sortOrder, bool $hasGeoSearch = false)
    {
        if ($hasGeoSearch && $sortBy === 'distance') return $query->orderBy('distance', $sortOrder);
        if (in_array($sortBy, ['created_at','price_per_hour','available_spots','name'])) return $query->orderBy($sortBy, $sortOrder);
        return $query->orderByDesc('created_at');
    }

    private function getAvailableCities(): array
    {
        $cities = Parking::where('status', 'active')
            ->whereNotNull('city')->where('city', '!=', '')
            ->distinct()->pluck('city')
            ->filter()->sort()->values()->toArray();

        if (empty($cities)) {
            $cities = Parking::where('status', 'active')
                ->whereNotNull('address_label')->pluck('address_label')->filter()
                ->map(function ($a) {
                    $parts = explode(',', $a);
                    return count($parts) >= 2 ? trim($parts[count($parts) - 2]) : null;
                })
                ->filter(fn($c) => $c && strlen($c) > 2)
                ->unique()->sort()->values()->toArray();
        }

        return $cities;
    }

    private function formatDistance(float $d): string
    {
        return $d < 1 ? round($d * 1000) . ' m' : number_format($d, 1) . ' km';
    }

    private function getSortOptions(bool $hasGeoSearch): array
    {
        $options = [
            ['value' => 'created_at',     'label' => 'Most Recent',          'order' => 'desc'],
            ['value' => 'price_per_hour', 'label' => 'Price: Low to High',   'order' => 'asc'],
            ['value' => 'price_per_hour', 'label' => 'Price: High to Low',   'order' => 'desc'],
            ['value' => 'available_spots','label' => 'Most Available Spots', 'order' => 'desc'],
            ['value' => 'name',           'label' => 'Name (A-Z)',            'order' => 'asc'],
        ];
        if ($hasGeoSearch) {
            array_unshift($options, ['value' => 'distance', 'label' => 'Nearest First', 'order' => 'asc']);
        }
        return $options;
    }

    public function suggestions(Request $request)
    {
        $q = $request->get('q', '');
        if (strlen($q) < 2) return response()->json([]);

        $parkings = Parking::where('status', 'active')
            ->where(fn($query) => $query
                ->where('name',           'ILIKE', "%$q%")
                ->orWhere('address_label', 'ILIKE', "%$q%")
                ->orWhere('city',          'ILIKE', "%$q%")
            )
            ->limit(8)
            ->get(['id','name','city','address_label','price_per_hour','available_spots'])
            ->map(fn($p) => [
                'type'     => 'parking',
                'id'       => $p->id,
                'label'    => $p->name,
                'sublabel' => $p->city_name ?? $p->address_label,
                'price'    => $p->price_per_hour,
                'spots'    => $p->available_spots,
            ]);

        $cities = collect($this->getAvailableCities())
            ->filter(fn($c) => stripos($c, $q) !== false)
            ->take(3)
            ->map(fn($c) => ['type' => 'city', 'label' => $c, 'sublabel' => 'City']);

        return response()->json($cities->concat($parkings)->take(10)->values());
    }

    // ══════════════════════════════════════════════════════════════════════════
    // GÉNÉRATION IMAGE ANNOTÉE
    // ══════════════════════════════════════════════════════════════════════════

    private function generateAnnotatedImage(string $sourcePath, array $slots): ?string
    {
        try {
            $fullPath = Storage::disk('public')->path($sourcePath);
            if (!file_exists($fullPath)) return null;

            $imageInfo = getimagesize($fullPath);
            if (!$imageInfo) return null;

            $img = match ($imageInfo['mime']) {
                'image/jpeg', 'image/jpg' => imagecreatefromjpeg($fullPath),
                'image/png'               => imagecreatefrompng($fullPath),
                'image/webp'              => imagecreatefromwebp($fullPath),
                'image/gif'               => imagecreatefromgif($fullPath),
                default                   => null,
            };
            if (!$img) return null;

            $W = imagesx($img);
            $H = imagesy($img);

            $palette = [
                [34,197,94],[59,130,246],[245,158,11],[239,68,68],[139,92,246],
                [6,182,212],[249,115,22],[236,72,153],[20,184,166],[99,102,241],
            ];

            foreach ($slots as $idx => $slot) {
                if (empty($slot['points']) || count($slot['points']) < 3) continue;

                $rgb   = $palette[$idx % count($palette)];
                $color = imagecolorallocate($img, $rgb[0], $rgb[1], $rgb[2]);
                $white = imagecolorallocate($img, 255, 255, 255);
                $black = imagecolorallocate($img, 0, 0, 0);

                $points = [];
                foreach ($slot['points'] as $pt) {
                    $points[] = (int)round($pt['x'] * $W);
                    $points[] = (int)round($pt['y'] * $H);
                }

                $overlay     = imagecreatetruecolor($W, $H);
                imagealphablending($overlay, false);
                imagesavealpha($overlay, true);
                $transparent = imagecolorallocatealpha($overlay, 0, 0, 0, 127);
                imagefill($overlay, 0, 0, $transparent);
                imagealphablending($overlay, true);
                $fill = imagecolorallocatealpha($overlay, $rgb[0], $rgb[1], $rgb[2], 90);
                imagefilledpolygon($overlay, $points, count($slot['points']), $fill);
                imagecopymerge($img, $overlay, 0, 0, 0, 0, $W, $H, 30);
                imagedestroy($overlay);

                imagesetthickness($img, 2);
                imagepolygon($img, $points, count($slot['points']), $color);
                imagesetthickness($img, 1);

                $cx = $cy = 0;
                foreach ($slot['points'] as $pt) { $cx += $pt['x'] * $W; $cy += $pt['y'] * $H; }
                $cx = (int)round($cx / count($slot['points']));
                $cy = (int)round($cy / count($slot['points']));
                $fs = max(2, (int)round(min($W, $H) / 55));
                imagestring($img, $fs, $cx - 7, $cy - 5, 'S'.($idx+1), $black);
                imagestring($img, $fs, $cx - 8, $cy - 6, 'S'.($idx+1), $white);

                foreach ($slot['points'] as $pt) {
                    $px = (int)round($pt['x'] * $W);
                    $py = (int)round($pt['y'] * $H);
                    imagefilledellipse($img, $px, $py, 8, 8, $color);
                    imageellipse($img, $px, $py, 8, 8, $white);
                }
            }

            $dir      = 'parkings/annotated';
            $filename = 'annotated_' . pathinfo($sourcePath, PATHINFO_FILENAME) . '_' . time() . '.jpg';
            $path     = $dir . '/' . $filename;

            Storage::disk('public')->makeDirectory($dir);
            $saved = imagejpeg($img, Storage::disk('public')->path($path), 90);
            imagedestroy($img);

            return $saved ? $path : null;

        } catch (\Throwable $e) {
            logger()->error('[Annotation] Exception : ' . $e->getMessage());
            return null;
        }
    }
}