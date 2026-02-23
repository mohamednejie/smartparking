<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class PreventBackHistory
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Headers anti-cache TRÈS STRICTS
        $response->headers->set('Cache-Control', 'no-cache, no-store, max-age=0, must-revalidate, private, post-check=0, pre-check=0');
        $response->headers->set('Pragma', 'no-cache');
        $response->headers->set('Expires', 'Fri, 01 Jan 1990 00:00:00 GMT');
        $response->headers->set('Vary', '*');
        
        // Empêcher le stockage
        $response->headers->set('Surrogate-Control', 'no-store');

        return $response;
    }
}