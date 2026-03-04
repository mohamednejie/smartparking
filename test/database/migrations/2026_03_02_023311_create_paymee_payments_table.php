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
        Schema::create('paymee_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('token')->unique();
            $table->string('order_id')->nullable();
            $table->decimal('amount', 8, 2);
            $table->string('status')->default('pending'); // pending, paid, failed
            $table->unsignedBigInteger('transaction_id')->nullable();
            $table->decimal('received_amount', 8, 2)->nullable();
            $table->decimal('cost', 8, 2)->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('paymee_payments');
    }
};
