<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('parkings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');

            // Infos
            $table->string('name');
            $table->text('description')->nullable();

            // Localisation Maps
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->string('address_label')->nullable();

            // Capacité
            $table->integer('total_spots')->default(0);
            $table->integer('available_spots')->default(0);
            $table->integer('detected_cars')->default(0);

            // Tarification
            $table->decimal('price_per_hour', 8, 2)->default(0);

            // Horaires
            $table->time('opening_time')->nullable();
            $table->time('closing_time')->nullable();
            $table->boolean('is_24h')->default(false);

            // Photos
            $table->string('photo_path')->nullable();
            $table->string('annotated_file_path')->nullable(); // 👈 PREMIUM

            // Statut
            $table->enum('status', ['active', 'inactive'])->default('active');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('parkings');
    }
};