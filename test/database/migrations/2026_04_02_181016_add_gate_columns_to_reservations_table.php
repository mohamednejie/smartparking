<?php
// database/migrations/xxxx_add_gate_columns_to_reservations_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            // Temps prévu (défini par le driver lors de la réservation)
            $table->datetime('start_time')->nullable()->after('reserved_at');
            $table->datetime('end_time')->nullable()->after('start_time');

            // Temps réel (enregistré par Flask via la caméra gate)
            $table->datetime('actual_entry_at')->nullable()->after('end_time');
            $table->datetime('actual_exit_at')->nullable()->after('actual_entry_at');

            // Plaques détectées (pour traçabilité)
            $table->string('entry_plate')->nullable()->after('actual_exit_at');
            $table->string('exit_plate')->nullable()->after('entry_plate');

            // Paiement
            $table->decimal('total_price', 8, 2)->nullable()->after('exit_plate');
            $table->integer('duration_minutes')->nullable()->after('total_price');
            $table->datetime('paid_at')->nullable()->after('duration_minutes');

            // Photos captures
            $table->string('entry_photo')->nullable()->after('paid_at');
            $table->string('exit_photo')->nullable()->after('entry_photo');

            // Notes
            $table->text('notes')->nullable()->after('exit_photo');
        });
    }

    public function down(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            $table->dropColumn([
                'start_time', 'end_time',
                'actual_entry_at', 'actual_exit_at',
                'entry_plate', 'exit_plate',
                'total_price', 'duration_minutes', 'paid_at',
                'entry_photo', 'exit_photo',
                'notes',
            ]);
        });
    }
};