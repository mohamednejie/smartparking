import { Head, usePage, router } from '@inertiajs/react';
import { useEffect, useState, useMemo } from 'react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import {
    Building2, CheckCircle2, XCircle, DollarSign, CalendarCheck,
    Clock, Car, BarChart3, TrendingUp, TrendingDown, Minus,
    CircleParking, CreditCard, Ban, AlertTriangle,
    ArrowUpRight, ArrowDownRight, Zap, Activity, ParkingCircle,
    ChevronRight, RotateCcw, Timer, MapPin, Target, Receipt,
    Wallet, Star, Navigation, AlertCircle, ChevronDown, ChevronUp,
    Users, BadgeCheck, Gauge, History,
} from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Dashboard', href: '/dashboard' }];

// ── TYPES ─────────────────────────────────────────────────────────────────────
type DayData    = { date: string; label: string; count: number };
type MonthData  = { month: string; short: string; count: number; revenue: number };
type HourData   = { hour: number; label: string; count: number };
type DayOfWeek  = { day: string; count: number };
type TopParking = { id: number; name: string; city: string; revenue: number; reservations: number; total_spots: number };
type SpendMonth = { short: string; month: string; spent: number; count: number };
type UpcomingRes = { id: number; parking_name: string; parking_city: string; start_time: string; end_time: string; total_price: number; status: string; vehicle_plate: string };
type HistoryRes  = { id: number; parking_name: string; parking_city: string; start_time: string; end_time: string; total_price: number; status: string; duration_minutes: number | null; paid_at: string | null };
type CurrentRes  = { id: number; parking_name: string; parking_address: string; parking_city: string; start_time: string; end_time: string; total_price: number; status: string; vehicle_plate: string; duration_minutes: number | null };
type PendingPay  = { id: number; parking_name: string; total_price: number; duration_minutes: number | null };

type Props = {
    isOwner: boolean;
    // Owner
    totalParkings?: number; activeParkings?: number; inactiveParkings?: number;
    totalSpots?: number; availableSpots?: number; occupiedSpots?: number;
    occupancyRate?: number; rotationRate?: number;
    totalReservations?: number; pendingReservations?: number; activeReservations?: number;
    completedReservations?: number; awaitingPayment?: number; paidReservations?: number;
    cancelledAuto?: number; cancelledUser?: number; autoCancelRate?: number;
    totalRevenue?: number; revenueToday?: number; revenueWeek?: number;
    revenueMonth?: number; revenuePrevMonth?: number; growthMoM?: number;
    reservationsByDay?: DayData[]; reservationsByMonth?: MonthData[];
    peakHours?: HourData[]; peakDays?: DayOfWeek[]; topParkings?: TopParking[];
    // Driver
    driverTotal: number; driverActive: number; driverCompleted: number;
    driverPaid: number; driverPending: number; driverCancelled: number; driverAwaiting: number;
    driverTotalSpent: number; driverSpentMonth: number;
    avgDuration: number; punctualityRate: number; distinctVehicles: number;
    favParking: { name: string; city: string; count: number } | null;
    spendingByMonth: SpendMonth[];
    currentReservation: CurrentRes | null;
    upcomingReservations: UpcomingRes[];
    recentHistory: HistoryRes[];
    pendingPayments: PendingPay[];
};

