<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vehicles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('license_plate', 20)->unique();
            $table->string('brand', 50)->nullable();        // Marque (Toyota, BMW, etc.)
            $table->string('model', 50)->nullable();        // Modèle (Corolla, X5, etc.)
            $table->string('color', 30)->nullable();        // Couleur
            $table->string('type', 30)->nullable();         // Type (Sedan, SUV, Truck, etc.)
            $table->year('year')->nullable();               // Année
            $table->boolean('is_primary')->default(false);  // Véhicule principal
            $table->timestamps();

            $table->index('user_id');
            $table->index('license_plate');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vehicles');
    }
};