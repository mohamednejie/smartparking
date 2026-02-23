<?php

namespace App\Http\Requests\Settings;

use App\Concerns\ProfileValidationRules;
use Illuminate\Foundation\Http\FormRequest;

class ProfileUpdateRequest extends FormRequest
{
    use ProfileValidationRules;

    public function rules(): array
    {
        return [
            // name, email, etc. définis dans ton trait ProfileValidationRules
            ...$this->profileRules($this->user()->id),

            // Nouveau : avatar (on stocke juste le path, c'est toujours un fichier image)
            'avatar'       => ['nullable', 'image', 'max:4096'], // 4 Mo max

            // Champs de profil supplémentaires
            'phone'        => ['nullable', 'regex:/^[0-9]{8,20}$/'],
            'address'      => ['nullable', 'string', 'max:255'],
            'bio'          => ['nullable', 'string', 'max:1000'],
            'company_name' => ['nullable', 'string', 'max:255'],
            'website'      => ['nullable', 'string', 'max:255'],
        ];
    }
}