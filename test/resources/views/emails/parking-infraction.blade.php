<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <title>Infraction Parking — {{ $parkingName }}</title>
    <style>
        /* ── RESET ─────────────────────────────────────────────────────── */
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
            background-color: #0f1117;
            color: #e2e8f0;
            -webkit-font-smoothing: antialiased;
        }
        a { color: inherit; text-decoration: none; }
        img { display: block; max-width: 100%; border: 0; }

        /* ── WRAPPER ────────────────────────────────────────────────────── */
        .wrapper {
            width: 100%;
            background-color: #0f1117;
            padding: 40px 16px;
        }
        .container {
            max-width: 580px;
            margin: 0 auto;
            background-color: #1a1d27;
            border-radius: 16px;
            overflow: hidden;
            border: 1px solid #2d3148;
            box-shadow: 0 24px 64px rgba(0,0,0,0.5);
        }

        /* ── HEADER ─────────────────────────────────────────────────────── */
        .header {
            background: linear-gradient(135deg, #dc2626 0%, #b91c1c 50%, #7f1d1d 100%);
            padding: 36px 40px 32px;
            position: relative;
            overflow: hidden;
        }
        .header::before {
            content: '';
            position: absolute;
            top: -40px; right: -40px;
            width: 200px; height: 200px;
            background: rgba(255,255,255,0.04);
            border-radius: 50%;
        }
        .header::after {
            content: '';
            position: absolute;
            bottom: -60px; left: -20px;
            width: 160px; height: 160px;
            background: rgba(255,255,255,0.03);
            border-radius: 50%;
        }
        .header-icon {
            width: 56px; height: 56px;
            background: rgba(255,255,255,0.15);
            border-radius: 14px;
            display: flex; align-items: center; justify-content: center;
            margin-bottom: 20px;
            font-size: 28px;
            line-height: 1;
        }
        .header-label {
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: rgba(255,255,255,0.6);
            margin-bottom: 8px;
        }
        .header-title {
            font-size: 26px;
            font-weight: 800;
            color: #ffffff;
            line-height: 1.2;
            margin-bottom: 6px;
        }
        .header-subtitle {
            font-size: 14px;
            color: rgba(255,255,255,0.65);
        }

        /* ── BODY ───────────────────────────────────────────────────────── */
        .body { padding: 36px 40px; }

        .greeting {
            font-size: 15px;
            color: #94a3b8;
            margin-bottom: 24px;
            line-height: 1.6;
        }
        .greeting strong { color: #e2e8f0; }

        /* ── ALERT BANNER ───────────────────────────────────────────────── */
        .alert-banner {
            background: linear-gradient(135deg, rgba(220,38,38,0.12), rgba(185,28,28,0.08));
            border: 1px solid rgba(220,38,38,0.3);
            border-left: 4px solid #dc2626;
            border-radius: 10px;
            padding: 16px 20px;
            margin-bottom: 28px;
            display: flex;
            align-items: flex-start;
            gap: 14px;
        }
        .alert-icon { font-size: 22px; line-height: 1; flex-shrink: 0; margin-top: 1px; }
        .alert-text-title {
            font-size: 14px; font-weight: 700; color: #fca5a5; margin-bottom: 4px;
        }
        .alert-text-body {
            font-size: 13px; color: #94a3b8; line-height: 1.5;
        }

        /* ── INFO GRID ──────────────────────────────────────────────────── */
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 28px;
        }
        .info-card {
            background: #0f1117;
            border: 1px solid #2d3148;
            border-radius: 10px;
            padding: 16px;
        }
        .info-card-full {
            grid-column: 1 / -1;
        }
        .info-card-label {
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            color: #475569;
            margin-bottom: 6px;
        }
        .info-card-value {
            font-size: 20px;
            font-weight: 800;
            color: #f1f5f9;
            line-height: 1;
        }
        .info-card-value.danger { color: #f87171; }
        .info-card-value.warning { color: #fbbf24; }
        .info-card-sub {
            font-size: 11px;
            color: #64748b;
            margin-top: 4px;
        }

        /* ── DURATION BAR ───────────────────────────────────────────────── */
        .duration-bar-wrap {
            margin-top: 10px;
        }
        .duration-bar-bg {
            background: #1e2333;
            border-radius: 99px;
            height: 6px;
            overflow: hidden;
        }
        .duration-bar-fill {
            height: 100%;
            border-radius: 99px;
            background: linear-gradient(90deg, #f59e0b, #ef4444);
            width: {{ min(100, ($durationMinutes / 120) * 100) }}%;
        }

        /* ── PARKING DETAILS ────────────────────────────────────────────── */
        .section-title {
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            color: #475569;
            margin-bottom: 14px;
        }
        .detail-row {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 0;
            border-bottom: 1px solid #1e2333;
        }
        .detail-row:last-child { border-bottom: none; }
        .detail-icon {
            width: 32px; height: 32px;
            background: #1e2333;
            border-radius: 8px;
            display: flex; align-items: center; justify-content: center;
            font-size: 15px;
            flex-shrink: 0;
        }
        .detail-label { font-size: 12px; color: #64748b; }
        .detail-value { font-size: 14px; font-weight: 600; color: #cbd5e1; margin-top: 1px; }

        /* ── PHOTO ──────────────────────────────────────────────────────── */
        .photo-section {
            background: #0f1117;
            border: 1px solid #2d3148;
            border-radius: 10px;
            overflow: hidden;
            margin-bottom: 28px;
        }
        .photo-header {
            padding: 12px 16px;
            border-bottom: 1px solid #1e2333;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            color: #475569;
        }
        .photo-img {
            width: 100%;
            max-height: 240px;
            object-fit: cover;
        }
        .photo-placeholder {
            padding: 32px;
            text-align: center;
            color: #475569;
            font-size: 13px;
        }

        /* ── ACTION BUTTON ──────────────────────────────────────────────── */
        .action-wrap { text-align: center; margin-bottom: 28px; }
        .action-btn {
            display: inline-block;
            background: linear-gradient(135deg, #dc2626, #b91c1c);
            color: #ffffff !important;
            font-size: 14px;
            font-weight: 700;
            padding: 14px 32px;
            border-radius: 10px;
            letter-spacing: 0.02em;
        }

        /* ── FOOTER ─────────────────────────────────────────────────────── */
        .footer {
            background: #0f1117;
            border-top: 1px solid #1e2333;
            padding: 24px 40px;
            text-align: center;
        }
        .footer-logo {
            font-size: 16px;
            font-weight: 800;
            color: #334155;
            margin-bottom: 8px;
            letter-spacing: 0.05em;
            text-transform: uppercase;
        }
        .footer-text {
            font-size: 11px;
            color: #334155;
            line-height: 1.6;
        }
        .footer-text a { color: #475569; text-decoration: underline; }

        /* ── RESPONSIVE ─────────────────────────────────────────────────── */
        @media (max-width: 480px) {
            .header { padding: 28px 24px; }
            .body   { padding: 28px 24px; }
            .footer { padding: 20px 24px; }
            .info-grid { grid-template-columns: 1fr; }
            .info-card-full { grid-column: 1; }
            .header-title { font-size: 22px; }
        }
    </style>
</head>
<body>
<div class="wrapper">
<div class="container">

    <!-- ── HEADER ─────────────────────────────────────────────────────── -->
    <div class="header">
        <div class="header-icon">⚠️</div>
        <div class="header-label">Alerte de surveillance IA</div>
        <div class="header-title">Infraction détectée</div>
        <div class="header-subtitle">{{ $parkingName }} · {{ $parkingCity }}</div>
    </div>

    <!-- ── BODY ───────────────────────────────────────────────────────── -->
    <div class="body">

        <div class="greeting">
            Bonjour <strong>{{ $ownerName }}</strong>,<br/>
            Le système de surveillance IA de votre parking a détecté un véhicule
            stationné <strong>en dehors de sa place désignée</strong> ou
            <strong>depuis trop longtemps</strong>.
        </div>

        <!-- Alert banner -->
        <div class="alert-banner">
            <div class="alert-icon">🚨</div>
            <div>
                <div class="alert-text-title">Action recommandée</div>
                <div class="alert-text-body">
                    Vérifiez la situation via le tableau de bord ou rendez-vous sur place.
                    Cette alerte a été générée automatiquement par le module IA.
                </div>
            </div>
        </div>

        <!-- Info grid -->
        <div class="info-grid">

            <div class="info-card">
                <div class="info-card-label">Place N°</div>
                <div class="info-card-value danger">#{{ $slotNumber }}</div>
                <div class="info-card-sub">Slot détecté</div>
            </div>

            <div class="info-card">
                <div class="info-card-label">Durée</div>
                <div class="info-card-value warning">
                    @if($durationMinutes < 60)
                        {{ round($durationMinutes) }} min
                    @else
                        {{ floor($durationMinutes / 60) }}h {{ round(fmod($durationMinutes, 60)) }}min
                    @endif
                </div>
                <div class="info-card-sub">Stationnement continu</div>
                <div class="duration-bar-wrap">
                    <div class="duration-bar-bg">
                        <div class="duration-bar-fill"></div>
                    </div>
                </div>
            </div>

            <div class="info-card info-card-full">
                <div class="info-card-label">Détecté à</div>
                <div class="info-card-value" style="font-size:15px; font-weight:700;">
                    {{ $detectedAt }}
                </div>
                @if($vehicleDescription)
                    <div class="info-card-sub">{{ $vehicleDescription }}</div>
                @endif
            </div>

        </div>

        <!-- Parking details -->
        <div style="background:#0f1117; border:1px solid #2d3148; border-radius:10px; padding:20px; margin-bottom:28px;">
            <div class="section-title">📍 Infos parking</div>

            <div class="detail-row">
                <div class="detail-icon">🅿️</div>
                <div>
                    <div class="detail-label">Parking</div>
                    <div class="detail-value">{{ $parkingName }}</div>
                </div>
            </div>

            <div class="detail-row">
                <div class="detail-icon">📍</div>
                <div>
                    <div class="detail-label">Ville</div>
                    <div class="detail-value">{{ $parkingCity }}</div>
                </div>
            </div>

            <div class="detail-row">
                <div class="detail-icon">#️⃣</div>
                <div>
                    <div class="detail-label">Référence parking</div>
                    <div class="detail-value">P{{ $parkingId }}</div>
                </div>
            </div>
        </div>

        <!-- Photo si disponible -->
        @if($photoUrl)
        <div class="photo-section" style="margin-bottom:28px;">
            <div class="photo-header">📸 Capture IA — Place #{{ $slotNumber }}</div>
            <img src="{{ $photoUrl }}" alt="Capture infraction" class="photo-img"/>
        </div>
        @endif

        <!-- CTA -->
        <div class="action-wrap">
            <a href="{{ url('/parkings/' . $parkingId) }}" class="action-btn">
                🔍 &nbsp;Voir le tableau de bord
            </a>
        </div>

        <!-- Note technique -->
        <div style="background:rgba(99,102,241,0.06); border:1px solid rgba(99,102,241,0.15); border-radius:10px; padding:16px 18px;">
            <div style="font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#6366f1; margin-bottom:8px;">
                ℹ️ &nbsp;À propos de cette alerte
            </div>
            <div style="font-size:12px; color:#64748b; line-height:1.6;">
                Cette notification est générée automatiquement par le module d'analyse IA de votre parking.
                Les infractions sont détectées lorsqu'un véhicule occupe un slot non réservé ou dépasse
                la durée maximale autorisée. Aucune action manuelle n'est nécessaire si la situation
                a déjà été résolue.
            </div>
        </div>

    </div><!-- /.body -->

    <!-- ── FOOTER ─────────────────────────────────────────────────────── -->
    <div class="footer">
        <div class="footer-logo">🅿️ &nbsp;ParkingAI</div>
        <div class="footer-text">
            Système de surveillance intelligent · Notification automatique<br/>
            <a href="{{ url('/parkings/' . $parkingId) }}">Gérer ce parking</a>
            &nbsp;·&nbsp;
            <a href="{{ url('/settings/notifications') }}">Désactiver les alertes</a>
        </div>
    </div>

</div><!-- /.container -->
</div><!-- /.wrapper -->
</body>
</html>