// ── HELPERS ───────────────────────────────────────────────────────────────────
const fmt    = (n: number, dec = 2) => new Intl.NumberFormat('fr-TN', { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n);
const fmtInt = (n: number) => new Intl.NumberFormat('fr-TN').format(n);
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtTime = (d: string) => d ? new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—';
const fmtDuration = (min: number) => {
    if (!min) return '—';
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h}h${m > 0 ? m + 'm' : ''}` : `${m}m`;
};

function getStatusCfg(status: string) {
    switch (status) {
        case 'active':           return { label: 'En cours',        bg: 'bg-emerald-50 dark:bg-emerald-950/50', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' };
        case 'confirmed':        return { label: 'Confirmé',        bg: 'bg-emerald-50 dark:bg-emerald-950/50', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' };
        case 'pending':          return { label: 'En attente',      bg: 'bg-amber-50 dark:bg-amber-950/50',    text: 'text-amber-700 dark:text-amber-300',     dot: 'bg-amber-500'  };
        case 'paid':             return { label: 'Payée',           bg: 'bg-teal-50 dark:bg-teal-950/50',      text: 'text-teal-700 dark:text-teal-300',       dot: 'bg-teal-500'   };
        case 'completed':        return { label: 'Terminée',        bg: 'bg-blue-50 dark:bg-blue-950/50',      text: 'text-blue-700 dark:text-blue-300',       dot: 'bg-blue-500'   };
        case 'awaiting_payment': return { label: 'Paiement requis', bg: 'bg-rose-50 dark:bg-rose-950/50',      text: 'text-rose-700 dark:text-rose-300',       dot: 'bg-rose-500'   };
        case 'cancelled_auto':   return { label: 'Annulée (auto)',  bg: 'bg-red-50 dark:bg-red-950/50',        text: 'text-red-700 dark:text-red-300',         dot: 'bg-red-400'    };
        case 'cancelled_user':   return { label: 'Annulée',        bg: 'bg-slate-50 dark:bg-slate-900',       text: 'text-slate-600 dark:text-slate-400',     dot: 'bg-slate-400'  };
        default:                 return { label: status,            bg: 'bg-slate-50 dark:bg-slate-900',       text: 'text-slate-600 dark:text-slate-400',     dot: 'bg-slate-400'  };
    }
}

// ── MINI BAR CHART ────────────────────────────────────────────────────────────
function MiniBarChart({ data, color = '#6366f1', height = 60, showLabels = false }: {
    data: { label: string; value: number }[];
    color?: string; height?: number; showLabels?: boolean;
}) {
    const max = Math.max(...data.map(d => d.value), 1);
    return (
        <div className="w-full" style={{ height }}>
            <svg viewBox={`0 0 ${data.length * 12} ${height}`} className="w-full h-full" preserveAspectRatio="none">
                {data.map((d, i) => {
                    const barH = Math.max(2, (d.value / max) * (height - (showLabels ? 14 : 4)));
                    const x    = i * 12 + 1;
                    const y    = height - barH - (showLabels ? 14 : 2);
                    return (
                        <g key={i}>
                            <rect x={x} y={y} width={10} height={barH} rx="2" fill={color} opacity={d.value === 0 ? 0.15 : 0.85}/>
                            {showLabels && <text x={x+5} y={height-2} textAnchor="middle" fontSize="6" fill="#94a3b8">{d.label}</text>}
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}

// ── LINE CHART ────────────────────────────────────────────────────────────────
function LineChart({ data, color = '#6366f1', height = 80 }: {
    data: { label: string; value: number }[];
    color?: string; height?: number;
}) {
    const max = Math.max(...data.map(d => d.value), 1);
    const n   = data.length;
    if (n < 2) return null;
    const pts = data.map((d, i) => ({
        x: (i / (n - 1)) * 100,
        y: height - 4 - ((d.value / max) * (height - 8)),
    }));
    const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
    const area = `${path} L${pts[pts.length-1].x},${height} L${pts[0].x},${height} Z`;
    const id   = `g-${color.replace('#','')}`;
    return (
        <svg viewBox={`0 0 100 ${height}`} className="w-full" preserveAspectRatio="none" style={{ height }}>
            <defs>
                <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
                    <stop offset="100%" stopColor={color} stopOpacity="0"/>
                </linearGradient>
            </defs>
            <path d={area} fill={`url(#${id})`}/>
            <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="1.5" fill={color}/>)}
        </svg>
    );
}

// ── STAT CARD ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color = 'indigo', trend, trendLabel, onClick }: {
    icon: any; label: string; value: string | number; sub?: string;
    color?: string; trend?: number; trendLabel?: string; onClick?: () => void;
}) {
    const colors: Record<string, string> = {
        indigo:  'bg-indigo-50  dark:bg-indigo-950/40  text-indigo-600  dark:text-indigo-400',
        emerald: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
        rose:    'bg-rose-50    dark:bg-rose-950/40    text-rose-600    dark:text-rose-400',
        amber:   'bg-amber-50   dark:bg-amber-950/40   text-amber-600   dark:text-amber-400',
        blue:    'bg-blue-50    dark:bg-blue-950/40    text-blue-600    dark:text-blue-400',
        violet:  'bg-violet-50  dark:bg-violet-950/40  text-violet-600  dark:text-violet-400',
        teal:    'bg-teal-50    dark:bg-teal-950/40    text-teal-600    dark:text-teal-400',
        slate:   'bg-slate-50   dark:bg-slate-950/40   text-slate-600   dark:text-slate-400',
        orange:  'bg-orange-50  dark:bg-orange-950/40  text-orange-600  dark:text-orange-400',
        cyan:    'bg-cyan-50    dark:bg-cyan-950/40    text-cyan-600    dark:text-cyan-400',
    };
    return (
        <div onClick={onClick} className={`rounded-xl border bg-card p-4 shadow-sm flex flex-col gap-3 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}>
            <div className="flex items-start justify-between">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${colors[color] ?? colors.indigo}`}>
                    <Icon className="h-4 w-4"/>
                </div>
                {trend !== undefined && (
                    <div className={`flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-full ${trend > 0 ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' : trend < 0 ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/40' : 'text-slate-500 bg-slate-100 dark:bg-slate-800'}`}>
                        {trend > 0 ? <ArrowUpRight className="h-3 w-3"/> : trend < 0 ? <ArrowDownRight className="h-3 w-3"/> : <Minus className="h-3 w-3"/>}
                        {Math.abs(trend)}%
                    </div>
                )}
            </div>
            <div>
                <p className="text-2xl font-bold tracking-tight">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                {sub && <p className="text-[11px] text-muted-foreground/70 mt-0.5">{sub}</p>}
                {trendLabel && <p className="text-[11px] text-muted-foreground mt-0.5">{trendLabel}</p>}
            </div>
        </div>
    );
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
    const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
    return (
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }}/>
        </div>
    );
}

