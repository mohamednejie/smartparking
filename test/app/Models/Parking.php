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
        'city',
        'cancel_time_limit',
    ];
    protected function casts(): array
    {
        return [
            'latitude'       => 'decimal:7',
            'longitude'      => 'decimal:7',
            'price_per_hour' => 'decimal:2',
            'is_24h'         => 'boolean',
            'cancel_time_limit'  => 'integer',
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
    public function getAnnotatedFileUrlAttribute(): ?string
    {
        return $this->annotated_file_path
            ? asset('storage/' . $this->annotated_file_path)
            : null;
    }

    /**
     * Extrait la ville depuis address_label si city n'est pas défini
     */
    public function getCityNameAttribute(): ?string
    {
        if ($this->city) {
            return $this->city;
        }

        // Essayer d'extraire la ville depuis address_label
        // Format attendu: "Rue XYZ, Casablanca, Morocco" ou "Casablanca"
        if ($this->address_label) {
            $parts = explode(',', $this->address_label);
            if (count($parts) >= 2) {
                return trim($parts[count($parts) - 2]); // Avant-dernier élément
            }
            return trim($parts[0]);
        }

        return null;
    }

    /**
     * Format des horaires d'ouverture
     */
    public function getOpeningHoursAttribute(): string
    {
        if ($this->is_24h) {
            return '24/7';
        }

        if ($this->opening_time && $this->closing_time) {
            return "{$this->opening_time} - {$this->closing_time}";
        }

        return 'Not specified';
    }

    /**
     * Vérifie si le parking est ouvert maintenant
     */
    public function getIsOpenNowAttribute(): bool
    {
        if ($this->is_24h) {
            return true;
        }

        if (!$this->opening_time || !$this->closing_time) {
            return true; // Considéré ouvert si non spécifié
        }

        $now = now()->format('H:i');
        return $now >= $this->opening_time && $now <= $this->closing_time;
    }

    /**
     * Pourcentage d'occupation
     */
    public function getOccupancyPercentAttribute(): int
    {
        if ($this->total_spots <= 0) {
            return 0;
        }

        $occupied = $this->total_spots - $this->available_spots;
        return (int) round(($occupied / $this->total_spots) * 100);
    }

    // ══════════════════════════════════════════════════════════════════
    // SCOPES
    // ══════════════════════════════════════════════════════════════════

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeAvailable($query)
    {
        return $query->where('available_spots', '>', 0);
    }

    public function scopeInCity($query, string $city)
    {
        return $query->where(function ($q) use ($city) {
            $q->where('city', 'ILIKE', '%' . $city . '%')
              ->orWhere('address_label', 'ILIKE', '%' . $city . '%');
        });
    }

    public function scopePriceRange($query, ?float $min, ?float $max)
    {
        if ($min !== null) {
            $query->where('price_per_hour', '>=', $min);
        }
        if ($max !== null) {
            $query->where('price_per_hour', '<=', $max);
        }
        return $query;
    }
    public function getCancelTimeTextAttribute(): string
{
    return $this->cancel_time_limit . ' minutes before start';
}


public function reservations()
{
    return $this->hasMany(Reservation::class);
}

}