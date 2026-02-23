<?php

namespace App\Actions\Fortify;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules, ProfileValidationRules;

    /**
     * Validate and create a newly registered user.
     *
     * @param  array<string, mixed>  $input
     */
    public function create(array $input): User
    {
        $role = $input['role'] ?? 'driver';

        // 1) Règles de validation
        $rules = [
            ...$this->profileRules(),
            'password' => $this->passwordRules(),
            'role'     => ['required', 'in:driver,owner'],
        ];

        if ($role === 'owner') {
            $rules['parking_photo'] = ['required', 'image', 'max:4096'];
        }

        $messages = [
            'parking_photo.required' => 'Please upload an image of your parking.',
            'parking_photo.image'    => 'The parking file must be a valid image (jpg, png, ...).',
            'parking_photo.max'      => 'The parking image must not be larger than 4MB.',
        ];

        Validator::make($input, $rules, $messages)->validate();

        // 2) Stocker la photo du parking (si owner)
        $parkingPhotoPath = null;
        if (
            $role === 'owner'
            && isset($input['parking_photo'])
            && $input['parking_photo']->isValid()
        ) {
            $parkingPhotoPath = $input['parking_photo']->store('parkings', 'public');
        }

        // 3) Vérification IA pour les owners
        $isParkingVerified = false;
        $status            = 'active';
        $modeCompte        = null;

        if ($role === 'owner') {
            $modeCompte = 'BASIC';

            if ($parkingPhotoPath) {
                $absolutePath = storage_path('app/public/' . $parkingPhotoPath);

                try {
                    $response = Http::timeout(30)->post('http://127.0.0.1:5000/api/is_parking', [
                        'image_path' => $absolutePath,
                    ]);

                    if ($response->successful()) {
                        $data = $response->json();

                        if (!empty($data['is_parking']) && $data['is_parking'] === true) {
                            $isParkingVerified = true;
                            $status            = 'active';
                        } else {
                            $isParkingVerified = false;
                        }
                    }
                } catch (\Throwable $e) {
                    $isParkingVerified = false;
                }

                // ══════════════════════════════════════════════
                // 🔥 BLOQUER L'INSCRIPTION SI NON VÉRIFIÉ
                // ══════════════════════════════════════════════
                if (!$isParkingVerified) {
                    // Supprimer la photo uploadée (nettoyage)
                    \Illuminate\Support\Facades\Storage::disk('public')->delete($parkingPhotoPath);

                    // Rejeter l'inscription avec un message d'erreur
                    throw ValidationException::withMessages([
                        'parking_photo' => 'The uploaded image was not recognized as a valid parking. Please upload a clear photo of your parking lot.',
                    ]);
                }
            } else {
                // Pas de photo → bloquer aussi
                throw ValidationException::withMessages([
                    'parking_photo' => 'A parking photo is required for owner registration.',
                ]);
            }
        }

        // 4) Création UNIQUEMENT si tout est OK
        return User::create([
            'name'                => $input['name'],
            'email'               => $input['email'],
            'password'            => $input['password'],
            'role'                => $role,
            'parking_photo_path'  => $parkingPhotoPath,
            'is_parking_verified' => $isParkingVerified, // toujours true ici
            'mode_compte'         => $modeCompte,
            'status'              => $status,            // toujours 'active' ici
        ]);
    }
}