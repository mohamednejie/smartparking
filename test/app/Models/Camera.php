<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Camera extends Model
{
    use HasFactory;

    protected $fillable = [
        'parking_id',
        'name',
        'type',        // 'gate' ou 'zone'
        'stream_url',
        'status',
        'location_details',
        'gate_mode',   // 'entrance' | 'exit'
    ];

    /**
     * Relation : Une caméra appartient à un seul parking
     */
    public function parking()
    {
        return $this->belongsTo(Parking::class);
    }
}