<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Reservation Cancelled</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #f1f5f9;
            color: #1e293b;
            padding: 32px 16px;
        }
        .wrapper { max-width: 560px; margin: 0 auto; }
        .brand { text-align: center; margin-bottom: 24px; }
        .brand-inner {
            display: inline-flex; align-items: center; gap: 10px;
        }
        .brand-icon {
            width: 40px; height: 40px;
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            border-radius: 10px; display: inline-flex;
            align-items: center; justify-content: center;
        }
        .brand-name { font-size: 20px; font-weight: 700; color: #1e293b; letter-spacing: -0.3px; }
        .card { background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
        .alert-banner {
            background: linear-gradient(135deg, #dc2626, #b91c1c);
            padding: 28px 32px; text-align: center;
        }
        .alert-icon {
            width: 56px; height: 56px; background: rgba(255,255,255,0.15);
            border-radius: 50%; margin: 0 auto 14px;
            display: flex; align-items: center; justify-content: center; font-size: 26px;
        }
        .alert-title { font-size: 20px; font-weight: 700; color: #ffffff; margin-bottom: 6px; }
        .alert-subtitle { font-size: 13px; color: rgba(255,255,255,0.80); }
        .body { padding: 28px 32px; }
        .greeting { font-size: 15px; font-weight: 600; color: #1e293b; margin-bottom: 10px; }
        .intro-text { font-size: 14px; color: #475569; line-height: 1.65; margin-bottom: 24px; }
        .ticket { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 24px; }
        .ticket-header {
            background: #1e293b; padding: 12px 18px;
            display: flex; align-items: center; justify-content: space-between;
        }
        .ticket-label { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.55); text-transform: uppercase; letter-spacing: 0.12em; }
        .ticket-id { font-size: 13px; font-weight: 700; color: #ffffff; }
        .ticket-body { padding: 18px; }
        .ticket-row {
            display: flex; align-items: flex-start; justify-content: space-between;
            padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px;
        }
        .ticket-row:last-child { border-bottom: none; }
        .ticket-key { color: #94a3b8; font-weight: 500; min-width: 130px; }
        .ticket-value { color: #1e293b; font-weight: 600; text-align: right; }
        .ticket-value.cancelled { color: #dc2626; }
        .why-box {
            background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px;
            padding: 16px 18px; margin-bottom: 24px;
            display: flex; gap: 12px; align-items: flex-start;
        }
        .why-icon { font-size: 18px; flex-shrink: 0; margin-top: 1px; }
        .why-title { font-size: 13px; font-weight: 600; color: #991b1b; margin-bottom: 4px; }
        .why-text { font-size: 12px; color: #b91c1c; line-height: 1.55; }
        .cta-wrapper { text-align: center; margin-bottom: 24px; }
        .cta-btn {
            display: inline-block;
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            color: #ffffff !important; text-decoration: none;
            font-size: 14px; font-weight: 600; padding: 13px 30px;
            border-radius: 8px; letter-spacing: 0.01em;
        }
        .divider { height: 1px; background: #f1f5f9; margin: 20px 0; }
        .tips-title { font-size: 12px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 10px; }
        .tips-list { list-style: none; margin-bottom: 24px; }
        .tips-list li { font-size: 13px; color: #64748b; padding: 5px 0 5px 20px; position: relative; line-height: 1.5; }
        .tips-list li::before { content: '✓'; position: absolute; left: 0; color: #22c55e; font-weight: 700; }
        .footer { text-align: center; padding: 20px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; }
        .footer p { font-size: 11px; color: #94a3b8; line-height: 1.6; }
        @media (max-width: 480px) {
            .body { padding: 20px 18px; }
            .alert-banner { padding: 22px 18px; }
            .ticket-body, .ticket-header { padding: 12px 14px; }
            .footer { padding: 16px 18px; }
        }
    </style>
</head>
<body>
<div class="wrapper">

    <!-- Brand -->
    <div class="brand">
        <div class="brand-inner">
            <span class="brand-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="3"/>
                    <path d="M9 17V9h3a3 3 0 0 1 0 6H9"/>
                </svg>
            </span>
            <span class="brand-name">ParkVision </span>
        </div>
    </div>

    <div class="card">

        <!-- Banner -->
        <div class="alert-banner">
            <div class="alert-icon">⚠️</div>
            <p class="alert-title">Reservation Automatically Cancelled</p>
            <p class="alert-subtitle">Your check-in window has expired</p>
        </div>

        <!-- Body -->
        <div class="body">

            <p class="greeting">Hello, {{ $reservation->driver?->name ?? 'Driver' }} 👋</p>

            <p class="intro-text">
                We're writing to let you know that your parking reservation at
                <strong>{{ $reservation->parking?->name ?? 'N/A' }}</strong>
                has been <strong>automatically cancelled</strong> because your vehicle was not
                detected at the entrance within the allowed check-in window.
            </p>

            <!-- Ticket block -->
            <div class="ticket">
                <div class="ticket-header">
                    <span class="ticket-label">Reservation Details</span>
                    <span class="ticket-id">#{{ str_pad($reservation->id, 3, '0', STR_PAD_LEFT) }}</span>
                </div>
                <div class="ticket-body">

                    <div class="ticket-row">
                        <span class="ticket-key">Parking</span>
                        <span class="ticket-value">{{ $reservation->parking?->name ?? '—' }}</span>
                    </div>

                    @if($reservation->parking?->address_label)
                    <div class="ticket-row">
                        <span class="ticket-key">Address</span>
                        <span class="ticket-value">{{ $reservation->parking->address_label }}</span>
                    </div>
                    @endif

                    <div class="ticket-row">
                        <span class="ticket-key">Vehicle plate</span>
                        <span class="ticket-value">
                            {{ $reservation->vehicle?->license_plate ?? '—' }}
                            @if($reservation->vehicle?->brand || $reservation->vehicle?->model)
                                <br><span style="font-weight:400;color:#64748b;font-size:12px;">
                                    {{ trim(($reservation->vehicle->brand ?? '') . ' ' . ($reservation->vehicle->model ?? '')) }}
                                </span>
                            @endif
                        </span>
                    </div>

                    <div class="ticket-row">
                        <span class="ticket-key">Reserved at</span>
                        <span class="ticket-value">
                            {{ optional($reservation->reserved_at)->format('d M Y • H:i') ?? '—' }}
                        </span>
                    </div>

                    <div class="ticket-row">
                        <span class="ticket-key">Check-in window</span>
                        <span class="ticket-value">
                            {{ $reservation->parking?->cancel_time_limit ?? '—' }} minutes
                        </span>
                    </div>

                    <div class="ticket-row">
                        <span class="ticket-key">Cancelled at</span>
                        <span class="ticket-value">
                            {{ now()->format('d M Y • H:i') }}
                        </span>
                    </div>

                    <div class="ticket-row">
                        <span class="ticket-key">Status</span>
                        <span class="ticket-value cancelled">Cancelled (auto)</span>
                    </div>

                </div>
            </div>

            <!-- Why box -->
            <div class="why-box">
                <span class="why-icon">⏱️</span>
                <div>
                    <p class="why-title">Why was my reservation cancelled?</p>
                    <p class="why-text">
                        Your reservation had a check-in window of
                        <strong>{{ $reservation->parking?->cancel_time_limit ?? 'N/A' }} minutes</strong>
                        from the moment of booking. Since no vehicle was detected at the entrance
                        camera within that window, the system automatically freed the spot for other drivers.
                    </p>
                </div>
            </div>

            <!-- CTA -->
            <div class="cta-wrapper">
                <a href="{{ config('app.url') }}/parkings/available" class="cta-btn">
                    🔍 Find &amp; Book Again
                </a>
            </div>

            <div class="divider"></div>

            <!-- Tips -->
            <p class="tips-title">Tips to avoid this next time</p>
            <ul class="tips-list">
                <li>Book closer to your planned arrival time to keep the window tight.</li>
                <li>Make sure your vehicle's license plate is saved correctly in your account.</li>
                <li>Drive to the entrance promptly — the camera detects your plate automatically.</li>
                <li>Double-check the parking's opening hours before confirming a booking.</li>
            </ul>

            <p style="font-size:13px;color:#94a3b8;line-height:1.6;">
                If you believe this cancellation was a mistake or have any questions,
                please contact our support and reference reservation
                <strong>#{{ str_pad($reservation->id, 3, '0', STR_PAD_LEFT) }}</strong>.
            </p>

        </div>

        <!-- Footer -->
        <div class="footer">
            <p>
                This is an automated notification from <strong>ParkVision </strong>.<br>
                Please do not reply to this email directly.<br>
                &copy; {{ date('Y') }} ParkVision. All rights reserved.
            </p>
        </div>

    </div>
</div>
</body>
</html>