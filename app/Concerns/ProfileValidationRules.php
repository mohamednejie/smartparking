<?php

namespace App\Concerns;

use App\Models\User;
use Illuminate\Validation\Rule;

trait ProfileValidationRules
{
    /**
     * Get the validation rules used to validate user profiles.
     *
     * @return array<string, array<int, \Illuminate\Contracts\Validation\Rule|array<mixed>|string>>
     */
    protected function profileRules(?int $userId = null): array
    {
        return [
            'name'  => $this->nameRules(),
            'email' => $this->emailRules($userId),
        ];
    }

    /**
     * Règles pour le nom :
     * - requis
     * - chaîne max 255
     * - uniquement lettres, espaces et tirets (pas de chiffres)
     *
     * @return array<int, \Illuminate\Contracts\Validation\Rule|array<mixed>|string>
     */
    protected function nameRules(): array
    {
        return [
            'required',
            'string',
            'max:255',
            'regex:/^[\pL\s\-]+$/u', // Lettres, espaces, tirets uniquement
        ];
    }

    /**
     * Règles pour l'email :
     * - requis
     * - string max 255
     * - format email valide
     * - DOIT contenir un point après le @ (ex: utilisateur@domaine.com)
     * - unique dans la table users (avec ignore($userId) en cas de mise à jour)
     *
     * @return array<int, \Illuminate\Contracts\Validation\Rule|array<mixed>|string>
     */
    protected function emailRules(?int $userId = null): array
    {
        $uniqueRule = $userId === null
            ? Rule::unique(User::class)
            : Rule::unique(User::class)->ignore($userId);

        return [
            'required',
            'string',
            'max:255',
            'email:rfc',                      // validation email standard
            'regex:/^[^@\s]+@[^@\s]+\.[^@\s]+$/', // impose un point après le @
            $uniqueRule,
        ];
    }
}