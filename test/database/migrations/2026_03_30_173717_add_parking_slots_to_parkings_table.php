<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('parkings', function (Blueprint $table) {
            $table->json('parking_slots')->nullable()->after('annotated_file_path');
        });
    }

    public function down(): void
    {
        Schema::table('parkings', function (Blueprint $table) {
            $table->dropColumn('parking_slots');
        });
    }
};