<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Supprimer l'ancienne contrainte
        DB::statement('ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_status_check');

        // Créer la nouvelle contrainte avec TOUS les statuts du modèle
        DB::statement("
            ALTER TABLE reservations 
            ADD CONSTRAINT reservations_status_check 
            CHECK (status IN (
                'pending',
                'active',
                'completed',
                'awaiting_payment',
                'paid',
                'cancelled',
                'cancelled_user',
                'cancelled_auto'
            ))
        ");

        // Optionnel : Afficher un message de confirmation
        echo "✅ Contrainte 'reservations_status_check' mise à jour avec succès.\n";
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Supprimer la contrainte
        DB::statement('ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_status_check');

        // Restaurer l'ancienne contrainte (sans awaiting_payment et paid)
        DB::statement("
            ALTER TABLE reservations 
            ADD CONSTRAINT reservations_status_check 
            CHECK (status IN (
                'pending',
                'confirmed',
                'active',
                'completed',
                'cancelled_user',
                'cancelled_auto'
            ))
        ");

        echo "⚠️ Contrainte 'reservations_status_check' restaurée à l'ancienne version.\n";
    }
};