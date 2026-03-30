<?php
// app/Http/Controllers/ParkingController.php

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
    // ✅ isPremium passé au formulaire
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
    // ✅ slots et cameras reçus en JSON string
    // ✅ is_24h converti depuis '0'/'1' (FormData)
    // ✅ annotation ignorée si pas Premium
    // ══════════════════════════════════════════════════════════════════════════

    public function store(Request $request)
    {
        /** @var User $user */
        $user = auth()->user();

        if (!$user->canAddParking()) {
            throw ValidationException::withMessages([
                'limit' => 'You have reached the maximum number of parkings for your plan. Upgrade to Premium to add more.',
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
            // Photo d'affichage — obligatoire
            'photo'             => ['required', 'image', 'max:4096'],
            // Annotation — optionnel, ignoré si pas Premium
            'annotation_file'   => ['nullable', 'image', 'max:10240'],
            // JSON strings
            'slots'             => ['nullable', 'string'],
            'cameras'           => ['nullable', 'string'],
        ]);

        $isPremium = $user->isPremium();

        // ── is_24h : FormData envoie '1' ou '0' ──────────────────────────────
        $is24h = in_array($request->input('is_24h'), ['1', 'true', true, 1], true);

        // ── Photo d'affichage ─────────────────────────────────────────────────
        $photoPath = $request->file('photo')->store('parkings', 'public');

        // ── Annotation + génération — PREMIUM UNIQUEMENT ──────────────────────
        $annotatedFilePath = null;

        if ($isPremium && $request->hasFile('annotation_file')) {
            $rawPath = $request->file('annotation_file')->store('parkings/raw', 'public');

            $slots = [];
            if (!empty($validated['slots'])) {
                $decoded = json_decode($validated['slots'], true);
                if (is_array($decoded) && count($decoded) > 0) {
                    $slots = $decoded;
                }
            }

            if (count($slots) > 0) {
                $annotatedFilePath = $this->generateAnnotatedImage($rawPath, $slots);
            }

            // Si génération échouée ou pas de slots → garder le fichier brut
            if (!$annotatedFilePath) {
                $annotatedFilePath = $rawPath;
            }
        }
        // BASIC : annotation_file et slots ignorés → annotated_file_path = null

        // ── Créer le parking ──────────────────────────────────────────────────
        $parking = $user->parkings()->create([
            'name'                => $validated['name'],
            'description'         => $validated['description'] ?? null,
            'latitude'            => $validated['latitude'],
            'longitude'           => $validated['longitude'],
            'address_label'       => $validated['address_label'] ?? null,
            'total_spots'         => (int) $validated['total_spots'],
            'available_spots'     => (int) $validated['total_spots'],
            'detected_cars'       => 0,
            'price_per_hour'      => (float) $validated['price_per_hour'],
            'opening_time'        => $validated['opening_time'] ?? null,
            'closing_time'        => $validated['closing_time'] ?? null,
            'is_24h'              => $is24h,
            'photo_path'          => $photoPath,
            'annotated_file_path' => $annotatedFilePath,
            'status'              => 'active',
            'city'                => $validated['city'],
            'cancel_time_limit'   => (int) $validated['cancel_time_limit'],
        ]);

        // ── Caméras : décoder depuis JSON string ──────────────────────────────
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
                        'status'     => 'online',
                    ]);
                }
            }
        }

        logger()->info("✅ Parking créé : {$parking->name} (ID {$parking->id}) par {$user->name}");

        return redirect()->route('parkings.index')
            ->with('success', 'Parking "' . $parking->name . '" created successfully!');
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
                        'total_price'   => (float) ($r->total_price ?? 0),
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
                'cameras'             => $isOwner ? $parking->cameras : [],
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
    // GET /parkings/{parking}/edit
    // ✅ isPremium passé au formulaire d'édition
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
            ],
            'isPremium' => $user->isPremium(),
        ]);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PUT /parkings/{parking}
    // ✅ Même logique que store : JSON strings, is_24h, Premium gate
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

        // ── Photo d'affichage ─────────────────────────────────────────────────
        $photoPath = $parking->photo_path;
        if ($request->hasFile('photo')) {
            if ($parking->photo_path) Storage::disk('public')->delete($parking->photo_path);
            $photoPath = $request->file('photo')->store('parkings', 'public');
        }

        // ── Annotation — PREMIUM UNIQUEMENT ──────────────────────────────────
        $annotatedFilePath = $parking->annotated_file_path;

        if ($isPremium) {
            $rawPath = null;

            if ($request->hasFile('annotation_file')) {
                $rawPath = $request->file('annotation_file')->store('parkings/raw', 'public');
            }

            // Base pour l'annotation : nouveau fichier ou fichier brut existant
            $baseForAnnotation = $rawPath
                ?? (($parking->annotated_file_path && str_contains($parking->annotated_file_path, 'parkings/raw'))
                    ? $parking->annotated_file_path
                    : null);

            if (!empty($validated['slots']) && $validated['slots'] !== '[]') {
                $slots = json_decode($validated['slots'], true);
                if (is_array($slots) && count($slots) > 0 && $baseForAnnotation) {
                    // Supprimer l'ancienne image annotée
                    if ($parking->annotated_file_path && str_contains($parking->annotated_file_path, 'parkings/annotated')) {
                        Storage::disk('public')->delete($parking->annotated_file_path);
                    }
                    $newAnnotated = $this->generateAnnotatedImage($baseForAnnotation, $slots);
                    if ($newAnnotated) $annotatedFilePath = $newAnnotated;
                }
            } elseif ($rawPath) {
                // Nouveau fichier sans slots → garder le brut comme annotated
                if ($parking->annotated_file_path && str_contains($parking->annotated_file_path, 'parkings/annotated')) {
                    Storage::disk('public')->delete($parking->annotated_file_path);
                }
                $annotatedFilePath = $rawPath;
            } elseif ($validated['slots'] === '[]') {
                // Slots vidés → supprimer l'annotée
                if ($parking->annotated_file_path && str_contains($parking->annotated_file_path, 'parkings/annotated')) {
                    Storage::disk('public')->delete($parking->annotated_file_path);
                }
                $annotatedFilePath = null;
            }
        }
        // BASIC : on ne touche pas à annotated_file_path

        // ── Mise à jour parking ───────────────────────────────────────────────
        $spotsDiff    = (int)$validated['total_spots'] - $parking->total_spots;
        $newAvailable = max(0, $parking->available_spots + $spotsDiff);

        $parking->update([
            'name'                => $validated['name'],
            'description'         => $validated['description'] ?? null,
            'latitude'            => $validated['latitude'],
            'longitude'           => $validated['longitude'],
            'address_label'       => $validated['address_label'] ?? null,
            'total_spots'         => (int) $validated['total_spots'],
            'available_spots'     => $newAvailable,
            'price_per_hour'      => (float) $validated['price_per_hour'],
            'opening_time'        => $validated['opening_time'] ?? null,
            'closing_time'        => $validated['closing_time'] ?? null,
            'is_24h'              => $is24h,
            'photo_path'          => $photoPath,
            'annotated_file_path' => $annotatedFilePath,
            'city'                => $validated['city'],
            'cancel_time_limit'   => (int) $validated['cancel_time_limit'],
        ]);

        // ── Caméras ───────────────────────────────────────────────────────────
        if (!empty($validated['cameras'])) {
            $cameras         = json_decode($validated['cameras'], true);
            $cameraIdsToKeep = [];

            if (is_array($cameras)) {
                foreach ($cameras as $cam) {
                    if (empty($cam['name']) || empty($cam['stream_url'])) continue;
                    if (!in_array($cam['type'] ?? '', ['gate', 'zone'])) continue;

                    if (!empty($cam['id'])) {
                        $camera = $parking->cameras()->find($cam['id']);
                        if ($camera) {
                            $camera->update([
                                'name'       => $cam['name'],
                                'type'       => $cam['type'],
                                'stream_url' => $cam['stream_url'],
                            ]);
                            $cameraIdsToKeep[] = $camera->id;
                        }
                    } else {
                        $newCamera = $parking->cameras()->create([
                            'name'       => $cam['name'],
                            'type'       => $cam['type'],
                            'stream_url' => $cam['stream_url'],
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

        logger()->info("🔄 Parking {$parking->name} → {$newStatus}");

        return back()->with(
            $newStatus === 'active' ? 'success' : 'warning',
            $newStatus === 'active'
                ? 'Parking "' . $parking->name . '" is now active.'
                : 'Parking "' . $parking->name . '" is now inactive (maintenance mode).'
        );
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ✅ GÉNÉRATION IMAGE ANNOTÉE (Premium uniquement)
    // ══════════════════════════════════════════════════════════════════════════

    private function generateAnnotatedImage(string $sourcePath, array $slots): ?string
    {
        try {
            $fullPath = Storage::disk('public')->path($sourcePath);
            if (!file_exists($fullPath)) {
                logger()->warning("[Annotation] Fichier source introuvable : {$fullPath}");
                return null;
            }

            $imageInfo = getimagesize($fullPath);
            if (!$imageInfo) return null;

            $mime = $imageInfo['mime'];
            $img  = match ($mime) {
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
                [34,197,94], [59,130,246], [245,158,11], [239,68,68],  [139,92,246],
                [6,182,212], [249,115,22], [236,72,153], [20,184,166], [99,102,241],
            ];

            foreach ($slots as $idx => $slot) {
                if (empty($slot['points']) || count($slot['points']) < 3) continue;

                $rgb   = $palette[$idx % count($palette)];
                $color = imagecolorallocate($img, $rgb[0], $rgb[1], $rgb[2]);
                $white = imagecolorallocate($img, 255, 255, 255);
                $black = imagecolorallocate($img, 0, 0, 0);

                // Convertir coordonnées relatives → pixels
                $points = [];
                foreach ($slot['points'] as $pt) {
                    $points[] = (int) round($pt['x'] * $W);
                    $points[] = (int) round($pt['y'] * $H);
                }

                // Remplissage semi-transparent 30%
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

                // Contour
                imagesetthickness($img, 2);
                imagepolygon($img, $points, count($slot['points']), $color);
                imagesetthickness($img, 1);

                // Centroïde + numéro
                $cx = $cy = 0;
                foreach ($slot['points'] as $pt) { $cx += $pt['x'] * $W; $cy += $pt['y'] * $H; }
                $cx = (int) round($cx / count($slot['points']));
                $cy = (int) round($cy / count($slot['points']));
                $fs = max(2, (int) round(min($W, $H) / 55));
                imagestring($img, $fs, $cx - 7, $cy - 5, 'S'.($idx+1), $black); // ombre
                imagestring($img, $fs, $cx - 8, $cy - 6, 'S'.($idx+1), $white); // texte

                // Points de coin
                foreach ($slot['points'] as $pt) {
                    $px = (int) round($pt['x'] * $W);
                    $py = (int) round($pt['y'] * $H);
                    imagefilledellipse($img, $px, $py, 8, 8, $color);
                    imageellipse($img,       $px, $py, 8, 8, $white);
                }
            }

            // Sauvegarde
            $dir      = 'parkings/annotated';
            $filename = 'annotated_' . pathinfo($sourcePath, PATHINFO_FILENAME) . '_' . time() . '.jpg';
            $path     = $dir . '/' . $filename;

            Storage::disk('public')->makeDirectory($dir);
            $saved = imagejpeg($img, Storage::disk('public')->path($path), 90);
            imagedestroy($img);

            if (!$saved) {
                logger()->error("[Annotation] Échec de sauvegarde : {$path}");
                return null;
            }

            logger()->info("[Annotation] Générée : {$path} — " . count($slots) . " spots");
            return $path;

        } catch (\Throwable $e) {
            logger()->error('[Annotation] Exception : ' . $e->getMessage(), [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            return null;
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // GET /parkings/available
    // ══════════════════════════════════════════════════════════════════════════

    public function available(Request $request): Response
    {
        $query = Parking::where('status', 'active')
            ->with('owner:id,name,company_name');

        // Filtrer par visibilité plan (Premium = tous, Basic = 3 max)
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

        // Recherche globale
        if ($request->filled('q')) {
            $s = $request->q;
            $query->where(fn($q) => $q
                ->where('name',          'ILIKE', "%$s%")
                ->orWhere('city',         'ILIKE', "%$s%")
                ->orWhere('address_label','ILIKE', "%$s%")
                ->orWhere('description',  'ILIKE', "%$s%")
            );
        }

        if ($request->filled('city')) {
            $city = $request->city;
            $query->where(fn($q) => $q
                ->where('city',          'ILIKE', "%$city%")
                ->orWhere('address_label','ILIKE', "%$city%")
            );
        }

        if ($request->filled('min_price'))       $query->where('price_per_hour', '>=', (float) $request->min_price);
        if ($request->filled('max_price'))       $query->where('price_per_hour', '<=', (float) $request->max_price);
        if ($request->filled('min_spots'))       $query->where('available_spots', '>=', (int) $request->min_spots);
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
            $lat = (float) $request->latitude;
            $lng = (float) $request->longitude;
            $rad = (float) ($request->radius ?? 10);
            $hav = "(6371 * acos(LEAST(1.0, GREATEST(-1.0,
                cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) +
                sin(radians(?)) * sin(radians(latitude))
            ))))";
            $query->selectRaw("parkings.*, $hav as distance", [$lat, $lng, $lat])
                  ->whereNotNull('latitude')
                  ->whereNotNull('longitude')
                  ->whereRaw("$hav <= ?", [$lat, $lng, $lat, $rad]);
        }

        $sortBy    = $request->get('sort', $hasGeoSearch ? 'distance' : 'created_at');
        $sortOrder = $request->get('order', in_array($sortBy, ['price_per_hour','distance']) ? 'asc' : 'desc');
        $query     = $this->applySorting($query, $sortBy, $sortOrder, $hasGeoSearch);

        $parkings   = $query->paginate(12)->through(fn($p) => $this->formatParking($p, $hasGeoSearch));
        $priceRange = Parking::where('status','active')
            ->selectRaw('MIN(price_per_hour) as min_price, MAX(price_per_hour) as max_price')
            ->first();

        return Inertia::render('parking/available', [
            'parkings'    => $parkings,
            'filters'     => $request->only(['q','city','min_price','max_price','min_spots','available_only','open_now','latitude','longitude','radius','sort','order']),
            'cities'      => $this->getAvailableCities(),
            'priceRange'  => ['min' => (float)($priceRange->min_price??0), 'max' => (float)($priceRange->max_price??100)],
            'sortOptions' => $this->getSortOptions($hasGeoSearch),
        ]);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function formatParking(Parking $parking, bool $includeDistance = false): array
    {
        $data = [
            'id'                => $parking->id,
            'name'              => $parking->name,
            'description'       => $parking->description,
            'address_label'     => $parking->address_label,
            'city'              => $parking->city_name,
            'latitude'          => (float) $parking->latitude,
            'longitude'         => (float) $parking->longitude,
            'total_spots'       => $parking->total_spots,
            'available_spots'   => $parking->available_spots,
            'detected_cars'     => $parking->detected_cars,
            'price_per_hour'    => (float) $parking->price_per_hour,
            'opening_hours'     => $parking->opening_hours,
            'is_24h'            => $parking->is_24h,
            'is_open_now'       => $parking->is_open_now,
            'occupancy_percent' => $parking->occupancy_percent,
            'photo_url'         => $parking->photo_url,
            'annotated_file_url'=> $parking->annotated_file_url,
            'owner_name'        => $parking->owner?->company_name ?? $parking->owner?->name,
            'status'            => $parking->status,
            'created_at'        => $parking->created_at,
        ];

        if ($includeDistance && isset($parking->distance)) {
            $data['distance']      = round((float) $parking->distance, 2);
            $data['distance_text'] = $this->formatDistance((float) $parking->distance);
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
        $cities = Parking::where('status','active')
            ->whereNotNull('city')->where('city','!=','')
            ->distinct()->pluck('city')
            ->filter()->sort()->values()->toArray();

        if (empty($cities)) {
            $cities = Parking::where('status','active')
                ->whereNotNull('address_label')->pluck('address_label')->filter()
                ->map(function ($a) {
                    $parts = explode(',', $a);
                    return count($parts) >= 2 ? trim($parts[count($parts)-2]) : null;
                })
                ->filter(fn($c) => $c && strlen($c) > 2)
                ->unique()->sort()->values()->toArray();
        }

        return $cities;
    }

    private function formatDistance(float $d): string
    {
        return $d < 1 ? round($d*1000) . ' m' : number_format($d, 1) . ' km';
    }

    private function getSortOptions(bool $hasGeoSearch): array
    {
        $options = [
            ['value'=>'created_at',      'label'=>'Most Recent',          'order'=>'desc'],
            ['value'=>'price_per_hour',  'label'=>'Price: Low to High',   'order'=>'asc'],
            ['value'=>'price_per_hour',  'label'=>'Price: High to Low',   'order'=>'desc'],
            ['value'=>'available_spots', 'label'=>'Most Available Spots', 'order'=>'desc'],
            ['value'=>'name',            'label'=>'Name (A-Z)',            'order'=>'asc'],
        ];
        if ($hasGeoSearch) {
            array_unshift($options, ['value'=>'distance','label'=>'Nearest First','order'=>'asc']);
        }
        return $options;
    }

    public function suggestions(Request $request)
    {
        $q = $request->get('q', '');
        if (strlen($q) < 2) return response()->json([]);

        $parkings = Parking::where('status','active')
            ->where(fn($query) => $query
                ->where('name',          'ILIKE', "%$q%")
                ->orWhere('address_label','ILIKE', "%$q%")
                ->orWhere('city',         'ILIKE', "%$q%")
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
            ->map(fn($c) => ['type'=>'city','label'=>$c,'sublabel'=>'City']);

        return response()->json($cities->concat($parkings)->take(10)->values());
    }
}