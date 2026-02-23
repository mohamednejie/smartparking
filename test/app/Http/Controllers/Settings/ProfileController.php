<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileDeleteRequest;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Show the user's profile settings page.
     */
    public function edit(Request $request): Response
    {
        $user = $request->user();

        // URL publique de l'avatar (si défini)
        $avatarUrl = $user->avatar_path
            ? Storage::disk('public')->url($user->avatar_path)
            : null;

        return Inertia::render('settings/profile', [
            'mustVerifyEmail' => $user instanceof MustVerifyEmail,
            'status'          => $request->session()->get('status'),

            // Infos de profil à afficher dans le formulaire
            'avatarUrl'       => $avatarUrl,
            'profile'         => [
                'phone'        => $user->phone,
                'address'      => $user->address,
                'bio'          => $user->bio,
                'company_name' => $user->company_name,
                'website'      => $user->website,
            ],
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $user = $request->user();

        // 1) Récupérer les données validées (name, email, phone, bio, etc.)
        $data = $request->validated();

        // 2) Gérer la photo de profil (avatar) - PATH dans la BDD
        if ($request->hasFile('avatar') && $request->file('avatar')->isValid()) {
            // Stockage sur le disque 'public' dans le dossier 'avatars'
            // Chemin physique : storage/app/public/avatars/xxxx.png
            // Valeur en BDD  : avatars/xxxx.png
            $path = $request->file('avatar')->store('avatars', 'public');
            $user->avatar_path = $path;
        }

        // On enlève 'avatar' du tableau pour que fill() ne tente pas de l'affecter
        unset($data['avatar']);

        // 3) Mettre à jour les autres champs (name, email, phone, address, bio, etc.)
        $user->fill($data);

        // 4) Si l'email change, invalider la vérification
        if ($user->isDirty('email')) {
            $user->email_verified_at = null;
        }

        // 5) Sauvegarder
        $user->save();

        return to_route('profile.edit')->with('status', 'profile-updated');
    }

    /**
     * Delete the user's profile.
     */
    public function destroy(ProfileDeleteRequest $request): RedirectResponse
    {
        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/login');
    }
}