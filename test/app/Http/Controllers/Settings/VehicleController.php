<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\Vehicle;
use App\Rules\LicensePlate;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class VehicleController extends Controller
{
    /**
     * Formats de plaques acceptés par pays/région
     */
    private const PLATE_PATTERNS = [
        // France: AB-123-CD ou AB123CD
        'FR' => '/^[A-Z]{2}[-\s]?\d{3}[-\s]?[A-Z]{2}$/i',
        
        // Maroc: 12345-A-1 ou format ancien
        'MA' => '/^(\d{1,5}[-\s]?[A-Z][-\s]?\d{1,2})|([A-Z]{1,3}[-\s]?\d{1,6})$/i',
        
        // Allemagne: ABC-DE-1234
        'DE' => '/^[A-Z]{1,3}[-\s]?[A-Z]{1,2}[-\s]?\d{1,4}$/i',
        
        // USA: Variable (lettres et chiffres)
        'US' => '/^[A-Z0-9]{1,8}$/i',
        
        // UK: AB12 CDE
        'UK' => '/^[A-Z]{2}\d{2}[-\s]?[A-Z]{3}$/i',
        
        // Générique: 2-10 caractères alphanumériques avec tirets/espaces
        'GENERIC' => '/^[A-Z0-9]{2,4}[-\s]?[A-Z0-9]{2,4}[-\s]?[A-Z0-9]{0,4}$/i',
    ];

    /**
     * Display the vehicles page.
     */
    public function index(): Response
    {
        $user = Auth::user();

        if (!$user->isDriver()) {
            abort(403, 'Only drivers can access this page.');
        }

        return Inertia::render('settings/vehicles', [
            'vehicles' => $user->vehicles()
                ->orderByDesc('is_primary')
                ->orderByDesc('created_at')
                ->get(),
            'vehicleTypes' => Vehicle::getTypes(),
        ]);
    }

    /**
     * Store a new vehicle.
     */
    public function store(Request $request): RedirectResponse
    {
        $user = Auth::user();

        if (!$user->isDriver()) {
            abort(403, 'Only drivers can add vehicles.');
        }

        if ($user->vehicles()->count() >= 5) {
            return back()->withErrors([
                'vehicle' => 'You can only register up to 5 vehicles.',
            ]);
        }

        $validated = $request->validate([
            'license_plate' => [
                'required',
                'string',
                'min:2',
                'max:20',
                new LicensePlate(), // 🔥 Règle personnalisée
                Rule::unique('vehicles', 'license_plate'),
            ],
            'brand' => ['nullable', 'string', 'max:50', 'regex:/^[a-zA-Z0-9\s\-]+$/'],
            'model' => ['nullable', 'string', 'max:50', 'regex:/^[a-zA-Z0-9\s\-]+$/'],
            'color' => ['nullable', 'string', 'max:30', 'regex:/^[a-zA-Z\s]+$/'],
            'type' => ['nullable', 'string', 'in:' . implode(',', array_keys(Vehicle::getTypes()))],
            'year' => ['nullable', 'integer', 'min:1900', 'max:' . (date('Y') + 1)],
            'is_primary' => ['nullable', 'boolean'],
        ], [
            'license_plate.required' => 'License plate is required.',
            'license_plate.unique' => 'This license plate is already registered in our system.',
            'license_plate.min' => 'License plate must be at least 2 characters.',
            'license_plate.max' => 'License plate cannot exceed 20 characters.',
            'brand.regex' => 'Brand can only contain letters, numbers, spaces and hyphens.',
            'model.regex' => 'Model can only contain letters, numbers, spaces and hyphens.',
            'color.regex' => 'Color can only contain letters and spaces.',
            'year.min' => 'Year must be 1900 or later.',
            'year.max' => 'Year cannot be in the future.',
        ]);

        $isPrimary = $user->vehicles()->count() === 0 || $request->boolean('is_primary');

        if ($isPrimary) {
            $user->vehicles()->update(['is_primary' => false]);
        }

        // 🔥 Nettoyer et formater la plaque
        $licensePlate = $this->formatLicensePlate($validated['license_plate']);

        $user->vehicles()->create([
            'license_plate' => $licensePlate,
            'brand' => $this->sanitizeString($validated['brand'] ?? null),
            'model' => $this->sanitizeString($validated['model'] ?? null),
            'color' => $this->sanitizeString($validated['color'] ?? null),
            'type' => $validated['type'] ?? null,
            'year' => $validated['year'] ?? null,
            'is_primary' => $isPrimary,
        ]);

        return back()->with('success', 'Vehicle added successfully.');
    }

    /**
     * Update a vehicle.
     */
    public function update(Request $request, Vehicle $vehicle): RedirectResponse
    {
        $user = Auth::user();

        if ($vehicle->user_id !== $user->id) {
            abort(403);
        }

        $validated = $request->validate([
            'license_plate' => [
                'required',
                'string',
                'min:2',
                'max:20',
                new LicensePlate(),
                Rule::unique('vehicles', 'license_plate')->ignore($vehicle->id),
            ],
            'brand' => ['nullable', 'string', 'max:50', 'regex:/^[a-zA-Z0-9\s\-]+$/'],
            'model' => ['nullable', 'string', 'max:50', 'regex:/^[a-zA-Z0-9\s\-]+$/'],
            'color' => ['nullable', 'string', 'max:30', 'regex:/^[a-zA-Z\s]+$/'],
            'type' => ['nullable', 'string', 'in:' . implode(',', array_keys(Vehicle::getTypes()))],
            'year' => ['nullable', 'integer', 'min:1900', 'max:' . (date('Y') + 1)],
            'is_primary' => ['nullable', 'boolean'],
        ]);

        if ($request->boolean('is_primary')) {
            $user->vehicles()->where('id', '!=', $vehicle->id)->update(['is_primary' => false]);
        }

        $licensePlate = $this->formatLicensePlate($validated['license_plate']);

        $vehicle->update([
            'license_plate' => $licensePlate,
            'brand' => $this->sanitizeString($validated['brand'] ?? null),
            'model' => $this->sanitizeString($validated['model'] ?? null),
            'color' => $this->sanitizeString($validated['color'] ?? null),
            'type' => $validated['type'] ?? null,
            'year' => $validated['year'] ?? null,
            'is_primary' => $request->boolean('is_primary') || $vehicle->is_primary,
        ]);

        return back()->with('success', 'Vehicle updated successfully.');
    }

    /**
     * Delete a vehicle.
     */
    public function destroy(Vehicle $vehicle): RedirectResponse
    {
        $user = Auth::user();

        if ($vehicle->user_id !== $user->id) {
            abort(403);
        }

        $wasPrimary = $vehicle->is_primary;
        $vehicle->delete();

        if ($wasPrimary) {
            $user->vehicles()->first()?->update(['is_primary' => true]);
        }

        return back()->with('success', 'Vehicle removed successfully.');
    }

    /**
     * Set a vehicle as primary.
     */
    public function setPrimary(Vehicle $vehicle): RedirectResponse
    {
        $user = Auth::user();

        if ($vehicle->user_id !== $user->id) {
            abort(403);
        }

        $user->vehicles()->update(['is_primary' => false]);
        $vehicle->update(['is_primary' => true]);

        return back()->with('success', 'Primary vehicle updated.');
    }

    /**
     * Format license plate to uppercase with proper separators.
     */
    private function formatLicensePlate(string $plate): string
    {
        // Supprimer les espaces multiples et les caractères spéciaux sauf tirets
        $plate = preg_replace('/[^A-Za-z0-9\-]/', '', $plate);
        
        // Convertir en majuscules
        $plate = strtoupper($plate);
        
        // Format français: XX-123-XX
        if (preg_match('/^([A-Z]{2})(\d{3})([A-Z]{2})$/', $plate, $matches)) {
            return $matches[1] . '-' . $matches[2] . '-' . $matches[3];
        }
        
        return $plate;
    }

    /**
     * Sanitize string input.
     */
    private function sanitizeString(?string $value): ?string
    {
        if ($value === null || trim($value) === '') {
            return null;
        }

        // Trim et capitaliser chaque mot
        return ucwords(strtolower(trim($value)));
    }
}