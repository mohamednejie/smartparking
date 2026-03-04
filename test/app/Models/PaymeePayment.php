<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class PaymeePayment extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'token',
        'order_id',
        'amount',
        'status',
        'transaction_id',
        'received_amount',
        'cost',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
