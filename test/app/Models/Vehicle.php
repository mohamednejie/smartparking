<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Vehicle extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'license_plate',
        'brand',
        'model',
        'color',
        'type',
        'year',
        'is_primary',
    ];

    protected $casts = [
        'is_primary' => 'boolean',
        'year' => 'integer',
    ];

    // ══════════════════════════════════════════════
    // RELATIONS
    // ══════════════════════════════════════════════

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
    public function reservations()
    {
        return $this->hasMany(Reservation::class);
    }

    // ══════════════════════════════════════════════
    // SCOPES
    // ══════════════════════════════════════════════

    public function scopePrimary($query)
    {
        return $query->where('is_primary', true);
    }

    // ══════════════════════════════════════════════
    // ACCESSORS
    // ══════════════════════════════════════════════

    /**
     * Format: "Toyota Corolla (AB-123-CD)"
     */
    public function getDisplayNameAttribute(): string
    {
        $parts = array_filter([$this->brand, $this->model]);
        $name = implode(' ', $parts) ?: 'Vehicle';
        return "{$name} ({$this->license_plate})";
    }

    /**
     * Types de véhicules disponibles
     */
    public static function getTypes(): array
    {
        return [
            'sedan' => 'Sedan',
            'suv' => 'SUV',
            'hatchback' => 'Hatchback',
            'truck' => 'Truck',
            'van' => 'Van',
            'motorcycle' => 'Motorcycle',
            'electric' => 'Electric',
            'hybrid' => 'Hybrid',
            'other' => 'Other',
        ];
    }
}