<?php
// app/Models/Reservation.php

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
        'start_time',
        'end_time',
        'actual_entry_at',
        'actual_exit_at',
        'entry_plate',
        'exit_plate',
        'total_price',
        'duration_minutes',
        'paid_at',
        'entry_photo',
        'exit_photo',
        'notes',
    ];

    protected $casts = [
        'reserved_at'     => 'datetime',
        'start_time'      => 'datetime',
        'end_time'        => 'datetime',
        'actual_entry_at' => 'datetime',
        'actual_exit_at'  => 'datetime',
        'paid_at'         => 'datetime',
        'total_price'     => 'decimal:2',
    ];

    // ══════════════════════════════════════════════════════════════════════════
    // STATUTS
    // ══════════════════════════════════════════════════════════════════════════

    const STATUS_PENDING          = 'pending';
    const STATUS_ACTIVE           = 'active';
    const STATUS_COMPLETED        = 'completed';
    const STATUS_AWAITING_PAYMENT = 'awaiting_payment';
    const STATUS_PAID             = 'paid';
    const STATUS_CANCELLED_AUTO   = 'cancelled_auto';
    const STATUS_CANCELLED_USER   = 'cancelled_user';

    // ══════════════════════════════════════════════════════════════════════════
    // RELATIONS
    // ══════════════════════════════════════════════════════════════════════════

    public function driver()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function parking()
    {
        return $this->belongsTo(Parking::class);
    }

    public function vehicle()
    {
        return $this->belongsTo(Vehicle::class);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // SCOPES
    // ══════════════════════════════════════════════════════════════════════════

    public function scopePending($query)         { return $query->where('status', self::STATUS_PENDING); }
    public function scopeActive($query)          { return $query->where('status', self::STATUS_ACTIVE); }
    public function scopeCompleted($query)       { return $query->where('status', self::STATUS_COMPLETED); }
    public function scopeAwaitingPayment($query) { return $query->where('status', self::STATUS_AWAITING_PAYMENT); }
    public function scopePaid($query)            { return $query->where('status', self::STATUS_PAID); }

    // ══════════════════════════════════════════════════════════════════════════
    // HELPERS - CALCUL PRIX CORRIGÉ
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * ✅ Calcule le prix total basé sur la durée réelle en MINUTES.
     * Formule : (prix_par_heure / 60) × durée_minutes
     */
    public function calculatePrice(): float
    {
        if (!$this->parking) {
            return 0;
        }

        $pricePerHour = (float) $this->parking->price_per_hour;
        
        // Si pas encore sorti, utiliser durée prévue
        if (!$this->actual_entry_at || !$this->actual_exit_at) {
            $minutes = $this->duration_minutes ?? 60;
        } else {
            // Utiliser durée réelle
            $minutes = $this->actual_entry_at->diffInMinutes($this->actual_exit_at);
        }

        // ✅ CORRECTION : Prix par minute = prix_par_heure / 60
        $pricePerMinute = $pricePerHour / 60;
        
        return round($pricePerMinute * $minutes, 2);
    }

    /**
     * ✅ Durée réelle en minutes (entrée → sortie).
     */
    public function getRealDurationMinutesAttribute(): ?int
    {
        if (!$this->actual_entry_at || !$this->actual_exit_at) {
            return null;
        }
        
        return max(0, (int) $this->actual_entry_at->diffInMinutes($this->actual_exit_at));
    }

    /**
     * Vérifie si la réservation est en retard.
     */
    public function isOvertime(): bool
    {
        return $this->status === self::STATUS_ACTIVE
            && $this->end_time
            && now()->isAfter($this->end_time);
    }

    /**
     * Vérifie si paiement nécessaire.
     */
    public function needsPayment(): bool
    {
        return in_array($this->status, [self::STATUS_COMPLETED, self::STATUS_AWAITING_PAYMENT]);
    }

    /**
     * Temps restant en secondes pour annulation.
     */
    public function getRemainingSecondsAttribute(): ?int
    {
        if (!in_array($this->status, [self::STATUS_PENDING, self::STATUS_ACTIVE])) {
            return null;
        }
        
        $refTime = $this->reserved_at ?? $this->created_at;
        $cancelLimit = $this->parking?->cancel_time_limit ?? 15;
        $deadline = $refTime->copy()->addMinutes($cancelLimit);
        
        if (now()->isAfter($deadline)) {
            return 0;
        }
        
        return now()->diffInSeconds($deadline);
    }
}