<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('reservations', function (Blueprint $table) {
            $table->id();

            // Driver
            $table->foreignId('user_id')
                ->constrained()        // table users
                ->cascadeOnDelete();

            // Parking
            $table->foreignId('parking_id')
                ->constrained()        // table parkings
                ->cascadeOnDelete();

            // Véhicule du driver
            $table->foreignId('vehicle_id')
                ->constrained()        // table vehicles
                ->cascadeOnDelete();

            // Statut de la réservation
            $table->enum('status', [
                'pending',        // réservée, en attente d'entrée dans le parking
                'active',         // driver est entré dans le parking
                'cancelled_auto', // annulée automatiquement (temps dépassé)
                'cancelled_user', // annulée par le driver
                'completed',      // terminée
            ])->default('pending');

            // Heure de réservation (now par défaut)
            $table->timestamp('reserved_at')->useCurrent();

            $table->timestamps(); // created_at, updated_at
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reservations');
    }
};