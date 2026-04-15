<?php

namespace App\Http\Controllers;

use App\Models\Parking;
use App\Models\Reservation;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        /** @var \App\Models\User $user */
        $user = auth()->user();
        $isOwner = $user->parkings()->exists();

        // ════════════════════════════════════════════════════════════════════
        // OWNER DATA
        // ════════════════════════════════════════════════════════════════════
        $ownerData = [];

        if ($isOwner) {
            $parkings = $user->parkings()->with('cameras')->get();

            $totalParkings    = $parkings->count();
            $activeParkings   = $parkings->where('status', 'active')->count();
            $inactiveParkings = $parkings->where('status', '!=', 'active')->count();

            $totalSpots     = $parkings->sum('total_spots');
            $availableSpots = $parkings->sum('available_spots');
            $occupiedSpots  = $totalSpots - $availableSpots;
            $occupancyRate  = $totalSpots > 0 ? round(($occupiedSpots / $totalSpots) * 100, 1) : 0;

            $parkingIds = $parkings->pluck('id');

            $allReservations = Reservation::whereIn('parking_id', $parkingIds)->get();

            $totalReservations       = $allReservations->count();
            $pendingReservations     = $allReservations->where('status', 'pending')->count();
            $activeReservations      = $allReservations->where('status', 'active')->count();
            $completedReservations   = $allReservations->where('status', 'completed')->count();
            $awaitingPayment         = $allReservations->where('status', 'awaiting_payment')->count();
            $paidReservations        = $allReservations->where('status', 'paid')->count();
            $cancelledAuto           = $allReservations->where('status', 'cancelled_auto')->count();
            $cancelledUser           = $allReservations->where('status', 'cancelled_user')->count();

            $autoCancelRate = $totalReservations > 0
                ? round(($cancelledAuto / $totalReservations) * 100, 1)
                : 0;

            $paidQuery = Reservation::whereIn('parking_id', $parkingIds)->where('status', 'paid');

            $totalRevenue   = (float) (clone $paidQuery)->sum('total_price');
            $revenueToday   = (float) (clone $paidQuery)->whereDate('paid_at', today())->sum('total_price');
            $revenueWeek    = (float) (clone $paidQuery)->whereBetween('paid_at', [now()->startOfWeek(), now()->endOfWeek()])->sum('total_price');
            $revenueMonth   = (float) (clone $paidQuery)->whereMonth('paid_at', now()->month)->whereYear('paid_at', now()->year)->sum('total_price');

            $revenuePrevMonth = (float) (clone $paidQuery)
                ->whereMonth('paid_at', now()->subMonth()->month)
                ->whereYear('paid_at', now()->subMonth()->year)
                ->sum('total_price');

            $growthMoM = $revenuePrevMonth > 0
                ? round((($revenueMonth - $revenuePrevMonth) / $revenuePrevMonth) * 100, 1)
                : ($revenueMonth > 0 ? 100 : 0);

            $reservationsByDay = Reservation::whereIn('parking_id', $parkingIds)
                ->where('reserved_at', '>=', now()->subDays(29)->startOfDay())
                ->selectRaw("DATE(reserved_at) as date, COUNT(*) as count")
                ->groupBy('date')
                ->orderBy('date')
                ->get()
                ->map(fn($r) => ['date' => $r->date, 'count' => (int) $r->count])
                ->toArray();

            $dayMap = collect($reservationsByDay)->keyBy('date');
            $last30Days = [];
            for ($i = 29; $i >= 0; $i--) {
                $date = now()->subDays($i)->format('Y-m-d');
                $last30Days[] = [
                    'date'  => $date,
                    'label' => now()->subDays($i)->format('d/m'),
                    'count' => $dayMap[$date]['count'] ?? 0,
                ];
            }

            $reservationsByMonth = [];
            for ($i = 11; $i >= 0; $i--) {
                $month = now()->subMonths($i);
                $count = Reservation::whereIn('parking_id', $parkingIds)
                    ->whereMonth('reserved_at', $month->month)
                    ->whereYear('reserved_at', $month->year)
                    ->count();
                $revenue = (float) Reservation::whereIn('parking_id', $parkingIds)
                    ->where('status', 'paid')
                    ->whereMonth('paid_at', $month->month)
                    ->whereYear('paid_at', $month->year)
                    ->sum('total_price');

                $reservationsByMonth[] = [
                    'month'   => $month->format('M Y'),
                    'short'   => $month->format('M'),
                    'count'   => $count,
                    'revenue' => $revenue,
                ];
            }

            $peakHours = Reservation::whereIn('parking_id', $parkingIds)
                ->whereNotNull('actual_entry_at')
                ->selectRaw("EXTRACT(HOUR FROM actual_entry_at) as hour, COUNT(*) as count")
                ->groupBy('hour')
                ->orderByDesc('count')
                ->get()
                ->map(fn($r) => ['hour' => (int) $r->hour, 'count' => (int) $r->count]);

            $hourMap = $peakHours->keyBy('hour');
            $allHours = [];
            for ($h = 0; $h < 24; $h++) {
                $allHours[] = [
                    'hour'  => $h,
                    'label' => sprintf('%02d:00', $h),
                    'count' => $hourMap[$h]['count'] ?? 0,
                ];
            }

            $dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
            $peakDays = Reservation::whereIn('parking_id', $parkingIds)
                ->whereNotNull('reserved_at')
                ->selectRaw("EXTRACT(DOW FROM reserved_at) as dow, COUNT(*) as count")
                ->groupBy('dow')
                ->orderBy('dow')
                ->get();

            $dowMap = $peakDays->keyBy('dow');
            $allDays = [];
            for ($d = 0; $d < 7; $d++) {
                $allDays[] = [
                    'day'   => $dayNames[$d],
                    'count' => isset($dowMap[$d]) ? (int) $dowMap[$d]->count : 0,
                ];
            }

            $completedPaid = $allReservations->whereIn('status', ['paid', 'completed'])->count();
            $activeDays    = max(1, now()->diffInDays($parkings->min('created_at') ?? now()));
            $rotationRate  = $totalSpots > 0
                ? round($completedPaid / max(1, $activeDays) / $totalSpots, 2)
                : 0;

            $topParkings = Reservation::whereIn('parking_id', $parkingIds)
                ->where('status', 'paid')
                ->selectRaw('parking_id, SUM(total_price) as revenue, COUNT(*) as reservations')
                ->groupBy('parking_id')
                ->orderByDesc('revenue')
                ->limit(5)
                ->get()
                ->map(function ($row) use ($parkings) {
                    $parking = $parkings->firstWhere('id', $row->parking_id);
                    return [
                        'id'           => $row->parking_id,
                        'name'         => $parking?->name ?? 'Unknown',
                        'city'         => $parking?->city ?? '—',
                        'revenue'      => (float) $row->revenue,
                        'reservations' => (int) $row->reservations,
                        'total_spots'  => $parking?->total_spots ?? 0,
                    ];
                });

            $ownerData = [
                'totalParkings'         => $totalParkings,
                'activeParkings'        => $activeParkings,
                'inactiveParkings'      => $inactiveParkings,
                'totalSpots'            => $totalSpots,
                'availableSpots'        => $availableSpots,
                'occupiedSpots'         => $occupiedSpots,
                'occupancyRate'         => $occupancyRate,
                'rotationRate'          => $rotationRate,
                'totalReservations'     => $totalReservations,
                'pendingReservations'   => $pendingReservations,
                'activeReservations'    => $activeReservations,
                'completedReservations' => $completedReservations,
                'awaitingPayment'       => $awaitingPayment,
                'paidReservations'      => $paidReservations,
                'cancelledAuto'         => $cancelledAuto,
                'cancelledUser'         => $cancelledUser,
                'autoCancelRate'        => $autoCancelRate,
                'totalRevenue'          => $totalRevenue,
                'revenueToday'          => $revenueToday,
                'revenueWeek'           => $revenueWeek,
                'revenueMonth'          => $revenueMonth,
                'revenuePrevMonth'      => $revenuePrevMonth,
                'growthMoM'             => $growthMoM,
                'reservationsByDay'     => $last30Days,
                'reservationsByMonth'   => $reservationsByMonth,
                'peakHours'             => $allHours,
                'peakDays'              => $allDays,
                'topParkings'           => $topParkings,
            ];
        }

        // ════════════════════════════════════════════════════════════════════
        // DRIVER DATA
        // ════════════════════════════════════════════════════════════════════
        $driverReservations = Reservation::where('user_id', $user->id)
            ->with('parking')
            ->orderByDesc('created_at')
            ->get();

        $driverTotal       = $driverReservations->count();
        $driverActive      = $driverReservations->whereIn('status', ['active', 'confirmed'])->count();
        $driverCompleted   = $driverReservations->where('status', 'completed')->count();
        $driverPaid        = $driverReservations->where('status', 'paid')->count();
        $driverPending     = $driverReservations->where('status', 'pending')->count();
        $driverCancelled   = $driverReservations->whereIn('status', ['cancelled_auto', 'cancelled_user'])->count();
        $driverAwaiting    = $driverReservations->where('status', 'awaiting_payment')->count();

        $driverTotalSpent  = (float) $driverReservations->whereIn('status', ['paid', 'completed'])->sum('total_price');
        $driverSpentMonth  = (float) $driverReservations
            ->whereIn('status', ['paid', 'completed'])
            ->filter(fn($r) => $r->paid_at && \Carbon\Carbon::parse($r->paid_at)->isCurrentMonth())
            ->sum('total_price');

        // Durée moyenne de stationnement (en minutes)
        $avgDuration = $driverReservations
            ->whereIn('status', ['paid', 'completed'])
            ->whereNotNull('duration_minutes')
            ->avg('duration_minutes');

        // Taux de ponctualité (arrivée dans les 15 min après start_time)
        $reservationsWithEntry = $driverReservations->whereNotNull('actual_entry_at')->whereNotNull('start_time');
        $punctualCount = $reservationsWithEntry->filter(function ($r) {
            $start  = \Carbon\Carbon::parse($r->start_time);
            $actual = \Carbon\Carbon::parse($r->actual_entry_at);
            return abs($start->diffInMinutes($actual)) <= 15;
        })->count();
        $punctualityRate = $reservationsWithEntry->count() > 0
            ? round(($punctualCount / $reservationsWithEntry->count()) * 100, 1)
            : 0;

        // Véhicules distincts
        $distinctVehicles = $driverReservations->pluck('vehicle_plate')->unique()->filter()->count();

        // Parking le plus fréquenté
        $favParkingRow = $driverReservations
            ->whereNotNull('parking_id')
            ->groupBy('parking_id')
            ->map(fn($g) => ['parking' => $g->first()->parking, 'count' => $g->count()])
            ->sortByDesc('count')
            ->first();

        $favParking = $favParkingRow ? [
            'name'  => $favParkingRow['parking']?->name ?? '—',
            'city'  => $favParkingRow['parking']?->city ?? '—',
            'count' => $favParkingRow['count'],
        ] : null;

        // Dépenses sur 6 mois
        $spendingByMonth = [];
        for ($i = 5; $i >= 0; $i--) {
            $month = now()->subMonths($i);
            $spent = (float) $driverReservations
                ->whereIn('status', ['paid', 'completed'])
                ->filter(fn($r) => $r->paid_at
                    && \Carbon\Carbon::parse($r->paid_at)->month === (int)$month->month
                    && \Carbon\Carbon::parse($r->paid_at)->year  === (int)$month->year)
                ->sum('total_price');
            $count = $driverReservations
                ->filter(fn($r) => $r->created_at
                    && \Carbon\Carbon::parse($r->created_at)->month === (int)$month->month
                    && \Carbon\Carbon::parse($r->created_at)->year  === (int)$month->year)
                ->count();
            $spendingByMonth[] = [
                'short'   => $month->format('M'),
                'month'   => $month->format('M Y'),
                'spent'   => $spent,
                'count'   => $count,
            ];
        }

        // Réservation en cours
        $currentReservation = $driverReservations
            ->whereIn('status', ['active', 'confirmed', 'awaiting_payment'])
            ->first();

        // Prochaines réservations (pending, start_time > now)
        $upcomingReservations = $driverReservations
            ->where('status', 'pending')
            ->filter(fn($r) => $r->start_time && \Carbon\Carbon::parse($r->start_time)->isFuture())
            ->sortBy('start_time')
            ->take(3)
            ->values()
            ->map(fn($r) => [
                'id'             => $r->id,
                'parking_name'   => $r->parking?->name ?? '—',
                'parking_city'   => $r->parking?->city ?? '—',
                'start_time'     => $r->start_time,
                'end_time'       => $r->end_time,
                'total_price'    => (float) $r->total_price,
                'status'         => $r->status,
                'vehicle_plate'  => $r->vehicle_plate,
            ]);

        // Historique récent
        $recentHistory = $driverReservations
            ->take(5)
            ->map(fn($r) => [
                'id'           => $r->id,
                'parking_name' => $r->parking?->name ?? '—',
                'parking_city' => $r->parking?->city ?? '—',
                'start_time'   => $r->start_time,
                'end_time'     => $r->end_time,
                'total_price'  => (float) $r->total_price,
                'status'       => $r->status,
                'duration_minutes' => $r->duration_minutes,
                'paid_at'      => $r->paid_at,
            ]);

        // Paiements en attente
        $pendingPayments = $driverReservations
            ->where('status', 'awaiting_payment')
            ->map(fn($r) => [
                'id'           => $r->id,
                'parking_name' => $r->parking?->name ?? '—',
                'total_price'  => (float) $r->total_price,
                'duration_minutes' => $r->duration_minutes,
            ])
            ->values();

        // Format current reservation
        $currentRes = null;
        if ($currentReservation) {
            $currentRes = [
                'id'              => $currentReservation->id,
                'parking_name'    => $currentReservation->parking?->name ?? '—',
                'parking_address' => $currentReservation->parking?->address_label ?? '—',
                'parking_city'    => $currentReservation->parking?->city ?? '—',
                'start_time'      => $currentReservation->start_time,
                'end_time'        => $currentReservation->end_time,
                'total_price'     => (float) $currentReservation->total_price,
                'status'          => $currentReservation->status,
                'vehicle_plate'   => $currentReservation->vehicle_plate,
                'duration_minutes'=> $currentReservation->duration_minutes,
            ];
        }

        $driverData = [
            'driverTotal'          => $driverTotal,
            'driverActive'         => $driverActive,
            'driverCompleted'      => $driverCompleted,
            'driverPaid'           => $driverPaid,
            'driverPending'        => $driverPending,
            'driverCancelled'      => $driverCancelled,
            'driverAwaiting'       => $driverAwaiting,
            'driverTotalSpent'     => $driverTotalSpent,
            'driverSpentMonth'     => $driverSpentMonth,
            'avgDuration'          => round($avgDuration ?? 0, 1),
            'punctualityRate'      => $punctualityRate,
            'distinctVehicles'     => $distinctVehicles,
            'favParking'           => $favParking,
            'spendingByMonth'      => $spendingByMonth,
            'currentReservation'   => $currentRes,
            'upcomingReservations' => $upcomingReservations,
            'recentHistory'        => $recentHistory,
            'pendingPayments'      => $pendingPayments,
        ];

        return Inertia::render('dashboard', array_merge(
            ['isOwner' => $isOwner],
            $ownerData,
            $driverData,
        ));
    }
}