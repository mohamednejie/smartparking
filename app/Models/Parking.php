<?php
// app/Models/Parking.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Parking extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'description',
        'latitude',
        'longitude',
        'address_label',
        'total_spots',
        'available_spots',
        'detected_cars',
        'price_per_hour',
        'opening_time',
        'closing_time',
        'is_24h',
        'photo_path',
        'annotated_file_path',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'latitude'       => 'decimal:7',
            'longitude'      => 'decimal:7',
            'price_per_hour' => 'decimal:2',
            'is_24h'         => 'boolean',
        ];
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function getPhotoUrlAttribute(): ?string
    {
        return $this->photo_path
            ? asset('storage/' . $this->photo_path)
            : null;
    }
}