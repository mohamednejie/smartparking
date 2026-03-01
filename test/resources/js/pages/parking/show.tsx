// resources/js/pages/parking/show.tsx

import { Head, router } from '@inertiajs/react'
import { toast } from 'sonner'
import { useState, useMemo } from 'react'
import {
    MapPin,
    Car,
    Clock,
    Edit,
    ArrowLeft,
    Power,
    PowerOff,
    CalendarCheck,
    Navigation,
    Shield,
    Sparkles,
    Timer,
    CircleParking,
    BadgeCheck,
    AlertTriangle,
    ExternalLink,
    Users,
    Search,
    Filter,
    ChevronDown,
    ChevronUp,
    Calendar,
    Mail,
    CreditCard,
    Eye,
    ListFilter,
    TrendingUp,
    DollarSign,
    ClipboardList,
    X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import AppLayout from '@/layouts/app-layout'

type Reservation = {
    id: number
    user_name: string
    user_email: string
    vehicle_plate: string
    vehicle_brand: string
    vehicle_model: string
    start_time: string
    end_time: string
    status: string
    total_price: number
    created_at: string
    user_avatar?: string | null
}

type Props = {
    parking: {
        id: number
        name: string
        description: string | null
        address_label: string | null
        latitude: number
        longitude: number
        total_spots: number
        available_spots: number
        detected_cars: number
        price_per_hour: number
        is_24h: boolean
        opening_time: string | null
        closing_time: string | null
        status: string
        photo_url: string | null
        annotated_file_url: string | null
        photo_path: string | null
        annotated_file_path: string | null
        created_at: string
        city: string | null
        cancel_time_limit: number | null
    }
    isPremium: boolean
    isOwner: boolean
    reservations: Reservation[]
}

function isParkingOpenNow(parking: {
    is_24h: boolean
    opening_time: string | null
    closing_time: string | null
}) {
    if (parking.is_24h) return true
    if (!parking.opening_time || !parking.closing_time) return false
    const nowTime = new Date().toTimeString().slice(0, 5)
    return nowTime >= parking.opening_time && nowTime < parking.closing_time
}

function getOccupancyPercent(total: number, available: number) {
    if (total <= 0) return 0
    return Math.round(((total - available) / total) * 100)
}

function formatDateTime(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

function formatDateShort(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    })
}

function formatTime(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
    })
}

function getStatusConfig(status: string) {
    switch (status) {
        case 'confirmed':
        case 'active':
            return {
                label: 'Active',
                bg: 'bg-emerald-50 dark:bg-emerald-950',
                text: 'text-emerald-700 dark:text-emerald-300',
                ring: 'ring-emerald-200 dark:ring-emerald-800',
                dot: 'bg-emerald-500',
                icon: BadgeCheck,
            }
        case 'pending':
            return {
                label: 'Pending',
                bg: 'bg-amber-50 dark:bg-amber-950',
                text: 'text-amber-700 dark:text-amber-300',
                ring: 'ring-amber-200 dark:ring-amber-800',
                dot: 'bg-amber-500',
                icon: Clock,
            }
        case 'completed':
            return {
                label: 'Completed',
                bg: 'bg-blue-50 dark:bg-blue-950',
                text: 'text-blue-700 dark:text-blue-300',
                ring: 'ring-blue-200 dark:ring-blue-800',
                dot: 'bg-blue-500',
                icon: BadgeCheck,
            }
        case 'cancelled':
            return {
                label: 'Cancelled',
                bg: 'bg-red-50 dark:bg-red-950',
                text: 'text-red-700 dark:text-red-300',
                ring: 'ring-red-200 dark:ring-red-800',
                dot: 'bg-red-500',
                icon: X,
            }
        case 'expired':
            return {
                label: 'Expired',
                bg: 'bg-gray-50 dark:bg-gray-900',
                text: 'text-gray-600 dark:text-gray-400',
                ring: 'ring-gray-200 dark:ring-gray-700',
                dot: 'bg-gray-400',
                icon: Timer,
            }
        default:
            return {
                label: status,
                bg: 'bg-gray-50 dark:bg-gray-900',
                text: 'text-gray-600 dark:text-gray-400',
                ring: 'ring-gray-200 dark:ring-gray-700',
                dot: 'bg-gray-400',
                icon: Clock,
            }
    }
}

// ─── Reservation Status Filter Tabs ──────────────────
const STATUS_FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'pending', label: 'Pending' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
    { key: 'expired', label: 'Expired' },
]

