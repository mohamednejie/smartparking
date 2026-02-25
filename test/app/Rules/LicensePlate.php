<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class LicensePlate implements ValidationRule
{
    /**
     * Patterns de plaques valides par région
     */
    private array $patterns = [
        // France: AB-123-CD (strict: 2 lettres, 3 chiffres, 2 lettres)
        'france' => '/^[A-Z]{2}[-\s]?\d{3}[-\s]?[A-Z]{2}$/i',
        
        // Maroc: 12345-A-1 ou variations
        'maroc' => '/^(\d{3,5}[-\s|]?[A-Z]{1,2}[-\s|]?\d{1,2})|([A-Z]{2,3}[-\s]?\d{4,6})$/i',
        
        // Allemagne: M-AB-1234
        'allemagne' => '/^[A-Z]{1,3}[-\s][A-Z]{1,2}[-\s]\d{1,4}[EH]?$/i',
        
        // Espagne: 1234-ABC
        'espagne' => '/^\d{4}[-\s]?[A-Z]{3}$/i',
        
        // Italie: AB-123-CD
        'italie' => '/^[A-Z]{2}[-\s]?\d{3}[-\s]?[A-Z]{2}$/i',
        
        // Belgique: 1-ABC-123
        'belgique' => '/^[12][-\s]?[A-Z]{3}[-\s]?\d{3}$/i',
        
        // UK: AB12 CDE
        'uk' => '/^[A-Z]{2}\d{2}[-\s]?[A-Z]{3}$/i',
        
        // USA: Minimum 4 caractères alphanumériques
        'usa' => '/^[A-Z0-9]{4,8}$/i',
    ];

    /**
     * Caractères interdits
     */
    private array $forbiddenChars = ['@', '#', '$', '%', '&', '*', '(', ')', '!', '?', '+', '=', '<', '>', '/', '\\', '"', "'", ';', ':', ',', '.', '{', '}', '[', ']', '~', '`'];

    /**
     * Plaques interdites/réservées
     */
    private array $forbiddenPlates = [
        'TEST', 'FAKE', 'NULL', 'VOID', 'NONE', 'NA', 'ADMIN',
        'XXX', 'XXXX', '000', '0000', '00000', 'AAAA', 'ZZZZ',
        'POLICE', 'ARMY', 'GOVT', 'VIP', 'FBI', 'CIA',
    ];

    /**
     * Run the validation rule.
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $plate = strtoupper(trim($value));

        // 1. ✅ Vérifier la longueur minimale STRICTE
        if (strlen($plate) < 4) {
            $fail('The license plate must be at least 4 characters (too short).');
            return;
        }

        // 2. Vérifier la longueur maximale
        if (strlen($plate) > 20) {
            $fail('The license plate cannot exceed 20 characters.');
            return;
        }

        // 3. Vérifier les caractères interdits
        foreach ($this->forbiddenChars as $char) {
            if (str_contains($plate, $char)) {
                $fail('The license plate contains invalid characters (' . $char . ').');
                return;
            }
        }

        // 4. Vérifier les plaques interdites
        $cleanPlate = preg_replace('/[^A-Z0-9]/', '', $plate);
        foreach ($this->forbiddenPlates as $forbidden) {
            if ($cleanPlate === $forbidden) {
                $fail('This license plate is reserved and not allowed.');
                return;
            }
        }

        // 5. ✅ Vérifier qu'il y a AU MOINS une lettre ET un chiffre
        $hasLetter = preg_match('/[A-Z]/i', $plate);
        $hasNumber = preg_match('/[0-9]/', $plate);
        
        if (!$hasLetter || !$hasNumber) {
            $fail('The license plate must contain both letters AND numbers.');
            return;
        }

        // 6. ✅ Vérifier la longueur minimale SANS séparateurs
        if (strlen($cleanPlate) < 4) {
            $fail('The license plate must contain at least 4 alphanumeric characters.');
            return;
        }

        // 7. Vérifier contre les patterns connus
        $isValidFormat = false;
        foreach ($this->patterns as $pattern) {
            if (preg_match($pattern, $plate)) {
                $isValidFormat = true;
                break;
            }
        }

        // 8. Si aucun pattern ne correspond, vérifier le format générique STRICT
        if (!$isValidFormat) {
            // ✅ Format générique: au moins 2 lettres ET 2 chiffres minimum
            if (!preg_match('/^(?=.*[A-Z]{2,})(?=.*\d{2,})[A-Z0-9\-\s]{4,20}$/i', $plate)) {
                $fail('Invalid license plate format. Must have at least 2 letters and 2 numbers (e.g., AB-1234 or 12-AB-34).');
                return;
            }
        }

        // 9. Vérifier qu'il n'y a pas trop de caractères répétés
        if (preg_match('/(.)\1{4,}/', $cleanPlate)) {
            $fail('The license plate contains too many repeated characters.');
            return;
        }

        // 10. ✅ Vérifier qu'il n'y a pas que des lettres ou que des chiffres
        if (preg_match('/^[A-Z]+$/', $cleanPlate) || preg_match('/^\d+$/', $cleanPlate)) {
            $fail('The license plate must contain a mix of letters and numbers.');
            return;
        }
    }
}