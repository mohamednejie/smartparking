<?php

namespace App\Mail;

use App\Models\Reservation;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ReservationAutoCancelled extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Reservation $reservation
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '⚠️ Your Parking Reservation Has Been Cancelled',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.reservation.auto-cancelled',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}