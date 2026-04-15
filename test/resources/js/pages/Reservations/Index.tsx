// resources/js/pages/Reservations/Index.tsx

import { useEffect, useState } from 'react'
import { Head, router, usePage } from '@inertiajs/react'
import { toast } from 'sonner'
import AppLayout from '@/layouts/app-layout'
import {
  CarFront,
  MapPin,
  Clock,
  Ticket as TicketIcon,
  AlertCircle,
  XCircle,
  Timer,
  CreditCard,
  CheckCircle2,
  DoorOpen,
  Receipt,
  Archive,
  Calendar,
  TrendingUp,
  History,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import PaymentModal from '@/Components/PaymentModal'

// ─── TYPES ───────────────────────────────────────────────────────────────────

type Reservation = {
  id: number
  status: string
  reserved_at: string
  remaining_seconds: number | null
  parking_id: number
  total_price: number
  duration_minutes?: number | null
  exit_plate?: string | null
  actual_exit_at?: string | null
  paid_at?: string | null
  parking: {
    name: string
    address_label: string | null
    cancel_time_limit?: number | null
  }
  vehicle: {
    license_plate: string
    brand: string | null
    model: string | null
  }
}

type PageProps = {
  reservations?: Reservation[]
  flash?: {
    success?: string
    error?: string
  }
  errors?: Record<string, string>
}

// ─── STATUS CONFIG ────────────────────────────────────────────────────────────

const statusConfig: Record<
  string,
  { label: string; bg: string; text: string; dot: string; icon?: any }
> = {
  pending: {
    label: 'En attente',
    bg: 'bg-amber-500/10 border-amber-500/40',
    text: 'text-amber-200',
    dot: 'bg-amber-400',
    icon: Timer,
  },
  active: {
    label: 'Actif',
    bg: 'bg-emerald-500/10 border-emerald-500/40',
    text: 'text-emerald-200',
    dot: 'bg-emerald-400',
    icon: CarFront,
  },
  completed: {
    label: 'Terminé',
    bg: 'bg-sky-500/10 border-sky-500/40',
    text: 'text-sky-200',
    dot: 'bg-sky-400',
    icon: CheckCircle2,
  },
  awaiting_payment: {
    label: 'Paiement requis',
    bg: 'bg-rose-500/20 border-rose-500/60',
    text: 'text-rose-200',
    dot: 'bg-rose-400',
    icon: CreditCard,
  },
  paid: {
    label: 'Payé',
    bg: 'bg-teal-500/10 border-teal-500/40',
    text: 'text-teal-200',
    dot: 'bg-teal-400',
    icon: CheckCircle2,
  },
  cancelled_auto: {
    label: 'Annulé (auto)',
    bg: 'bg-red-500/5 border-red-500/30',
    text: 'text-red-200',
    dot: 'bg-red-400',
    icon: XCircle,
  },
  cancelled_user: {
    label: 'Annulé',
    bg: 'bg-red-500/5 border-red-500/30',
    text: 'text-red-200',
    dot: 'bg-red-400',
    icon: XCircle,
  },
  default: {
    label: 'Inconnu',
    bg: 'bg-slate-500/10 border-slate-500/40',
    text: 'text-slate-200',
    dot: 'bg-slate-400',
  },
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function formatRemaining(sec: number | null): string {
  if (sec == null || sec <= 0) return '00:00'
  const totalSec = Math.floor(sec)
  const minutes = Math.floor(totalSec / 60)
  const seconds = totalSec % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`
}

function formatTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
  })} à ${date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`
}

// ─── COMPOSANT PRINCIPAL ──────────────────────────────────────────────────────

export default function ReservationsIndex() {
  const { reservations: rawReservations, flash, errors: pageErrors } =
    usePage<PageProps>().props

  const [reservations, setReservations] = useState<Reservation[]>(
    rawReservations ?? []
  )
  const errors = pageErrors ?? {}

  useEffect(() => {
    setReservations(rawReservations ?? [])
  }, [rawReservations])

  // ─── Filtres et statistiques ──────────────────────────────────────────────

  const activeReservations = reservations.filter((r) =>
    ['pending', 'active'].includes(r.status)
  )
  const awaitingPaymentReservations = reservations.filter(
    (r) => r.status === 'awaiting_payment'
  )
  const completedReservations = reservations.filter((r) =>
    ['completed', 'paid'].includes(r.status)
  )
  const cancelledReservations = reservations.filter((r) =>
    ['cancelled_auto', 'cancelled_user'].includes(r.status)
  )

  const totalSpent = reservations
    .filter((r) => r.status === 'paid')
    .reduce((sum, r) => sum + Number(r.total_price), 0)

  // ─── Countdown state ──────────────────────────────────────────────────────

  const [remainingMap, setRemainingMap] = useState<
    Record<number, number | null>
  >(() => {
    const initial: Record<number, number | null> = {}
    ;(rawReservations ?? []).forEach((r) => {
      initial[r.id] =
        typeof r.remaining_seconds === 'number'
          ? Math.floor(r.remaining_seconds)
          : null
    })
    return initial
  })

  useEffect(() => {
    const next: Record<number, number | null> = {}
    reservations.forEach((r) => {
      next[r.id] =
        typeof r.remaining_seconds === 'number'
          ? Math.floor(r.remaining_seconds)
          : null
    })
    setRemainingMap(next)
  }, [reservations])

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingMap((prev) => {
        const next: Record<number, number | null> = { ...prev }
        Object.keys(next).forEach((key) => {
          const id = Number(key)
          const value = next[id]
          if (typeof value === 'number' && value > 0) {
            next[id] = value - 1
          }
        })
        return next
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // ─── Toasts flash ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (flash?.success) toast.success(flash.success)
    if (flash?.error) toast.error(flash.error)
  }, [flash?.success, flash?.error])

  useEffect(() => {
    if (errors.reservation) {
      toast.error(errors.reservation, {
        icon: <AlertCircle className="h-5 w-5 text-red-500" />,
      })
    }
  }, [errors.reservation])

  // ─── Payment Modal State ──────────────────────────────────────────────────

  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [selectedReservation, setSelectedReservation] =
    useState<Reservation | null>(null)

  const handlePayClick = (reservation: Reservation) => {
    setSelectedReservation(reservation)
    setPaymentModalOpen(true)
  }

  const handlePaymentSuccess = () => {
    router.reload({ only: ['reservations'] })
  }

  // ─── Modal annulation ─────────────────────────────────────────────────────

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [reservationToCancel, setReservationToCancel] =
    useState<Reservation | null>(null)

  const openCancelModal = (reservation: Reservation) => {
    setReservationToCancel(reservation)
    setConfirmOpen(true)
  }

  const handleConfirmCancel = () => {
    if (!reservationToCancel) return
    router.patch(
      `/reservations/${reservationToCancel.id}/cancel`,
      {},
      {
        onSuccess: () => {
          setConfirmOpen(false)
          setReservationToCancel(null)
          toast.success('Réservation annulée avec succès')
        },
        onError: () => {
          toast.error('Erreur lors de l\'annulation')
        },
      }
    )
  }

  // ─── Modal archivage ──────────────────────────────────────────────────────

  const [hideModalOpen, setHideModalOpen] = useState(false)
  const [reservationToHide, setReservationToHide] =
    useState<Reservation | null>(null)

  const openHideModal = (reservation: Reservation) => {
    setReservationToHide(reservation)
    setHideModalOpen(true)
  }

  const handleConfirmHide = () => {
    if (!reservationToHide) return

    router.delete(`/reservations/${reservationToHide.id}/hide`, {
      onSuccess: () => {
        setHideModalOpen(false)
        setReservationToHide(null)
        toast.success('Ticket archivé avec succès', {
          icon: <Archive className="h-5 w-5 text-slate-500" />,
        })
      },
      onError: () => {
        toast.error('Impossible d\'archiver ce ticket')
      },
    })
  }

  // ─── Render ticket card ───────────────────────────────────────────────────

  const renderTicketCard = (r: Reservation) => {
    const cfg = statusConfig[r.status] || statusConfig.default
    const reservedAt = new Date(r.reserved_at)
    const remainingSec = remainingMap[r.id] ?? null
    const canCancel =
      r.status === 'pending' &&
      typeof remainingSec === 'number' &&
      remainingSec > 0
    const isAwaitingPayment = r.status === 'awaiting_payment'
    const isPaid = r.status === 'paid'
    const isActive = ['pending', 'active'].includes(r.status)
    const StatusIcon = cfg.icon

    return (
      <div
        key={r.id}
        className={`group relative overflow-hidden rounded-2xl text-slate-50 shadow-xl border transition-all duration-300 hover:shadow-2xl ${
          isAwaitingPayment
            ? 'bg-gradient-to-br from-slate-950 via-rose-950/30 to-slate-950 border-rose-500/40 shadow-rose-900/30'
            : isPaid
            ? 'bg-gradient-to-br from-slate-950 via-teal-950/20 to-slate-950 border-teal-500/30'
            : isActive
            ? 'bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950 border-blue-500/30'
            : 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-slate-800/80'
        }`}
      >
        {/* ── Bandeau gauche ─────────────────────────────────────────── */}
        <div
          className={`absolute inset-y-0 left-0 w-24 ${
            isAwaitingPayment
              ? 'bg-gradient-to-b from-rose-700 via-rose-600 to-rose-800'
              : isPaid
              ? 'bg-gradient-to-b from-teal-700 via-teal-600 to-teal-800'
              : isActive
              ? 'bg-gradient-to-b from-blue-700 via-blue-600 to-blue-800'
              : 'bg-gradient-to-b from-slate-700 via-slate-600 to-slate-800'
          }`}
        >
          {/* Perforations */}
          <div className="absolute -right-3 top-16 h-6 w-6 rounded-full bg-slate-950 border border-slate-800" />
          <div className="absolute -right-3 bottom-16 h-6 w-6 rounded-full bg-slate-950 border border-slate-800" />

          <div className="flex h-full flex-col items-center justify-between py-4">
            <div className="flex flex-col items-center gap-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 border border-white/30 backdrop-blur-sm">
                {StatusIcon ? (
                  <StatusIcon className="h-5 w-5 text-white" />
                ) : (
                  <TicketIcon className="h-5 w-5 text-white" />
                )}
              </div>
              <span className="text-[10px] uppercase tracking-[0.2em] text-white/70">
                Parking
              </span>
            </div>

            <div className="text-center">
              <span className="block text-[9px] uppercase text-white/60 tracking-[0.15em]">
                Ticket
              </span>
              <span className="block text-xl font-bold leading-none mt-1">
                #{String(r.id).padStart(4, '0')}
              </span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <Calendar className="h-4 w-4 text-white/60" />
              <span className="text-[9px] text-white/50 text-center leading-tight">
                {formatDate(r.reserved_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Ligne séparatrice pointillée */}
        <div className="absolute inset-y-4 left-24 w-px bg-gradient-to-b from-slate-700/60 via-slate-600/30 to-slate-700/60" />

        {/* ── Contenu principal ──────────────────────────────────────── */}
        <div className="ml-24 flex h-full flex-col justify-between p-5">
          {/* En-tête */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex-1 space-y-1.5">
              <h3 className="text-base font-semibold leading-tight text-white">
                {r.parking.name}
              </h3>
              {r.parking.address_label && (
                <p className="flex items-center gap-1.5 text-xs text-slate-300/80">
                  <MapPin className="h-3.5 w-3.5 text-blue-400" />
                  <span>{r.parking.address_label}</span>
                </p>
              )}
            </div>

            <div className="flex flex-col items-end gap-1.5">
              <Badge
                variant="outline"
                className={`${cfg.bg} ${cfg.text} border gap-1.5 px-2.5 py-1`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${cfg.dot} ${
                    isAwaitingPayment ? 'animate-pulse' : ''
                  }`}
                />
                <span className="text-[11px] font-medium">{cfg.label}</span>
              </Badge>

              {r.status === 'pending' && typeof remainingSec === 'number' && (
                <div className="flex items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className="bg-slate-900/80 text-slate-200 border-slate-700 gap-1 px-2 py-0.5"
                  >
                    <Timer className="h-3 w-3 text-amber-300" />
                    <span className="text-[10px] font-mono">
                      {formatRemaining(remainingSec)}
                    </span>
                  </Badge>
                  {canCancel && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openCancelModal(r)}
                      className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      title="Annuler la réservation"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}

              {isPaid && r.paid_at && (
                <Badge
                  variant="outline"
                  className="bg-teal-500/10 text-teal-200 border-teal-500/40 gap-1 px-2 py-0.5"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  <span className="text-[10px]">Payé {formatTime(r.paid_at)}</span>
                </Badge>
              )}
            </div>
          </div>

          {/* Informations véhicule */}
          <div className="rounded-xl border border-slate-700/70 bg-slate-900/60 backdrop-blur-sm px-4 py-3 mb-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-slate-400 uppercase tracking-wide text-[10px] font-medium">
                  Véhicule
                </span>
                <span className="font-semibold text-slate-50 text-sm tracking-wide">
                  {r.exit_plate ?? r.vehicle.license_plate}
                </span>
                {(r.vehicle.brand || r.vehicle.model) && (
                  <span className="text-slate-300 text-xs">
                    {r.vehicle.brand} {r.vehicle.model}
                  </span>
                )}
              </div>

              {r.duration_minutes != null && Number(r.total_price) > 0 && (
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <Timer className="h-3.5 w-3.5" />
                    <span>{r.duration_minutes} min</span>
                  </div>
                  <span
                    className={`text-lg font-bold ${
                      isAwaitingPayment
                        ? 'text-rose-300'
                        : isPaid
                        ? 'text-teal-300'
                        : 'text-slate-200'
                    }`}
                  >
                    {Number(r.total_price).toFixed(2)} TND
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ── Bloc paiement requis ────────────────────────────────── */}
          {isAwaitingPayment && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 backdrop-blur-sm px-4 py-3.5 mb-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-rose-200 flex items-center gap-2 mb-1">
                    <Receipt className="h-4 w-4" />
                    Paiement requis pour sortir
                  </p>
                  <p className="text-[11px] text-rose-300/80">
                    Véhicule sorti{' '}
                    {r.actual_exit_at && `à ${formatTime(r.actual_exit_at)}`}
                  </p>
                  {r.duration_minutes != null && (
                    <p className="text-[10px] text-rose-400/70 mt-0.5">
                      Durée : {r.duration_minutes} minutes
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <p className="text-xl font-bold text-rose-200 tabular-nums">
                    {Number(r.total_price).toFixed(2)} TND
                  </p>
                  <Button
                    size="sm"
                    className="gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-lg shadow-rose-900/30"
                    onClick={() => handlePayClick(r)}
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    Payer maintenant
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ── Bloc payé avec archivage ──────────────────────────────── */}
          {isPaid && (
            <div className="rounded-xl border border-teal-500/30 bg-teal-500/10 backdrop-blur-sm px-4 py-3 mb-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 flex-1">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-500/20">
                    <DoorOpen className="h-4 w-4 text-teal-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-teal-200">
                      Paiement confirmé
                    </p>
                    <p className="text-[10px] text-teal-300/70">
                      Barrière ouverte
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-3 text-[11px] text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 flex items-center gap-1.5"
                  onClick={() => openHideModal(r)}
                >
                  <Archive className="h-3.5 w-3.5" />
                  Archiver
                </Button>
              </div>
            </div>
          )}

          {/* Pied de page */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800/50">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-slate-500" />
              <div className="text-[11px] text-slate-400">
                <span className="text-[10px] uppercase tracking-wide">
                  Réservé le
                </span>
                <br />
                <span className="text-slate-300">
                  {formatDateTime(r.reserved_at)}
                </span>
              </div>
            </div>

            <div className="text-[9px] uppercase tracking-[0.2em] text-slate-600 font-medium">
              Ticket Digital
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── RENDER PRINCIPAL ─────────────────────────────────────────────────────

  return (
    <AppLayout
      breadcrumbs={[{ title: 'Mes Réservations', href: '/reservations' }]}
    >
      <Head title="Mes Réservations" />

      <div className="mx-auto max-w-6xl py-8 px-4 space-y-6">
        {/* ── En-tête avec statistiques ────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="flex items-center gap-2.5 text-3xl font-bold tracking-tight">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-600/30">
                  <TicketIcon className="h-5 w-5 text-white" />
                </div>
                <span>Mes Réservations</span>
              </h1>
              <p className="text-sm text-muted-foreground ml-12">
                Gérez vos réservations de parking en temps réel
              </p>
            </div>

            <div className="flex gap-3">
              <div className="rounded-xl border bg-card px-4 py-3 shadow-sm min-w-[100px]">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Total
                </p>
                <p className="text-2xl font-bold">{reservations.length}</p>
              </div>

              {awaitingPaymentReservations.length > 0 && (
                <div className="rounded-xl border border-rose-300 bg-rose-50 dark:bg-rose-950/40 dark:border-rose-900 px-4 py-3 shadow-sm animate-pulse min-w-[100px]">
                  <p className="text-xs text-rose-600 dark:text-rose-400 uppercase tracking-wide mb-1">
                    À payer
                  </p>
                  <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">
                    {awaitingPaymentReservations.length}
                  </p>
                </div>
              )}

              {totalSpent > 0 && (
                <div className="rounded-xl border bg-card px-4 py-3 shadow-sm min-w-[120px]">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Dépensé
                  </p>
                  <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                    {totalSpent.toFixed(2)} TND
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Alerte paiement requis */}
          {awaitingPaymentReservations.length > 0 && (
            <div className="rounded-xl border border-rose-200 bg-gradient-to-r from-rose-50 to-orange-50 dark:from-rose-950/40 dark:to-orange-950/40 dark:border-rose-900 px-5 py-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/50 flex-shrink-0">
                  <CreditCard className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-rose-900 dark:text-rose-200 mb-1">
                    {awaitingPaymentReservations.length} véhicule
                    {awaitingPaymentReservations.length > 1 ? 's' : ''} en
                    attente de paiement
                  </h3>
                  <p className="text-xs text-rose-700 dark:text-rose-300">
                    La barrière de sortie est bloquée. Veuillez effectuer le
                    paiement pour libérer votre véhicule.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Onglets de filtrage ──────────────────────────────────────── */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-5 h-auto p-1 bg-muted/50">
            <TabsTrigger value="all" className="gap-2 py-2.5">
              <TicketIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Tous</span>
              <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5">
                {reservations.length}
              </Badge>
            </TabsTrigger>

            <TabsTrigger value="active" className="gap-2 py-2.5">
              <CarFront className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Actifs</span>
              <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5">
                {activeReservations.length}
              </Badge>
            </TabsTrigger>

            <TabsTrigger value="payment" className="gap-2 py-2.5">
              <CreditCard className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">À payer</span>
              {awaitingPaymentReservations.length > 0 && (
                <Badge
                  variant="destructive"
                  className="ml-1 h-5 min-w-[20px] px-1.5 animate-pulse"
                >
                  {awaitingPaymentReservations.length}
                </Badge>
              )}
            </TabsTrigger>

            <TabsTrigger value="completed" className="gap-2 py-2.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Terminés</span>
              <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5">
                {completedReservations.length}
              </Badge>
            </TabsTrigger>

            <TabsTrigger value="cancelled" className="gap-2 py-2.5">
              <XCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Annulés</span>
              <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5">
                {cancelledReservations.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Tous */}
          <TabsContent value="all" className="mt-6 space-y-4">
            {reservations.length === 0 ? (
              <EmptyState />
            ) : (
              reservations.map(renderTicketCard)
            )}
          </TabsContent>

          {/* Actifs */}
          <TabsContent value="active" className="mt-6 space-y-4">
            {activeReservations.length === 0 ? (
              <EmptyState message="Aucune réservation active" />
            ) : (
              activeReservations.map(renderTicketCard)
            )}
          </TabsContent>

          {/* À payer */}
          <TabsContent value="payment" className="mt-6 space-y-4">
            {awaitingPaymentReservations.length === 0 ? (
              <EmptyState message="Aucun paiement en attente" />
            ) : (
              awaitingPaymentReservations.map(renderTicketCard)
            )}
          </TabsContent>

          {/* Terminés */}
          <TabsContent value="completed" className="mt-6 space-y-4">
            {completedReservations.length === 0 ? (
              <EmptyState message="Aucune réservation terminée" />
            ) : (
              completedReservations.map(renderTicketCard)
            )}
          </TabsContent>

          {/* Annulés */}
          <TabsContent value="cancelled" className="mt-6 space-y-4">
            {cancelledReservations.length === 0 ? (
              <EmptyState message="Aucune réservation annulée" />
            ) : (
              cancelledReservations.map(renderTicketCard)
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Modal annulation ──────────────────────────────────────────── */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <span>Annuler la réservation</span>
            </DialogTitle>
            <DialogDescription className="pt-2">
              {reservationToCancel ? (
                <div className="space-y-3">
                  <p className="text-sm leading-relaxed">
                    Êtes-vous sûr de vouloir annuler cette réservation ?
                  </p>

                  <div className="rounded-lg border bg-muted/30 px-3 py-2.5 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Parking</span>
                      <span className="font-medium">
                        {reservationToCancel.parking.name}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Véhicule</span>
                      <span className="font-medium">
                        {reservationToCancel.vehicle.license_plate}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30 px-3 py-2">
                    <p className="text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                      <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                      <span>
                        Cette action est irréversible. La place sera libérée
                        immédiatement.
                      </span>
                    </p>
                  </div>
                </div>
              ) : (
                <p>Aucune réservation sélectionnée.</p>
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex gap-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmOpen(false)}
              className="flex-1"
            >
              Garder
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmCancel}
              className="flex-1"
            >
              Confirmer l'annulation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal archivage ───────────────────────────────────────────── */}
      <Dialog open={hideModalOpen} onOpenChange={setHideModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <Archive className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </div>
              <span>Archiver ce ticket</span>
            </DialogTitle>
            <DialogDescription className="pt-2">
              {reservationToHide ? (
                <div className="space-y-3">
                  <p className="text-sm leading-relaxed">
                    Vous êtes sur le point d'archiver le ticket payé pour{' '}
                    <span className="font-semibold text-foreground">
                      {reservationToHide.parking.name}
                    </span>
                    .
                  </p>

                  <div className="rounded-lg border bg-muted/30 px-3 py-2.5 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Véhicule</span>
                      <span className="font-medium">
                        {reservationToHide.exit_plate ??
                          reservationToHide.vehicle.license_plate}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        Montant payé
                      </span>
                      <span className="font-semibold text-teal-600 dark:text-teal-400">
                        {Number(reservationToHide.total_price).toFixed(2)} TND
                      </span>
                    </div>
                    {reservationToHide.paid_at && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Payé le</span>
                        <span className="font-medium">
                          {formatDateTime(reservationToHide.paid_at)}
                        </span>
                      </div>
                    )}
                    {reservationToHide.duration_minutes != null && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Durée</span>
                        <span className="font-medium">
                          {reservationToHide.duration_minutes} minutes
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/30 px-3 py-2">
                    <p className="text-xs text-blue-800 dark:text-blue-200 flex items-start gap-2">
                      <History className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                      <span>
                        Ce ticket sera masqué de votre liste mais pourra être
                        restauré ultérieurement si nécessaire.
                      </span>
                    </p>
                  </div>
                </div>
              ) : (
                <p>Aucun ticket sélectionné.</p>
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex gap-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHideModalOpen(false)}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmHide}
              className="flex-1 gap-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200"
            >
              <Archive className="h-3.5 w-3.5" />
              Archiver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal paiement ────────────────────────────────────────────── */}
      {selectedReservation && (
        <PaymentModal
          isOpen={paymentModalOpen}
          onClose={() => {
            setPaymentModalOpen(false)
            setSelectedReservation(null)
          }}
          reservation={selectedReservation}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </AppLayout>
  )
}

// ─── COMPOSANT EMPTY STATE ────────────────────────────────────────────────────

function EmptyState({ message }: { message?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50 px-8 py-12 text-center shadow-sm">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-600/10 text-blue-600 mb-4">
        <TicketIcon className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-semibold mb-2">
        {message || 'Aucune réservation'}
      </h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        Lorsque vous réserverez une place de parking, vos tickets apparaîtront
        ici sous forme de billets digitaux élégants.
      </p>
    </div>
  )
}