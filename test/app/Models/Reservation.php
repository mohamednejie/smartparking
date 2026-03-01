<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Reservation extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'parking_id',
        'vehicle_id',
        'status',
        'reserved_at',
        
    ];

    protected $casts = [
        'reserved_at' => 'datetime',
        'created_at'  => 'datetime',
    ];

    // Driver
    public function driver()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    // Parking
    public function parking()
    {
        return $this->belongsTo(Parking::class);
    }

    // Véhicule réservé
    public function vehicle()
    {
        return $this->belongsTo(Vehicle::class);
    }
}