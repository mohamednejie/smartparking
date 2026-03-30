<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ReservationController;

Route::post('/parking/entrance', [ReservationController::class, 'handleEntranceWebhook']);


Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');


