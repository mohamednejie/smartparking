<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ResetPasswordNotification extends Notification
{
    use Queueable;

    /**
     * Le token de réinitialisation
     */
    public $token;

    /**
     * Créer une nouvelle instance
     */
    public function __construct($token)
    {
        $this->token = $token;
    }

    /**
     * Canaux de notification
     */
    public function via($notifiable)
    {
        return ['mail'];
    }

    /**
     * Message email
     */
    public function toMail($notifiable)
    {
        $url = url(config('app.url') . route('password.reset', [
            'token' => $this->token,
            'email' => $notifiable->getEmailForPasswordReset(),
        ], false));

        return (new MailMessage)
            ->subject('🔐 Réinitialisation de mot de passe - ' . config('app.name'))
            ->greeting('Bonjour ' . $notifiable->name . ',')
            ->line('Vous recevez cet email car nous avons reçu une demande de réinitialisation de mot de passe pour votre compte.')
            ->action('Réinitialiser mon mot de passe', $url)
            ->line('Ce lien de réinitialisation expirera dans ' . config('auth.passwords.'.config('auth.defaults.passwords').'.expire') . ' minutes.')
            ->line('Si vous n\'avez pas demandé de réinitialisation de mot de passe, aucune action n\'est requise.')
            ->salutation('Cordialement,')
            ->salutation('L\'équipe ' . config('app.name'));
    }
}