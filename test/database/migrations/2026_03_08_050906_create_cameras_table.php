<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cameras', function (Blueprint $table) {
            $table->id();
            
            // Clé étrangère vers le parking (si on supprime le parking, on supprime ses caméras)
            $table->foreignId('parking_id')->constrained()->cascadeOnDelete();
            
            // Nom ou identifiant de la caméra (ex: "Caméra Entrée Nord", "Cam Zone A")
            $table->string('name');
            
            // Type de caméra : 'gate' (entrée/sortie) ou 'zone' (à l'intérieur du parking)
            $table->enum('type', ['gate', 'zone']);
            
            // URL du flux vidéo (RTSP, HTTP, etc.)
            $table->string('stream_url');
            
            // Statut de la caméra (online, offline, maintenance)
            $table->enum('status', ['online', 'offline', 'maintenance'])->default('offline');
            
            // (Optionnel) Pour enregistrer la position exacte ou l'angle de vue de la caméra
            $table->string('location_details')->nullable(); 

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cameras');
    }
};