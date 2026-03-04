<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;

class CheckSubscriptionExpiration extends Command
{
    protected $signature = 'subscription:check';
    protected $description = 'Downgrade users with expired subscriptions to Basic';

    public function handle()
    {
        // Trouver les users PREMIUM dont la date est passée
        $expiredUsers = User::where('mode_compte', 'PREMIUM')
                            ->where('subscription_ends_at', '<', now())
                            ->get();

        foreach ($expiredUsers as $user) {
            $user->mode_compte = 'basic'; // ou 'BASIC' selon ta convention
            $user->subscription_plan = null;
            $user->subscription_ends_at = null;
            $user->save();
            
            // Optionnel : Envoyer un mail "Votre abo est fini"
            // Mail::to($user)->send(new SubscriptionExpiredMail($user));
            
            $this->info("User {$user->id} downgraded to Basic.");
        }

        $this->info(count($expiredUsers) . ' users downgraded.');
    }
}