function SectionHeader({ icon: Icon, title, sub, badge }: { icon: any; title: string; sub?: string; badge?: React.ReactNode }) {
    return (
        <div className="flex items-center gap-3 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-4 w-4 text-primary"/>
            </div>
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <h2 className="font-bold text-base">{title}</h2>
                    {badge}
                </div>
                {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
            </div>
        </div>
    );
}

// ── COUNTDOWN ─────────────────────────────────────────────────────────────────
function Countdown({ endTime }: { endTime: string }) {
    const [remaining, setRemaining] = useState('');
    useEffect(() => {
        const calc = () => {
            const diff = new Date(endTime).getTime() - Date.now();
            if (diff <= 0) { setRemaining('Terminé'); return; }
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            setRemaining(`${h > 0 ? h + 'h ' : ''}${m}m ${s}s`);
        };
        calc();
        const iv = setInterval(calc, 1000);
        return () => clearInterval(iv);
    }, [endTime]);
    return <span className="font-mono font-bold text-emerald-600 text-sm">{remaining}</span>;
}

// ═════════════════════════════════════════════════════════════════════════════
// OWNER DASHBOARD
// ═════════════════════════════════════════════════════════════════════════════
function OwnerDashboard({ p }: { p: Props }) {
    const [activeChart, setActiveChart] = useState<'reservations' | 'revenue'>('reservations');

    const monthlyChartData = useMemo(() =>
        (p.reservationsByMonth ?? []).map(m => ({
            label: m.short,
            value: activeChart === 'reservations' ? m.count : m.revenue,
        })), [p.reservationsByMonth, activeChart]);

    const dailyChartData = useMemo(() =>
        (p.reservationsByDay ?? []).map(d => ({ label: d.label, value: d.count })),
        [p.reservationsByDay]);

    const peakHour = useMemo(() => p.peakHours?.length ? [...p.peakHours].sort((a, b) => b.count - a.count)[0] : null, [p.peakHours]);
    const peakDay  = useMemo(() => p.peakDays?.length  ? [...p.peakDays].sort((a, b) => b.count - a.count)[0]  : null, [p.peakDays]);
    const maxHourCount = useMemo(() => Math.max(...(p.peakHours ?? []).map(h => h.count), 1), [p.peakHours]);
    const maxDayCount  = useMemo(() => Math.max(...(p.peakDays  ?? []).map(d => d.count), 1), [p.peakDays]);

    return (
        <div className="space-y-8">

            {/* SECTION 1 — PARKINGS */}
            <section>
                <SectionHeader icon={Building2} title="Mes Parkings" sub="Vue globale du patrimoine"/>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <StatCard icon={Building2}     label="Total Parkings"     value={fmtInt(p.totalParkings!)}    color="indigo"  onClick={()=>router.visit('/parkings')}/>
                    <StatCard icon={CheckCircle2}  label="Parkings Actifs"    value={fmtInt(p.activeParkings!)}   color="emerald"/>
                    <StatCard icon={XCircle}       label="Inactifs"           value={fmtInt(p.inactiveParkings!)} color="rose"/>
                    <StatCard icon={CircleParking} label="Places Totales"     value={fmtInt(p.totalSpots!)}       color="blue"/>
                    <StatCard icon={CheckCircle2}  label="Places Disponibles" value={fmtInt(p.availableSpots!)}  color="teal"/>
                    <StatCard icon={Car}           label="Places Occupées"    value={fmtInt(p.occupiedSpots!)}   color="orange"/>
                </div>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-xl border bg-card p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-semibold">Taux d'Occupation Moyen</p>
                            <span className={`text-lg font-bold ${p.occupancyRate! >= 80 ? 'text-red-600' : p.occupancyRate! >= 50 ? 'text-amber-600' : 'text-emerald-600'}`}>{p.occupancyRate}%</span>
                        </div>
                        <ProgressBar value={p.occupiedSpots!} max={p.totalSpots!} color={p.occupancyRate! >= 80 ? 'bg-red-500' : p.occupancyRate! >= 50 ? 'bg-amber-500' : 'bg-emerald-500'}/>
                        <p className="text-xs text-muted-foreground mt-2">{p.occupiedSpots} / {p.totalSpots} places occupées</p>
                    </div>
                    <div className="rounded-xl border bg-card p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-semibold">Taux de Rotation</p>
                            <RotateCcw className="h-4 w-4 text-muted-foreground"/>
                        </div>
                        <p className="text-2xl font-bold">{p.rotationRate}</p>
                        <p className="text-xs text-muted-foreground mt-1">véhicules / jour / place</p>
                    </div>
                    {p.topParkings?.length! > 0 && (
                        <div className="rounded-xl border bg-card p-4 shadow-sm">
                            <p className="text-sm font-semibold mb-3">🏆 Top Parking</p>
                            <p className="font-bold text-base truncate">{p.topParkings![0].name}</p>
                            <p className="text-xs text-muted-foreground">{p.topParkings![0].city}</p>
                            <div className="flex items-center gap-4 mt-2">
                                <div><p className="text-sm font-bold text-emerald-600">{fmt(p.topParkings![0].revenue)} TND</p><p className="text-[10px] text-muted-foreground">Revenu</p></div>
                                <div><p className="text-sm font-bold text-blue-600">{fmtInt(p.topParkings![0].reservations)}</p><p className="text-[10px] text-muted-foreground">Réservations</p></div>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* SECTION 2 — RÉSERVATIONS */}
            <section>
                <SectionHeader icon={CalendarCheck} title="Réservations" sub="Suivi de l'activité"/>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-4">
                    <StatCard icon={CalendarCheck} label="Total"           value={fmtInt(p.totalReservations!)}     color="indigo"/>
                    <StatCard icon={Clock}         label="En attente"      value={fmtInt(p.pendingReservations!)}   color="amber"/>
                    <StatCard icon={Zap}           label="Actives"         value={fmtInt(p.activeReservations!)}    color="emerald"/>
                    <StatCard icon={CreditCard}    label="Att. paiement"   value={fmtInt(p.awaitingPayment!)}      color="rose"/>
                    <StatCard icon={CheckCircle2}  label="Payées"          value={fmtInt(p.paidReservations!)}     color="teal"/>
                    <StatCard icon={Timer}         label="Annul. auto"     value={fmtInt(p.cancelledAuto!)}        color="orange"/>
                    <StatCard icon={Ban}           label="Annul. user"     value={fmtInt(p.cancelledUser!)}        color="slate"/>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-xl border bg-card p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500"/> Taux d'Annulation Auto</p>
                            <span className={`text-base font-bold ${p.autoCancelRate! > 20 ? 'text-red-600' : p.autoCancelRate! > 10 ? 'text-amber-600' : 'text-emerald-600'}`}>{p.autoCancelRate}%</span>
                        </div>
                        <ProgressBar value={p.cancelledAuto!} max={Math.max(p.totalReservations!, 1)} color={p.autoCancelRate! > 20 ? 'bg-red-500' : p.autoCancelRate! > 10 ? 'bg-amber-500' : 'bg-emerald-500'}/>
                        <p className="text-xs text-muted-foreground mt-2">{p.cancelledAuto} réservations expirées avant arrivée</p>
                    </div>
                    <div className="rounded-xl border bg-card p-4 shadow-sm">
                        <p className="text-sm font-semibold mb-3">Répartition des Statuts</p>
                        {[
                            { label: 'Payées',   val: p.paidReservations!,                       color: 'bg-teal-500'    },
                            { label: 'Actives',  val: p.activeReservations!,                      color: 'bg-emerald-500' },
                            { label: 'Pending',  val: p.pendingReservations!,                     color: 'bg-amber-500'  },
                            { label: 'Annulées', val: (p.cancelledAuto! + p.cancelledUser!),      color: 'bg-red-400'    },
                        ].map(item => (
                            <div key={item.label} className="flex items-center gap-3 mb-2">
                                <span className="text-xs text-muted-foreground w-16 shrink-0">{item.label}</span>
                                <div className="flex-1"><ProgressBar value={item.val} max={Math.max(p.totalReservations!, 1)} color={item.color}/></div>
                                <span className="text-xs font-bold tabular-nums w-8 text-right">{item.val}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* SECTION 3 — REVENUS */}
            <section>
                <SectionHeader icon={DollarSign} title="Revenus" sub="Performance financière"/>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="col-span-2 sm:col-span-1 lg:col-span-2 rounded-xl border bg-gradient-to-br from-indigo-600 to-violet-600 p-4 shadow-md text-white">
                        <div className="flex items-center gap-2 mb-1 opacity-80"><DollarSign className="h-4 w-4"/><span className="text-xs font-medium uppercase tracking-wide">Revenu Total Lifetime</span></div>
                        <p className="text-3xl font-extrabold tracking-tight">{fmt(p.totalRevenue!)}</p>
                        <p className="text-sm opacity-70 mt-0.5">TND</p>
                    </div>
                    <StatCard icon={DollarSign} label="Revenu Aujourd'hui"   value={`${fmt(p.revenueToday!)} TND`}  color="emerald"/>
                    <StatCard icon={BarChart3}  label="Revenu cette Semaine" value={`${fmt(p.revenueWeek!)} TND`}   color="blue"/>
                    <StatCard icon={TrendingUp} label="Revenu ce Mois"       value={`${fmt(p.revenueMonth!)} TND`}  color="violet"/>
                    <StatCard icon={p.growthMoM! >= 0 ? TrendingUp : TrendingDown} label="Croissance MoM"
                        value={`${p.growthMoM! >= 0 ? '+' : ''}${p.growthMoM}%`}
                        sub={`Mois préc.: ${fmt(p.revenuePrevMonth!)} TND`}
                        color={p.growthMoM! >= 0 ? 'emerald' : 'rose'} trend={p.growthMoM}/>
                </div>
            </section>

            {/* SECTION 4 — CHARTS */}
            <section>
                <SectionHeader icon={BarChart3} title="Analyses Temporelles" sub="Tendances et patterns"/>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="rounded-xl border bg-card p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="font-semibold text-sm">Réservations — 30 derniers jours</p>
                                <p className="text-xs text-muted-foreground mt-0.5">Total: {fmtInt(dailyChartData.reduce((s,d)=>s+d.value,0))} réservations</p>
                            </div>
                            <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">Quotidien</div>
                        </div>
                        <LineChart data={dailyChartData} color="#6366f1" height={100}/>
                        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                            <span>{p.reservationsByDay?.[0]?.label ?? ''}</span>
                            <span>{p.reservationsByDay?.[14]?.label ?? ''}</span>
                            <span>{p.reservationsByDay?.[29]?.label ?? ''}</span>
                        </div>
                    </div>
                    <div className="rounded-xl border bg-card p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="font-semibold text-sm">Évolution Mensuelle — 12 mois</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{activeChart === 'reservations' ? 'Nombre de réservations' : 'Revenus en TND'}</p>
                            </div>
                            <div className="flex gap-1">
                                {(['reservations', 'revenue'] as const).map(tab => (
                                    <button key={tab} type="button" onClick={() => setActiveChart(tab)}
                                        className={`text-[10px] px-2 py-1 rounded-full font-medium transition-colors ${activeChart === tab ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                                        {tab === 'reservations' ? 'Rés.' : 'Rev.'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <MiniBarChart data={monthlyChartData} color={activeChart === 'reservations' ? '#6366f1' : '#10b981'} height={100} showLabels/>
                    </div>
                </div>
            </section>

            {/* SECTION 5 — PICS */}
            <section>
                <SectionHeader icon={Clock} title="Pics d'Affluence" sub="Optimisez la gestion du personnel"/>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="rounded-xl border bg-card p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <p className="font-semibold text-sm">Heures de Pointe</p>
                            {peakHour && (
                                <div className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 px-2 py-1 rounded-full text-xs font-semibold">
                                    <Zap className="h-3 w-3"/>{String(peakHour.hour).padStart(2,'0')}h — {fmtInt(peakHour.count)} entrées
                                </div>
                            )}
                        </div>
                        <div className="flex items-end gap-0.5 h-20">
                            {(p.peakHours ?? []).map((h) => {
                                const pct    = maxHourCount > 0 ? h.count / maxHourCount : 0;
                                const isPeak = h.count === maxHourCount && h.count > 0;
                                return (
                                    <div key={h.hour} className="flex-1 flex flex-col items-center gap-0.5">
                                        <div className="w-full rounded-sm transition-all" style={{ height: `${Math.max(2, pct * 72)}px`, background: isPeak ? '#6366f1' : h.count > 0 ? '#a5b4fc' : '#e2e8f0' }}/>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex justify-between text-[9px] text-muted-foreground mt-1"><span>00h</span><span>06h</span><span>12h</span><span>18h</span><span>23h</span></div>
                    </div>
                    <div className="rounded-xl border bg-card p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <p className="font-semibold text-sm">Jours de Pointe</p>
                            {peakDay && (
                                <div className="flex items-center gap-1.5 bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 px-2 py-1 rounded-full text-xs font-semibold">
                                    <Zap className="h-3 w-3"/>{peakDay.day} — {fmtInt(peakDay.count)} rés.
                                </div>
                            )}
                        </div>
                        <div className="space-y-2">
                            {(p.peakDays ?? []).map((d) => {
                                const pct    = maxDayCount > 0 ? Math.round((d.count / maxDayCount) * 100) : 0;
                                const isPeak = d.count === maxDayCount && d.count > 0;
                                return (
                                    <div key={d.day} className="flex items-center gap-3">
                                        <span className={`text-xs font-semibold w-7 shrink-0 ${isPeak ? 'text-violet-600 dark:text-violet-400' : 'text-muted-foreground'}`}>{d.day}</span>
                                        <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full transition-all ${isPeak ? 'bg-violet-500' : 'bg-violet-300 dark:bg-violet-700'}`} style={{ width: `${pct}%` }}/>
                                        </div>
                                        <span className="text-xs text-muted-foreground w-8 text-right tabular-nums">{fmtInt(d.count)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </section>

            {/* SECTION 6 — TOP PARKINGS */}
            {p.topParkings?.length! > 0 && (
                <section>
                    <SectionHeader icon={ParkingCircle} title="Top Parkings par Revenu" sub="Performance individuelle"/>
                    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 border-b">
                                <tr>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">#</th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Parking</th>
                                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Réservations</th>
                                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Revenu</th>
                                    <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden sm:table-cell">Places</th>
                                    <th className="px-4 py-3 text-center font-medium text-muted-foreground hidden sm:table-cell">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {p.topParkings!.map((pk, i) => (
                                    <tr key={pk.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-slate-100 text-slate-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-muted text-muted-foreground'}`}>{i+1}</span>
                                        </td>
                                        <td className="px-4 py-3"><p className="font-semibold">{pk.name}</p><p className="text-xs text-muted-foreground">{pk.city}</p></td>
                                        <td className="px-4 py-3 text-right tabular-nums">{fmtInt(pk.reservations)}</td>
                                        <td className="px-4 py-3 text-right"><span className="font-bold text-emerald-600">{fmt(pk.revenue)}</span><span className="text-xs text-muted-foreground ml-1">TND</span></td>
                                        <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell">{fmtInt(pk.total_spots)}</td>
                                        <td className="px-4 py-3 text-center hidden sm:table-cell">
                                            <button type="button" onClick={() => router.visit(`/parkings/${pk.id}`)} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                                                Voir <ChevronRight className="h-3 w-3"/>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}
        </div>
    );
}

// ═════════════════════════════════════════════════════════════════════════════
// DRIVER DASHBOARD
// ═════════════════════════════════════════════════════════════════════════════
function DriverDashboard({ p }: { p: Props }) {
    const [chartView, setChartView] = useState<'spent' | 'count'>('spent');
    const [showAllHistory, setShowAllHistory] = useState(false);

    const spendChartData = useMemo(() =>
        p.spendingByMonth.map(m => ({ label: m.short, value: chartView === 'spent' ? m.spent : m.count })),
        [p.spendingByMonth, chartView]);

    const displayedHistory = showAllHistory ? p.recentHistory : p.recentHistory.slice(0, 3);

    return (
        <div className="space-y-8">

            {/* ── PAIEMENTS EN ATTENTE (urgent) ── */}
            {p.pendingPayments.length > 0 && (
                <div className="rounded-2xl border-2 border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-4 shadow-md">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-900">
                            <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400"/>
                        </div>
                        <div>
                            <p className="font-bold text-rose-800 dark:text-rose-200">Paiement(s) en attente</p>
                            <p className="text-xs text-rose-600 dark:text-rose-400">Réglez depuis Mes Réservations pour libérer la barrière</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {p.pendingPayments.map(pay => (
                            <div key={pay.id} className="flex items-center justify-between rounded-xl bg-white dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 px-4 py-3">
                                <div>
                                    <p className="font-semibold text-sm text-rose-800 dark:text-rose-200">{pay.parking_name}</p>
                                    {pay.duration_minutes != null && <p className="text-xs text-rose-600 dark:text-rose-400">{fmtDuration(pay.duration_minutes)} de stationnement</p>}
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="font-bold text-rose-700 dark:text-rose-300 text-lg">{fmt(pay.total_price)} TND</span>
                                    <button onClick={() => router.visit('/reservations')}
                                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition-colors">
                                        Payer
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── RÉSERVATION EN COURS ── */}
            {p.currentReservation && p.currentReservation.status !== 'awaiting_payment' && (
                <section>
                    <SectionHeader icon={Zap} title="Stationnement en cours"
                        badge={<span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 rounded-full text-[10px] font-bold animate-pulse"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"/> LIVE</span>}/>
                    <div className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-5 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-emerald-600 flex-shrink-0"/>
                                    <div>
                                        <p className="font-bold text-lg">{p.currentReservation.parking_name}</p>
                                        <p className="text-xs text-muted-foreground">{p.currentReservation.parking_address} · {p.currentReservation.parking_city}</p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-3 text-sm">
                                    <div className="flex items-center gap-1.5 bg-white dark:bg-card rounded-lg px-3 py-1.5 border">
                                        <Clock className="h-3.5 w-3.5 text-muted-foreground"/>
                                        <span>{fmtTime(p.currentReservation.start_time)} → {fmtTime(p.currentReservation.end_time)}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-white dark:bg-card rounded-lg px-3 py-1.5 border">
                                        <Car className="h-3.5 w-3.5 text-muted-foreground"/>
                                        <span className="font-mono font-bold text-xs">{p.currentReservation.vehicle_plate}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="sm:text-right space-y-1">
                                <p className="text-xs text-muted-foreground">Temps restant</p>
                                <Countdown endTime={p.currentReservation.end_time}/>
                                <p className="text-sm font-bold text-emerald-600">{fmt(p.currentReservation.total_price)} TND</p>
                                <button onClick={() => router.visit('/reservations')}
                                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline mt-1">
                                    Voir détails <ChevronRight className="h-3 w-3"/>
                                </button>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* ── STATS CLÉS ── */}
            <section>
                <SectionHeader icon={BarChart3} title="Mes Statistiques" sub="Vue d'ensemble de mon activité"/>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <StatCard icon={CalendarCheck} label="Total Réservations"   value={fmtInt(p.driverTotal)}      color="indigo" onClick={() => router.visit('/reservations')}/>
                    <StatCard icon={Zap}           label="En cours"             value={fmtInt(p.driverActive)}     color="emerald"/>
                    <StatCard icon={CheckCircle2}  label="Terminées + Payées"   value={fmtInt(p.driverCompleted + p.driverPaid)} color="teal"/>
                    <StatCard icon={Clock}         label="En attente"           value={fmtInt(p.driverPending)}    color="amber"/>
                    <StatCard icon={Ban}           label="Annulées"             value={fmtInt(p.driverCancelled)}  color="rose"/>
                    <StatCard icon={CreditCard}    label="Att. paiement"        value={fmtInt(p.driverAwaiting)}   color="orange"/>
                </div>
            </section>

            {/* ── DÉPENSES + MÉTRIQUES ── */}
            <section>
                <SectionHeader icon={Wallet} title="Mes Dépenses" sub="Suivi financier"/>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Total lifetime */}
                    <div className="col-span-1 sm:col-span-2 lg:col-span-1 rounded-xl border bg-gradient-to-br from-blue-600 to-cyan-600 p-4 shadow-md text-white">
                        <div className="flex items-center gap-2 mb-1 opacity-80"><Wallet className="h-4 w-4"/><span className="text-xs font-medium uppercase tracking-wide">Total Dépensé</span></div>
                        <p className="text-3xl font-extrabold tracking-tight">{fmt(p.driverTotalSpent)}</p>
                        <p className="text-sm opacity-70 mt-0.5">TND (lifetime)</p>
                    </div>
                    <StatCard icon={Receipt}    label="Dépensé ce Mois"     value={`${fmt(p.driverSpentMonth)} TND`}  color="blue"/>
                    <StatCard icon={Timer}      label="Durée Moy. Session"  value={fmtDuration(p.avgDuration)}        color="violet" sub="par stationnement"/>
                    <StatCard icon={Target}     label="Taux de Ponctualité" value={`${p.punctualityRate}%`}           color={p.punctualityRate >= 80 ? 'emerald' : p.punctualityRate >= 50 ? 'amber' : 'rose'} sub="arrivée ±15 min"/>
                </div>

                {/* Métriques secondaires */}
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <StatCard icon={Car}  label="Véhicules utilisés"     value={fmtInt(p.distinctVehicles)}  color="slate" sub="plaques distinctes"/>
                    {p.favParking && (
                        <div className="rounded-xl border bg-card p-4 shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/40"><Star className="h-4 w-4 text-amber-600 dark:text-amber-400"/></div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Parking favori</p>
                                    <p className="font-bold text-sm truncate">{p.favParking.name}</p>
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground">{p.favParking.city} · <span className="font-semibold text-amber-600">{p.favParking.count} visite{p.favParking.count > 1 ? 's' : ''}</span></p>
                        </div>
                    )}

                    {/* Ponctualité visuelle */}
                    <div className="rounded-xl border bg-card p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-semibold flex items-center gap-2"><Gauge className="h-4 w-4 text-muted-foreground"/> Ponctualité</p>
                            <span className={`text-base font-bold ${p.punctualityRate >= 80 ? 'text-emerald-600' : p.punctualityRate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{p.punctualityRate}%</span>
                        </div>
                        <ProgressBar value={p.punctualityRate} max={100} color={p.punctualityRate >= 80 ? 'bg-emerald-500' : p.punctualityRate >= 50 ? 'bg-amber-500' : 'bg-red-500'}/>
                        <p className="text-xs text-muted-foreground mt-2">{p.punctualityRate >= 80 ? '✅ Excellente ponctualité' : p.punctualityRate >= 50 ? '🟡 Ponctualité correcte' : '⚠️ À améliorer'}</p>
                    </div>
                </div>
            </section>

            {/* ── GRAPHIQUE DÉPENSES ── */}
            <section>
                <SectionHeader icon={TrendingUp} title="Évolution — 6 derniers mois" sub="Dépenses et fréquence"/>
                <div className="rounded-xl border bg-card p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="font-semibold text-sm">{chartView === 'spent' ? 'Dépenses mensuelles' : 'Réservations mensuelles'}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {chartView === 'spent'
                                    ? `Total 6 mois : ${fmt(p.spendingByMonth.reduce((s,m)=>s+m.spent,0))} TND`
                                    : `Total 6 mois : ${p.spendingByMonth.reduce((s,m)=>s+m.count,0)} réservations`}
                            </p>
                        </div>
                        <div className="flex gap-1">
                            {(['spent', 'count'] as const).map(tab => (
                                <button key={tab} type="button" onClick={() => setChartView(tab)}
                                    className={`text-[10px] px-2 py-1 rounded-full font-medium transition-colors ${chartView === tab ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                                    {tab === 'spent' ? 'Dépenses' : 'Réservations'}
                                </button>
                            ))}
                        </div>
                    </div>
                    <MiniBarChart data={spendChartData} color={chartView === 'spent' ? '#3b82f6' : '#8b5cf6'} height={100} showLabels/>
                </div>
            </section>

            {/* ── PROCHAINES RÉSERVATIONS ── */}
            {p.upcomingReservations.length > 0 && (
                <section>
                    <SectionHeader icon={CalendarCheck} title="Prochaines Réservations" sub="À venir"/>
                    <div className="space-y-3">
                        {p.upcomingReservations.map(res => {
                            const sc = getStatusCfg(res.status);
                            return (
                                <div key={res.id} className="rounded-xl border bg-card p-4 shadow-sm flex items-center gap-4">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40 shrink-0">
                                        <Navigation className="h-5 w-5 text-indigo-600 dark:text-indigo-400"/>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold truncate">{res.parking_name}</p>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                                            <p className="text-xs text-muted-foreground">{fmtDate(res.start_time)}</p>
                                            <p className="text-xs text-muted-foreground">{fmtTime(res.start_time)} → {fmtTime(res.end_time)}</p>
                                            <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">{res.vehicle_plate}</span>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0 space-y-1">
                                        <p className="font-bold text-sm">{fmt(res.total_price)} TND</p>
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${sc.bg} ${sc.text}`}>
                                            <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`}/>{sc.label}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                        <button onClick={() => router.visit('/reservations')} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed text-sm text-muted-foreground hover:text-foreground hover:border-border transition-colors">
                            Voir toutes mes réservations <ChevronRight className="h-4 w-4"/>
                        </button>
                    </div>
                </section>
            )}

            {/* ── HISTORIQUE RÉCENT ── */}
            <section>
                <SectionHeader icon={History} title="Historique Récent" sub="Mes dernières sessions"/>
                <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 border-b">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Parking</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Date</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Durée</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Statut</th>
                                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Montant</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {displayedHistory.length === 0
                                ? <tr><td colSpan={5} className="py-10 text-center text-muted-foreground">Aucune réservation</td></tr>
                                : displayedHistory.map(r => {
                                    const sc = getStatusCfg(r.status);
                                    return (
                                        <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-3">
                                                <p className="font-semibold">{r.parking_name}</p>
                                                <p className="text-xs text-muted-foreground">{r.parking_city}</p>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">
                                                <p>{fmtDate(r.start_time)}</p>
                                                <p>{fmtTime(r.start_time)} → {fmtTime(r.end_time)}</p>
                                            </td>
                                            <td className="px-4 py-3 hidden md:table-cell">
                                                {r.duration_minutes != null
                                                    ? <span className="text-xs font-semibold text-blue-600">{fmtDuration(r.duration_minutes)}</span>
                                                    : <span className="text-xs text-muted-foreground">—</span>}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${sc.bg} ${sc.text}`}>
                                                    <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`}/>{sc.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <p className="font-bold tabular-nums">{fmt(r.total_price)} TND</p>
                                            </td>
                                        </tr>
                                    );
                                })
                            }
                        </tbody>
                    </table>
                    {p.recentHistory.length > 3 && (
                        <button onClick={() => setShowAllHistory(v => !v)}
                            className="w-full flex items-center justify-center gap-2 py-3 border-t text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors">
                            {showAllHistory ? <><ChevronUp className="h-3.5 w-3.5"/> Réduire</> : <><ChevronDown className="h-3.5 w-3.5"/> Voir plus ({p.recentHistory.length - 3} de plus)</>}
                        </button>
                    )}
                </div>
                <button onClick={() => router.visit('/reservations')} className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed text-sm text-muted-foreground hover:text-foreground hover:border-border transition-colors">
                    Voir tout l'historique <ChevronRight className="h-4 w-4"/>
                </button>
            </section>
        </div>
    );
}

// ═════════════════════════════════════════════════════════════════════════════
// PAGE PRINCIPALE
// ═════════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
    const { auth, ...props } = usePage().props as any;
    const p = props as Props;

    const [activeRole, setActiveRole] = useState<'owner' | 'driver'>(p.isOwner ? 'owner' : 'driver');

    useEffect(() => {
        if (!auth?.user) router.visit('/login', { replace: true });
    }, [auth]);

    if (!auth?.user) return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"/>
        </div>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard"/>
            <div className="mx-auto max-w-7xl p-4 sm:p-6 space-y-6">

                {/* ── HEADER ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Bonjour, <span className="font-medium text-foreground">{auth.user.name}</span> 👋
                        </p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        {p.driverActive > 0 && (
                            <div className="flex items-center gap-2 text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                                <Activity className="h-3.5 w-3.5 animate-pulse"/>
                                Stationnement en cours
                            </div>
                        )}
                        {p.pendingPayments.length > 0 && (
                            <div className="flex items-center gap-2 text-xs bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 px-3 py-1.5 rounded-full border border-rose-200 dark:border-rose-800">
                                <AlertCircle className="h-3.5 w-3.5"/>
                                {p.pendingPayments.length} paiement{p.pendingPayments.length > 1 ? 's' : ''} en attente
                            </div>
                        )}
                    </div>
                </div>

                {/* ── ROLE SWITCHER (uniquement si owner) ── */}
                

                {/* ── CONTENU ── */}
                <div className="animate-in fade-in duration-300">
                    {p.isOwner && activeRole === 'owner'
                        ? <OwnerDashboard p={p}/>
                        : <DriverDashboard p={p}/>
                    }
                </div>

                <div className="h-4"/>
            </div>
        </AppLayout>
    );
}