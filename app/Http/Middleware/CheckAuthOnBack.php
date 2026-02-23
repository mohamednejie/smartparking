<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class CheckAuthOnBack
{
    public function handle(Request $request, Closure $next): Response
    {
        // Si non connecté
        if (!Auth::check()) {
            // Forcer une redirection complète (pas Inertia)
            return redirect('/login');
        }

        $response = $next($request);

        // Headers anti-cache TRÈS stricts
        return $response->withHeaders([
            'Cache-Control' => 'no-cache, no-store, max-age=0, must-revalidate, private, post-check=0, pre-check=0',
            'Pragma' => 'no-cache',
            'Expires' => 'Sat, 01 Jan 2000 00:00:00 GMT',
            'Vary' => '*',
        ]);
    }
}