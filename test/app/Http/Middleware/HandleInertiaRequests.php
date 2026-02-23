<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            // Données partagées par Inertia (flash, etc. de base)
            ...parent::share($request),

            // Nom de l'application
            'name' => config('app.name'),

            // Utilisateur authentifié
            'auth' => [
                'user' => $user ? [
                    'id'    => $user->id,
                    'name'  => $user->name,
                    'email' => $user->email,
                    'role'  => $user->role,

                    // Avatar : URL publique à partir du path stocké en BDD
                    // Ex. avatar_path = "avatars/xxx.png"
                    // URL = http://localhost:8000/storage/avatars/xxx.png
                    'avatar' => $user->avatar_path
                        ? asset('storage/'.$user->avatar_path)
                        : null,

                    // Champs de profil supplémentaires
                    'phone'        => $user->phone,
                    'address'      => $user->address,
                    'bio'          => $user->bio,
                    'company_name' => $user->company_name,
                    'website'      => $user->website,

                    // Champs liés à ton système de parking
                    'is_parking_verified' => $user->is_parking_verified,
                    'mode_compte'         => $user->mode_compte,
                    'status'              => $user->status,
                ] : null,
            ],

            // Flash messages (optionnel mais pratique dans le front)
            'flash' => [
                'status'  => fn () => $request->session()->get('status'),
                'success' => fn () => $request->session()->get('success'),
                'error'   => fn () => $request->session()->get('error'),
            ],

            // CSRF token
            '_token' => csrf_token(),

            // Timestamp (utile pour debug / cache front)
            '_timestamp' => now()->timestamp,

            // État du sidebar
            'sidebarOpen' => ! $request->hasCookie('sidebar_state')
                || $request->cookie('sidebar_state') === 'true',
        ];
    }
}