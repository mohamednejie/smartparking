<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // rôle de l'utilisateur : conducteur ou responsable de parking
            $table->string('role')
                  ->default('driver')
                  ->after('password'); // ou after('email_verified_at') selon ta structure

            // photo de profil (pour les 2 rôles, optionnelle)
            $table->string('avatar_path')
                  ->nullable()
                  ->after('role');

            // champs spécifiques au responsable de parking (admin)
            $table->string('parking_photo_path')
                  ->nullable()
                  ->after('avatar_path'); // photo du parking fournie à la création de compte

            $table->boolean('is_parking_verified')
                  ->default(false)
                  ->after('parking_photo_path'); // validé par ton modèle IA

            // mode de compte du responsable : BASIC ou PRO
            $table->string('mode_compte')
                  ->nullable()
                  ->default('BASIC')
                  ->after('is_parking_verified');

            // statut du compte utilisateur : active / pending / rejected / suspended
            $table->string('status')
                  ->default('active')
                  ->after('mode_compte');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'role',
                'avatar_path',
                'parking_photo_path',
                'is_parking_verified',
                'mode_compte',
                'status',
            ]);
        });
    }
};