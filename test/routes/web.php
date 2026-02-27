<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Laravel\Fortify\Features;
use App\Http\Controllers\ParkingController;

// ✅ Page d'accueil → Welcome (si non connecté) / Dashboard (si connecté)
Route::get('/', function () {
    if (Auth::check()) {
        return redirect()->route('dashboard');
    }
    return Inertia::render('welcome' , [
        'ownerCount' => \App\Models\User::where('role', 'owner')->count(),
        'driverCount' => \App\Models\User::where('role', 'driver')->count(),
        'parkingCount' => \App\Models\Parking::count(),
    ]);  // ← Affiche welcome au lieu de rediriger vers login
})->name('home');

// Dashboard (protégé → si non connecté → redirige vers login automatiquement)
Route::get('dashboard', function () {
    return Inertia::render('dashboard');
})->middleware(['auth', 'verified', 'no.back'])->name('dashboard');

// Routes parkings (protégées)
Route::middleware(['auth', 'verified'])->group(function () {
    Route::post('parkings/{parking}/toggle-status', [ParkingController::class, 'toggleStatus'])
        ->name('parkings.toggle-status');
    Route::get('parkings/available', [ParkingController::class, 'available'])
        ->name('parkings.available');   
    Route::get('/parkings/suggestions', [ParkingController::class, 'suggestions'])
    ->name('parkings.suggestions');
    Route::resource('parkings', ParkingController::class);


});

require __DIR__.'/settings.php';