export default function ShowParking({
    parking,
    isPremium,
    isOwner,
    reservations = [],
}: Props) {
    const lat = Number(parking.latitude)
    const lng = Number(parking.longitude)
    const price = Number(parking.price_per_hour)
    const isOpen = isParkingOpenNow(parking)
    const occupancy = getOccupancyPercent(
        parking.total_spots,
        parking.available_spots
    )

    // ─── Reservations State ──────────────
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [sortField, setSortField] = useState<
        'created_at' | 'start_time' | 'total_price'
    >('created_at')
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
    const [expandedRow, setExpandedRow] = useState<number | null>(null)

    // filtres date
    const [selectedDay, setSelectedDay] = useState<string>('')
    const [selectedMonth, setSelectedMonth] = useState<string>('')

    // pagination locale
    const [currentPage, setCurrentPage] = useState(1)
    const pageSize = 5

    // ─── Filtered & Sorted Reservations ──
    const filteredReservations = useMemo(() => {
        let result = [...reservations]

        if (statusFilter !== 'all') {
            result = result.filter((r) => r.status === statusFilter)
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase()
            result = result.filter(
                (r) =>
                    r.user_name.toLowerCase().includes(q) ||
                    r.user_email.toLowerCase().includes(q) ||
                    r.vehicle_plate.toLowerCase().includes(q) ||
                    r.vehicle_brand.toLowerCase().includes(q) ||
                    r.vehicle_model.toLowerCase().includes(q)
            )
        }

        // Filtre par jour (YYYY-MM-DD)
        if (selectedDay) {
            result = result.filter((r) => {
                const d = new Date(r.start_time)
                const isoDay = d.toISOString().slice(0, 10)
                return isoDay === selectedDay
            })
        }

        // Filtre par mois (YYYY-MM)
        if (selectedMonth) {
            result = result.filter((r) => {
                const d = new Date(r.start_time)
                const ym = `${d.getFullYear()}-${String(
                    d.getMonth() + 1
                ).padStart(2, '0')}`
                return ym === selectedMonth
            })
        }

        // Sort
        result.sort((a, b) => {
            let valA: any = a[sortField]
            let valB: any = b[sortField]

            if (sortField === 'total_price') {
                valA = Number(valA)
                valB = Number(valB)
            }

            if (valA < valB) return sortDir === 'asc' ? -1 : 1
            if (valA > valB) return sortDir === 'asc' ? 1 : -1
            return 0
        })

        return result
    }, [
        reservations,
        statusFilter,
        searchQuery,
        sortField,
        sortDir,
        selectedDay,
        selectedMonth,
    ])

    const reservationStats = useMemo(() => {
        const total = reservations.length
        const active = reservations.filter(
            (r) => r.status === 'active' || r.status === 'confirmed'
        ).length
        const pending = reservations.filter(
            (r) => r.status === 'pending'
        ).length
        const totalRevenue = reservations
            .filter((r) =>
                ['completed', 'active', 'confirmed'].includes(r.status)
            )
            .reduce((sum, r) => sum + Number(r.total_price), 0)

        return { total, active, pending, totalRevenue }
    }, [reservations])

    const toggleSort = (field: typeof sortField) => {
        if (sortField === field) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
        } else {
            setSortField(field)
            setSortDir('desc')
        }
    }

    const SortIcon = ({ field }: { field: typeof sortField }) => {
        if (sortField !== field)
            return <ChevronDown className="h-3 w-3 opacity-30" />
        return sortDir === 'asc' ? (
            <ChevronUp className="h-3 w-3" />
        ) : (
            <ChevronDown className="h-3 w-3" />
        )
    }

    const handleBookingClick = () => {
        if (parking.status !== 'active') {
            toast.error('This parking is not active.')
            return
        }
        if (!isOpen) {
            toast.error('This parking is currently closed.')
            return
        }
        if (parking.available_spots <= 0) {
            toast.error('No available spots.')
            return
        }
        router.visit(`/parkings/${parking.id}/reservations/create`)
    }

    const isBookableVisual =
        parking.status === 'active' && parking.available_spots > 0 && isOpen

    const totalFiltered = filteredReservations.length
    const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize))
    const paginatedReservations = useMemo(
        () =>
            filteredReservations.slice(
                (currentPage - 1) * pageSize,
                currentPage * pageSize
            ),
        [filteredReservations, currentPage]
    )

    return (
        <AppLayout
            breadcrumbs={[
                {
                    title: isOwner ? 'My Parkings' : 'Available Parkings',
                    href: isOwner ? '/parkings' : '/parkings/available',
                },
                { title: parking.name, href: `/parkings/${parking.id}` },
            ]}
        >
            <Head title={parking.name} />

            <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
                {/* ── Navigation ─────────────────────────── */}
                <div className="mb-6 flex items-center justify-between">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="group gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
                        onClick={() =>
                            router.visit(
                                isOwner ? '/parkings' : '/parkings/available'
                            )
                        }
                    >
                        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                        {isOwner ? 'My Parkings' : 'All Parkings'}
                    </Button>

                    {isOwner ? (
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className={`gap-1.5 transition-all ${
                                    parking.status === 'active'
                                        ? 'border-amber-200 text-amber-600 hover:border-amber-300 hover:bg-amber-50 dark:border-amber-800 dark:hover:bg-amber-950'
                                        : 'border-emerald-200 text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950'
                                }`}
                                onClick={() =>
                                    router.post(
                                        `/parkings/${parking.id}/toggle-status`
                                    )
                                }
                            >
                                {parking.status === 'active' ? (
                                    <>
                                        <PowerOff className="h-3.5 w-3.5" />
                                        Deactivate
                                    </>
                                ) : (
                                    <>
                                        <Power className="h-3.5 w-3.5" />
                                        Activate
                                    </>
                                )}
                            </Button>
                            <Button
                                size="sm"
                                className="gap-1.5 bg-foreground text-background shadow-lg shadow-foreground/10 hover:bg-foreground/90"
                                onClick={() =>
                                    router.visit(
                                        `/parkings/${parking.id}/edit`
                                    )
                                }
                            >
                                <Edit className="h-3.5 w-3.5" />
                                Edit
                            </Button>
                        </div>
                    ) : (
                        <Button
                            size="sm"
                            disabled={!isBookableVisual}
                            className={`gap-1.5 shadow-lg transition-all ${
                                isBookableVisual
                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-500/25 hover:from-blue-700 hover:to-indigo-700'
                                    : 'cursor-not-allowed bg-muted text-muted-foreground shadow-none'
                            }`}
                            onClick={handleBookingClick}
                        >
                            <CalendarCheck className="h-3.5 w-3.5" />
                            Book a Spot
                        </Button>
                    )}
                </div>

                 {/* ── Hero Section ────────────────────────── */}
                <div className="relative overflow-hidden rounded-2xl border bg-card shadow-sm">
                    <div className="relative aspect-[21/9] w-full overflow-hidden bg-muted">
                        {isPremium && parking.annotated_file_url ? (
                            <>
                                <img
                                    src={parking.annotated_file_url}
                                    alt={parking.name}
                                    className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                                />
                                <div className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1.5 text-xs font-bold text-white shadow-lg shadow-amber-500/30">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    AI Annotated
                                </div>
                            </>
                        ) : parking.photo_url ? (
                            <img
                                src={parking.photo_url}
                                alt={parking.name}
                                className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                                <div className="flex flex-col items-center gap-2 text-muted-foreground/50">
                                    <CircleParking className="h-16 w-16" />
                                    <span className="text-sm font-medium">No photo</span>
                                </div>
                            </div>
                        )}

                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 to-transparent" />

                        <div className="absolute inset-x-0 bottom-0 p-6">
                            <div className="flex items-end justify-between gap-4">
                                <div>
                                    <div className="mb-2 flex flex-wrap items-center gap-2">
                                        <span
                                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur-sm ${
                                                parking.status === 'active'
                                                    ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30'
                                                    : 'bg-red-500/20 text-red-300 ring-1 ring-red-500/30'
                                            }`}
                                        >
                                            <span
                                                className={`h-1.5 w-1.5 rounded-full ${
                                                    parking.status === 'active'
                                                        ? 'animate-pulse bg-emerald-400'
                                                        : 'bg-red-400'
                                                }`}
                                            />
                                            {parking.status === 'active' ? 'Active' : 'Maintenance'}
                                        </span>

                                        {parking.status === 'active' && (
                                            <span
                                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur-sm ${
                                                    isOpen
                                                        ? 'bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/30'
                                                        : 'bg-gray-500/20 text-gray-300 ring-1 ring-gray-500/30'
                                                }`}
                                            >
                                                <Clock className="h-3 w-3" />
                                                {isOpen ? 'Open Now' : 'Closed'}
                                            </span>
                                        )}
                                    </div>
                                    <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                                        {parking.name}
                                    </h1>
                                    {parking.address_label && (
                                        <p className="mt-1 flex items-center gap-1.5 text-sm text-white/70">
                                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                                            {parking.address_label}
                                        </p>
                                    )}
                                </div>
                                <div className="shrink-0 rounded-xl bg-white/10 px-4 py-3 text-center backdrop-blur-md ring-1 ring-white/20">
                                    <p className="text-2xl font-extrabold text-white">
                                        {isNaN(price) ? '0.00' : price.toFixed(2)}
                                    </p>
                                    <p className="text-[11px] font-medium uppercase tracking-wider text-white/60">
                                        TND / hour
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Stats Grid ─────────────────────────── */}
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="group relative overflow-hidden rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
                        <div className="absolute -top-4 -right-4 h-16 w-16 rounded-full bg-slate-500/5 transition-transform group-hover:scale-150" />
                        <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                            <CircleParking className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                        </div>
                        <p className="text-2xl font-bold tracking-tight">{parking.total_spots}</p>
                        <p className="text-xs font-medium text-muted-foreground">Total Spots</p>
                    </div>
                    <div className="group relative overflow-hidden rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
                        <div className="absolute -top-4 -right-4 h-16 w-16 rounded-full bg-blue-500/5 transition-transform group-hover:scale-150" />
                        <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950">
                            <Car className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <p className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
                            {parking.detected_cars}
                        </p>
                        <p className="text-xs font-medium text-muted-foreground">Detected Cars</p>
                    </div>
                    <div className="group relative overflow-hidden rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
                        <div
                            className={`absolute -top-4 -right-4 h-16 w-16 rounded-full transition-transform group-hover:scale-150 ${
                                parking.available_spots > 0 ? 'bg-emerald-500/5' : 'bg-red-500/5'
                            }`}
                        />
                        <div
                            className={`mb-2 flex h-9 w-9 items-center justify-center rounded-lg ${
                                parking.available_spots > 0
                                    ? 'bg-emerald-50 dark:bg-emerald-950'
                                    : 'bg-red-50 dark:bg-red-950'
                            }`}
                        >
                            <BadgeCheck
                                className={`h-4 w-4 ${
                                    parking.available_spots > 0
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-red-600 dark:text-red-400'
                                }`}
                            />
                        </div>
                        <p
                            className={`text-2xl font-bold tracking-tight ${
                                parking.available_spots > 0
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-red-600 dark:text-red-400'
                            }`}
                        >
                            {parking.available_spots}
                        </p>
                        <p className="text-xs font-medium text-muted-foreground">Available</p>
                    </div>
                    <div className="group relative overflow-hidden rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
                        <div className="absolute -top-4 -right-4 h-16 w-16 rounded-full bg-violet-500/5 transition-transform group-hover:scale-150" />
                        <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-950">
                            <Shield className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                        </div>
                        <p className="text-2xl font-bold tracking-tight text-violet-600 dark:text-violet-400">
                            {occupancy}%
                        </p>
                        <p className="text-xs font-medium text-muted-foreground">Occupancy</p>
                    </div>
                </div>

                {/* ── Occupancy Bar ───────────────────────── */}
                <div className="mt-4 rounded-xl border bg-card p-4 shadow-sm">
                    <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="font-medium text-muted-foreground">Occupancy Rate</span>
                        <span className="font-semibold">
                            {parking.total_spots - parking.available_spots} / {parking.total_spots} used
                        </span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                        <div
                            className={`h-full rounded-full transition-all duration-1000 ease-out ${
                                occupancy >= 90
                                    ? 'bg-gradient-to-r from-red-500 to-red-600'
                                    : occupancy >= 60
                                    ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                                    : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                            }`}
                            style={{ width: `${occupancy}%` }}
                        />
                    </div>
                </div>

                {/* ── Details Cards ───────────────────────── */}
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border bg-card p-5 shadow-sm">
                        <div className="mb-3 flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950">
                                <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h3 className="font-semibold">Schedule</h3>
                        </div>
                        <div className="space-y-2">
                            {parking.is_24h ? (
                                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                                    Open 24 hours · 7 days a week
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                                        <span className="text-muted-foreground">Opening</span>
                                        <span className="font-semibold">{parking.opening_time ?? '—'}</span>
                                    </div>
                                    <div className="flex justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                                        <span className="text-muted-foreground">Closing</span>
                                        <span className="font-semibold">{parking.closing_time ?? '—'}</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="rounded-xl border bg-card p-5 shadow-sm">
                        <div className="mb-3 flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-950">
                                <MapPin className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                            </div>
                            <h3 className="font-semibold">Location</h3>
                        </div>
                        <div className="space-y-2">
                            {parking.address_label && (
                                <p className="text-sm text-muted-foreground">{parking.address_label}</p>
                            )}
                            {parking.city && (
                                <div className="flex justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                                    <span className="text-muted-foreground">City</span>
                                    <span className="font-semibold">{parking.city}</span>
                                </div>
                            )}
                            <div className="flex justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                                <span className="text-muted-foreground">Coordinates</span>
                                <span className="font-mono text-xs font-semibold">
                                    {lat.toFixed(4)}, {lng.toFixed(4)}
                                </span>
                            </div>
                            <a
                                href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400"
                            >
                                <Navigation className="h-3.5 w-3.5" />
                                Get Directions
                                <ExternalLink className="h-3 w-3" />
                            </a>
                        </div>
                    </div>
                </div>

                {parking.description && (
                    <div className="mt-4 rounded-xl border bg-card p-5 shadow-sm">
                        <h3 className="mb-2 font-semibold">About this parking</h3>
                        <p className="text-sm leading-relaxed text-muted-foreground">{parking.description}</p>
                    </div>
                )}

                {parking.cancel_time_limit !== null && (
                    <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/50">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900">
                            <Timer className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                                Auto-cancellation Policy
                            </p>
                            <p className="mt-0.5 text-sm text-amber-700 dark:text-amber-300">
                                Reservations are automatically cancelled if the driver doesn&apos;t enter within{' '}
                                <strong>{parking.cancel_time_limit} minutes</strong>.
                            </p>
                        </div>
                    </div>
                )}

                {!isOwner && !isBookableVisual && (
                    <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/50">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900">
                            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-red-800 dark:text-red-200">
                                Booking Unavailable
                            </p>
                            <p className="mt-0.5 text-sm text-red-700 dark:text-red-300">
                                {parking.status !== 'active'
                                    ? 'This parking is under maintenance.'
                                    : !isOpen
                                    ? 'This parking is currently closed.'
                                    : 'No available spots.'}
                            </p>
                        </div>
                    </div>
                )}

                {/* ── Map ─────────────────────────────────── */}
                <div className="mt-6 overflow-hidden rounded-xl border shadow-sm">
                    <div className="flex items-center justify-between border-b bg-card px-4 py-3">
                        <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-semibold">Map View</span>
                        </div>
                        <a
                            href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                        >
                            Open in Maps
                            <ExternalLink className="h-3 w-3" />
                        </a>
                    </div>
                    <iframe
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.005},${lat - 0.005},${lng + 0.005},${lat + 0.005}&layer=mapnik&marker=${lat},${lng}`}
                        width="100%"
                        height="350"
                        className="border-0"
                        loading="lazy"
                    />
                </div>



                {/* ════════════════════════════════════════════════
                    ██  RESERVATIONS SECTION (OWNER ONLY)
                    ════════════════════════════════════════════════ */}
                {isOwner && (
                    <div className="mt-10">
                       
                        {/* Reservation Mini Stats */}
                       <div className="mb-6 flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25">
                                <ClipboardList className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold tracking-tight">
                                    Reservations
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    All bookings for this parking
                                </p>
                            </div>
                        </div>

                        {/* Reservation Mini Stats */}
                        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <div className="rounded-xl border bg-card p-4 shadow-sm">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950">
                                        <ClipboardList className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold">
                                            {reservationStats.total}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground">
                                            Total
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="rounded-xl border bg-card p-4 shadow-sm">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950">
                                        <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                            {reservationStats.active}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground">
                                            Active
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="rounded-xl border bg-card p-4 shadow-sm">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950">
                                        <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                                            {reservationStats.pending}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground">
                                            Pending
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="rounded-xl border bg-card p-4 shadow-sm">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 dark:bg-green-950">
                                        <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold text-green-600 dark:text-green-400">
                                            {reservationStats.totalRevenue.toFixed(
                                                2
                                            )}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground">
                                            Revenue (TND)
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Filters Bar */}
                        <div className="mb-4 rounded-xl border bg-card p-4 shadow-sm">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                {/* Search */}
                                <div className="relative flex-1 sm:max-w-xs">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder="Search name, email, plate..."
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value)
                                            setCurrentPage(1)
                                        }}
                                        className="h-9 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/20"
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => {
                                                setSearchQuery('')
                                                setCurrentPage(1)
                                            }}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 hover:bg-muted"
                                        >
                                            <X className="h-3.5 w-3.5 text-muted-foreground" />
                                        </button>
                                    )}
                                </div>

                                {/* Date filters + count */}
                                <div className="flex flex-wrap gap-3 items-center">
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs text-muted-foreground">
                                            Day
                                        </label>
                                        <input
                                            type="date"
                                            value={selectedDay}
                                            onChange={(e) => {
                                                setSelectedDay(e.target.value)
                                                setCurrentPage(1)
                                            }}
                                            className="h-8 rounded-md border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                                        />
                                        {selectedDay && (
                                            <button
                                                onClick={() => {
                                                    setSelectedDay('')
                                                    setCurrentPage(1)
                                                }}
                                                className="rounded p-0.5 hover:bg-muted"
                                            >
                                                <X className="h-3 w-3 text-muted-foreground" />
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs text-muted-foreground">
                                            Month
                                        </label>
                                        <input
                                            type="month"
                                            value={selectedMonth}
                                            onChange={(e) => {
                                                setSelectedMonth(
                                                    e.target.value
                                                )
                                                setCurrentPage(1)
                                            }}
                                            className="h-8 rounded-md border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                                        />
                                        {selectedMonth && (
                                            <button
                                                onClick={() => {
                                                    setSelectedMonth('')
                                                    setCurrentPage(1)
                                                }}
                                                className="rounded p-0.5 hover:bg-muted"
                                            >
                                                <X className="h-3 w-3 text-muted-foreground" />
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <ListFilter className="h-3.5 w-3.5" />
                                        {totalFiltered} of{' '}
                                        {reservations.length} reservations
                                    </div>
                                </div>
                            </div>

                            {/* Status Tabs */}
                            <div className="mt-3 flex flex-wrap gap-1.5">
                                {STATUS_FILTERS.map((sf) => {
                                    const count =
                                        sf.key === 'all'
                                            ? reservations.length
                                            : reservations.filter(
                                                  (r) =>
                                                      r.status === sf.key
                                              ).length

                                    if (sf.key !== 'all' && count === 0)
                                        return null

                                    return (
                                        <button
                                            key={sf.key}
                                            onClick={() => {
                                                setStatusFilter(sf.key)
                                                setCurrentPage(1)
                                            }}
                                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                                                statusFilter === sf.key
                                                    ? 'bg-foreground text-background shadow-sm'
                                                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                                            }`}
                                        >
                                            {sf.label}
                                            <span
                                                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                                                    statusFilter === sf.key
                                                        ? 'bg-background/20 text-background'
                                                        : 'bg-muted text-muted-foreground'
                                                }`}
                                            >
                                                {count}
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* ── Reservations Table (Desktop) ────── */}
                        <div className="hidden rounded-xl border bg-card shadow-sm sm:block">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/30">
                                            <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                                                Driver
                                            </th>
                                            <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                                                Vehicle
                                            </th>
                                            <th
                                                className="cursor-pointer px-4 py-3 text-left font-semibold text-muted-foreground transition-colors hover:text-foreground"
                                                onClick={() =>
                                                    toggleSort('start_time')
                                                }
                                            >
                                                <span className="inline-flex items-center gap-1">
                                                    Schedule
                                                    <SortIcon field="start_time" />
                                                </span>
                                            </th>
                                            <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                                                Status
                                            </th>
                                            <th
                                                className="cursor-pointer px-4 py-3 text-right font-semibold text-muted-foreground transition-colors hover:text-foreground"
                                                onClick={() =>
                                                    toggleSort('total_price')
                                                }
                                            >
                                                <span className="inline-flex items-center gap-1">
                                                    Price
                                                    <SortIcon field="total_price" />
                                                </span>
                                            </th>
                                            <th
                                                className="cursor-pointer px-4 py-3 text-right font-semibold text-muted-foreground transition-colors hover:text-foreground"
                                                onClick={() =>
                                                    toggleSort('created_at')
                                                }
                                            >
                                                <span className="inline-flex items-center gap-1">
                                                    Booked
                                                    <SortIcon field="created_at" />
                                                </span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {paginatedReservations.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan={6}
                                                    className="px-4 py-12 text-center"
                                                >
                                                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                        <CalendarCheck className="h-10 w-10 opacity-30" />
                                                        <p className="font-medium">
                                                            No reservations
                                                            found
                                                        </p>
                                                        <p className="text-xs">
                                                            {searchQuery ||
                                                            statusFilter !==
                                                                'all' ||
                                                            selectedDay ||
                                                            selectedMonth
                                                                ? 'Try adjusting your filters'
                                                                : 'No one has booked yet'}
                                                        </p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            paginatedReservations.map((r) => {
                                                const sc = getStatusConfig(
                                                    r.status
                                                )
                                                const StatusIcon = sc.icon
                                                return (
                                                    <tr
                                                        key={r.id}
                                                        className="group transition-colors hover:bg-muted/30"
                                                    >
                                                        {/* Driver */}
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-3">
                                                                {r.user_avatar ? (
                                                                    <img
                                                                        src={r.user_avatar}
                                                                        alt={r.user_name}
                                                                        className="h-9 w-9 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                                                                    />
                                                                ) : (
                                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 text-sm font-bold text-indigo-700 dark:from-indigo-900 dark:to-purple-900 dark:text-indigo-300">
                                                                        {r.user_name
                                                                            .charAt(
                                                                                0
                                                                            )
                                                                            .toUpperCase()}
                                                                    </div>
                                                                )}
                                                                <div className="min-w-0">
                                                                    <p className="truncate font-medium">
                                                                        {
                                                                            r.user_name
                                                                        }
                                                                    </p>
                                                                    <p className="truncate text-xs text-muted-foreground">
                                                                        {
                                                                            r.user_email
                                                                        }
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {/* Vehicle */}
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted">
                                                                    <Car className="h-3.5 w-3.5 text-muted-foreground" />
                                                                </div>
                                                                <div>
                                                                    <p className="font-mono text-xs font-bold tracking-wider">
                                                                        {
                                                                            r.vehicle_plate
                                                                        }
                                                                    </p>
                                                                    {(r.vehicle_brand ||
                                                                        r.vehicle_model) && (
                                                                        <p className="text-[11px] text-muted-foreground">
                                                                            {
                                                                                r.vehicle_brand
                                                                            }{' '}
                                                                            {
                                                                                r.vehicle_model
                                                                            }
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {/* Schedule */}
                                                        <td className="px-4 py-3">
                                                            <div className="space-y-0.5">
                                                                <p className="text-xs font-medium">
                                                                    {formatDateShort(
                                                                        r.start_time
                                                                    )}
                                                                </p>
                                                                <p className="text-[11px] text-muted-foreground">
                                                                    {formatTime(
                                                                        r.start_time
                                                                    )}{' '}
                                                                    →{' '}
                                                                    {formatTime(
                                                                        r.end_time
                                                                    )}
                                                                </p>
                                                            </div>
                                                        </td>

                                                        {/* Status */}
                                                        <td className="px-4 py-3">
                                                            <span
                                                                className={`inline-flex items_center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${sc.bg} ${sc.text} ${sc.ring}`}
                                                            >
                                                                <StatusIcon className="h-3 w-3" />
                                                                {sc.label}
                                                            </span>
                                                        </td>

                                                        {/* Price */}
                                                        <td className="px-4 py-3 text-right">
                                                            <span className="font-semibold">
                                                                {Number(
                                                                    r.total_price
                                                                ).toFixed(2)}
                                                            </span>
                                                            <span className="ml-1 text-xs text-muted-foreground">
                                                                TND
                                                            </span>
                                                        </td>

                                                        {/* Booked */}
                                                        <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                                                            {formatDateTime(
                                                                r.created_at
                                                            )}
                                                        </td>
                                                    </tr>
                                                )
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination locale (desktop) */}
                            {totalFiltered > pageSize && (
                                <div className="flex items-center justify-end gap-2 px-4 py-3 border-t text-xs text-muted-foreground">
                                    <span>
                                        Page {currentPage} of {totalPages}
                                    </span>
                                    <div className="flex gap-1">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            disabled={currentPage <= 1}
                                            onClick={() =>
                                                setCurrentPage((p) =>
                                                    Math.max(1, p - 1)
                                                )
                                            }
                                            className="h-7 w-7"
                                        >
                                            <ChevronUp className="h-3 w-3 rotate-90" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            disabled={
                                                currentPage >= totalPages
                                            }
                                            onClick={() =>
                                                setCurrentPage((p) =>
                                                    Math.min(
                                                        totalPages,
                                                        p + 1
                                                    )
                                                )
                                            }
                                            className="h-7 w-7"
                                        >
                                            <ChevronDown className="h-3 w-3 rotate-90" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── Reservations Cards (Mobile) ─────── */}
                        <div className="space-y-3 sm:hidden">
                            {paginatedReservations.length === 0 ? (
                                <div className="flex flex-col items-center gap-2 rounded-xl border bg-card p-8 text-muted-foreground shadow-sm">
                                    <CalendarCheck className="h-10 w-10 opacity-30" />
                                    <p className="font-medium">
                                        No reservations found
                                    </p>
                                    <p className="text-xs">
                                        {searchQuery ||
                                        statusFilter !== 'all' ||
                                        selectedDay ||
                                        selectedMonth
                                            ? 'Try adjusting your filters'
                                            : 'No one has booked yet'}
                                    </p>
                                </div>
                            ) : (
                                paginatedReservations.map((r) => {
                                    const sc = getStatusConfig(r.status)
                                    const StatusIcon = sc.icon
                                    const isExpanded = expandedRow === r.id

                                    return (
                                        <div
                                            key={r.id}
                                            className="overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md"
                                        >
                                            {/* Card Header */}
                                            <button
                                                className="flex w-full items-center justify-between p-4 text-left"
                                                onClick={() =>
                                                    setExpandedRow(
                                                        isExpanded
                                                            ? null
                                                            : r.id
                                                    )
                                                }
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 text-sm font-bold text-indigo-700 dark:from-indigo-900 dark:to-purple-900 dark:text-indigo-300">
                                                        {r.user_name
                                                            .charAt(0)
                                                            .toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="truncate font-semibold">
                                                            {r.user_name}
                                                        </p>
                                                        <div className="flex items-center gap-2">
                                                            <span
                                                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${sc.bg} ${sc.text} ${sc.ring}`}
                                                            >
                                                                <StatusIcon className="h-2.5 w-2.5" />
                                                                {sc.label}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground">
                                                                {Number(
                                                                    r.total_price
                                                                ).toFixed(2)}{' '}
                                                                TND
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                {isExpanded ? (
                                                    <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                                                ) : (
                                                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                                                )}
                                            </button>

                                            {/* Card Details (expanded) */}
                                            {isExpanded && (
                                                <div className="border-t bg-muted/20 px-4 py-3 space-y-2.5">
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                                        <span className="text-muted-foreground">
                                                            {r.user_email}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <Car className="h-3.5 w-3.5 text-muted-foreground" />
                                                        <span className="font-mono text-xs font-bold tracking-wider">
                                                            {r.vehicle_plate}
                                                        </span>
                                                        {(r.vehicle_brand ||
                                                            r.vehicle_model) && (
                                                            <span className="text-xs text-muted-foreground">
                                                                ·{' '}
                                                                {
                                                                    r.vehicle_brand
                                                                }{' '}
                                                                {
                                                                    r.vehicle_model
                                                                }
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                                        <span>
                                                            {formatDateShort(
                                                                r.start_time
                                                            )}{' '}
                                                            <span className="text-muted-foreground">
                                                                {formatTime(
                                                                    r.start_time
                                                                )}{' '}
                                                                →{' '}
                                                                {formatTime(
                                                                    r.end_time
                                                                )}
                                                            </span>
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                                                        <span className="font-semibold">
                                                            {Number(
                                                                r.total_price
                                                            ).toFixed(2)}{' '}
                                                            TND
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <Clock className="h-3 w-3" />
                                                        Booked on{' '}
                                                        {formatDateTime(
                                                            r.created_at
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })
                            )}

                            {/* Pagination locale (mobile) */}
                            {totalFiltered > pageSize && (
                                <div className="flex items-center justify-center gap-2 pt-2 text-xs text-muted-foreground">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        disabled={currentPage <= 1}
                                        onClick={() =>
                                            setCurrentPage((p) =>
                                                Math.max(1, p - 1)
                                            )
                                        }
                                        className="h-7 w-7"
                                    >
                                        <ChevronUp className="h-3 w-3 rotate-90" />
                                    </Button>
                                    <span>
                                        Page {currentPage} of {totalPages}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        disabled={currentPage >= totalPages}
                                        onClick={() =>
                                            setCurrentPage((p) =>
                                                Math.min(
                                                    totalPages,
                                                    p + 1
                                                )
                                            )
                                        }
                                        className="h-7 w-7"
                                    >
                                        <ChevronDown className="h-3 w-3 rotate-90" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Bottom CTA (mobile, driver only) ───── */}
                {!isOwner && (
                    <div className="sticky bottom-4 z-10 mt-8 sm:hidden">
                        <Button
                            size="lg"
                            disabled={!isBookableVisual}
                            className={`w-full gap-2 rounded-xl py-6 text-base font-semibold shadow-2xl transition-all ${
                                isBookableVisual
                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-500/30 hover:from-blue-700 hover:to-indigo-700'
                                    : 'cursor-not-allowed bg-muted text-muted-foreground shadow-none'
                            }`}
                            onClick={handleBookingClick}
                        >
                            <CalendarCheck className="h-5 w-5" />
                            {isBookableVisual
                                ? `Book Now · ${
                                      isNaN(price) ? '0.00' : price.toFixed(2)
                                  } TND/h`
                                : 'Booking Unavailable'}
                        </Button>
                    </div>
                )}

                <div className="h-8" />
            </div>
        </AppLayout>
    )
}