<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Illuminate\Contracts\Auth\MustVerifyEmail; // 👈 Ajouter
use Illuminate\Database\Eloquent\Relations\HasMany;



class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, TwoFactorAuthenticatable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'avatar_path',
        'parking_photo_path',
        'is_parking_verified',
        'mode_compte',
        'status',
        'phone',
        'address',
        'bio',
        'company_name',
        'website',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }
    public function parkings()
{
    return $this->hasMany(Parking::class);
}

public function isPremium(): bool
{
    return $this->mode_compte === 'PREMIUM';
}

public function isBasic(): bool
{
    return $this->mode_compte === 'BASIC';
}

public function canAddParking(): bool
{
    if ($this->role !== 'owner') return false;
    if ($this->isBasic() && $this->parkings()->count() >= 3) return false;
    return true;
}
public function isDriver(): bool
    {
        return $this->role === 'driver';
    }

public function isOwner(): bool
    {
        return $this->role === 'owner';
    }
 public function vehicles(): HasMany
    {
        return $this->hasMany(Vehicle::class);
    }

    /**
     * Get the primary vehicle
     */
public function primaryVehicle()
    {
        return $this->hasOne(Vehicle::class)->where('is_primary', true);
    }
   // Réservations faites par le driver
public function reservations()
{
    return $this->hasMany(Reservation::class);
}
}
