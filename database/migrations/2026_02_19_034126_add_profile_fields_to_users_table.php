<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {

            // informations de profil communes
            $table->string('phone')->nullable()->after('avatar_path');
            $table->string('address')->nullable()->after('phone');
            $table->text('bio')->nullable()->after('address');

            // infos business pour le responsable de parking
            $table->string('company_name')->nullable()->after('bio');
            $table->string('website')->nullable()->after('company_name');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'phone',
                'address',
                'bio',
                'company_name',
                'website',
            ]);
        });
    }
};
