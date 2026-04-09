// resources/js/pages/Reservations/Index.tsx

import { useEffect, useState } from 'react'
import { Head, router, usePage } from '@inertiajs/react'
import { toast } from 'sonner'
import axios from 'axios'
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
  Loader2,
  CheckCircle2,
  DoorOpen,
  Receipt,
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
  { label: string; bg: string; text: string; dot: string }
> = {
  pending: {
    label: 'Pending',
    bg: 'bg-amber-500/10 border-amber-500/40',
    text: 'text-amber-200',
    dot: 'bg-amber-400',
  },
  active: {
    label: 'Active',
    bg: 'bg-emerald-500/10 border-emerald-500/40',
    text: 'text-emerald-200',
    dot: 'bg-emerald-400',
  },
  completed: {
    label: 'Completed',
    bg: 'bg-sky-500/10 border-sky-500/40',
    text: 'text-sky-200',
    dot: 'bg-sky-400',
  },
  awaiting_payment: {
    label: 'Payment required',
    bg: 'bg-rose-500/20 border-rose-500/60',
    text: 'text-rose-200',
    dot: 'bg-rose-400',
  },
  paid: {
    label: 'Paid',
    bg: 'bg-teal-500/10 border-teal-500/40',
    text: 'text-teal-200',
    dot: 'bg-teal-400',
  },
  cancelled_auto: {
    label: 'Cancelled (auto)',
    bg: 'bg-red-500/5 border-red-500/30',
    text: 'text-red-200',
    dot: 'bg-red-400',
  },
  cancelled_user: {
    label: 'Cancelled',
    bg: 'bg-red-500/5 border-red-500/30',
    text: 'text-red-200',
    dot: 'bg-red-400',
  },
  default: {
    label: 'Unknown',
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
  return new Date(dateStr).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
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

  const total = reservations.length
  const activeCount = reservations.filter((r) =>
    ['pending', 'active'].includes(r.status)
  ).length
  const awaitingPaymentCount = reservations.filter(
    (r) => r.status === 'awaiting_payment'
  ).length

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

  // ✅ Payment Modal State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)

  const handlePayClick = (reservation: Reservation) => {
    setSelectedReservation(reservation)
    setPaymentModalOpen(true)
  }

  const handlePaymentSuccess = () => {
    // Recharger uniquement les réservations
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
          toast.success('Reservation cancelled successfully.')
        },
        onError: () => {
          toast.error('Failed to cancel the reservation.')
        },
      }
    )
  }

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <AppLayout
      breadcrumbs={[{ title: 'My Reservations', href: '/reservations' }]}
    >
      <Head title="My Reservations" />

      <div className="mx-auto max-w-5xl py-8 px-4 flex flex-col min-h-[calc(100vh-5rem)] space-y-4">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
                <TicketIcon className="h-6 w-6 text-blue-600" />
                <span>My Reservations</span>
              </h1>
              <p className="text-sm text-muted-foreground">
                Your active and past bookings, displayed as professional
                parking tickets.
              </p>
            </div>

            <div className="hidden sm:flex gap-3 text-xs">
              <div className="rounded-lg border bg-card px-3 py-2 shadow-sm">
                <p className="text-muted-foreground uppercase tracking-wide">Total</p>
                <p className="text-base font-semibold">{total}</p>
              </div>
              <div className="rounded-lg border bg-card px-3 py-2 shadow-sm">
                <p className="text-muted-foreground uppercase tracking-wide">Active / Pending</p>
                <p className="text-base font-semibold">{activeCount}</p>
              </div>
              {awaitingPaymentCount > 0 && (
                <div className="rounded-lg border border-rose-300 bg-rose-50 dark:bg-rose-950/40 px-3 py-2 shadow-sm animate-pulse">
                  <p className="text-rose-600 dark:text-rose-400 uppercase tracking-wide text-[10px]">
                    À payer
                  </p>
                  <p className="text-base font-semibold text-rose-700 dark:text-rose-300">
                    {awaitingPaymentCount}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ✅ Bannière alerte */}
        {awaitingPaymentCount > 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/40 dark:border-rose-900 px-4 py-3 shadow-sm">
            <CreditCard className="h-5 w-5 text-rose-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-rose-800 dark:text-rose-200">
                {awaitingPaymentCount} véhicule{awaitingPaymentCount > 1 ? 's' : ''} en attente de paiement
              </p>
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">
                La barrière est bloquée. Cliquez sur "Pay Now" pour débloquer la sortie.
              </p>
            </div>
          </div>
        )}

        {/* ── Tickets ───────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col">
          {reservations.length === 0 ? (
            <div className="mt-auto mb-4 rounded-2xl border border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100 px-6 py-10 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-600/5 text-blue-600 mb-3">
                <TicketIcon className="h-7 w-7" />
              </div>
              <h2 className="text-lg font-semibold mb-1">No reservations yet</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                When you book a parking spot, your reservations will appear
                here as elegant digital tickets.
              </p>
            </div>
          ) : (
            <div className="mt-auto space-y-4 pb-4">
              {reservations.map((r) => {
                const cfg = statusConfig[r.status] || statusConfig.default
                const reservedAt = new Date(r.reserved_at)
                const remainingSec = remainingMap[r.id] ?? null
                const canCancel =
                  r.status === 'pending' &&
                  typeof remainingSec === 'number' &&
                  remainingSec > 0
                const isAwaitingPayment = r.status === 'awaiting_payment'
                const isPaid = r.status === 'paid'

                return (
                  <div
                    key={r.id}
                    className={`relative overflow-hidden rounded-2xl text-slate-50 shadow-xl border transition-all duration-300 ${
                      isAwaitingPayment
                        ? 'bg-gradient-to-br from-slate-950 via-rose-950/30 to-slate-950 border-rose-500/40 shadow-rose-900/30'
                        : isPaid
                        ? 'bg-gradient-to-br from-slate-950 via-teal-950/20 to-slate-950 border-teal-500/30'
                        : 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-slate-800/80'
                    }`}
                  >
                    {/* ── Bandeau gauche ───────────────────────────────── */}
                    <div
                      className={`absolute inset-y-0 left-0 w-24 ${
                        isAwaitingPayment
                          ? 'bg-gradient-to-b from-rose-700 via-rose-600 to-rose-800'
                          : isPaid
                          ? 'bg-gradient-to-b from-teal-700 via-teal-600 to-teal-800'
                          : 'bg-gradient-to-b from-blue-700 via-blue-600 to-blue-800'
                      }`}
                    >
                      <div className="absolute -right-3 top-16 h-6 w-6 rounded-full bg-slate-950 border border-slate-800" />
                      <div className="absolute -right-3 bottom-16 h-6 w-6 rounded-full bg-slate-950 border border-slate-800" />

                      <div className="flex h-full flex-col items-center justify-between py-4">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 border border-white/30">
                            {isAwaitingPayment ? (
                              <CreditCard className="h-5 w-5 text-white" />
                            ) : isPaid ? (
                              <CheckCircle2 className="h-5 w-5 text-white" />
                            ) : (
                              <CarFront className="h-5 w-5 text-white" />
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
                          <span className="block text-lg font-semibold leading-none">
                            #{String(r.id).padStart(3, '0')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="absolute inset-y-4 left-24 w-px bg-gradient-to-b from-slate-700/60 via-slate-600/30 to-slate-700/60" />

                    {/* ── Contenu ticket ───────────────────────────────── */}
                    <div className="ml-24 flex h-full flex-col justify-between p-4">

                      {/* Haut : parking + statut + actions */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold leading-tight">
                            {r.parking.name}
                          </p>
                          {r.parking.address_label && (
                            <p className="flex items-center gap-1 text-[11px] text-slate-300/80">
                              <MapPin className="h-3 w-3 text-blue-300" />
                              <span>{r.parking.address_label}</span>
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          <div
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${cfg.bg} ${cfg.text}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot} ${isAwaitingPayment ? 'animate-pulse' : ''}`} />
                            <span>{cfg.label}</span>
                          </div>

                          {r.status === 'pending' && (
                            <div className="flex items-center gap-1">
                              {typeof remainingSec === 'number' && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-2 py-0.5 text-[10px] text-slate-200 border border-slate-700">
                                  <Timer className="h-3 w-3 text-amber-300" />
                                  <span>Time left: {formatRemaining(remainingSec)}</span>
                                </span>
                              )}
                              {canCancel && (
                                <button
                                  type="button"
                                  onClick={() => openCancelModal(r)}
                                  className="ml-1 inline-flex items-center justify-center rounded-full border border-red-500/60 bg-red-500/10 p-1 text-[10px] text-red-200 hover:bg-red-500/20 transition"
                                  title="Cancel reservation"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          )}

                          {isPaid && r.paid_at && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/10 border border-teal-500/40 px-2 py-0.5 text-[10px] text-teal-200">
                              <CheckCircle2 className="h-3 w-3" />
                              Payé à {formatTime(r.paid_at)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Milieu : véhicule */}
                      <div className="mt-3 rounded-lg border border-slate-700/70 bg-slate-900/60 px-3 py-2 text-[11px] flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-slate-400 uppercase tracking-wide text-[10px]">
                            Vehicle
                          </span>
                          <span className="font-medium text-slate-50">
                            {r.exit_plate ?? r.vehicle.license_plate}
                          </span>
                          <span className="text-slate-300">
                            {r.vehicle.brand ?? ''} {r.vehicle.model ?? ''}
                          </span>
                        </div>

                        {r.duration_minutes != null && Number(r.total_price) > 0 && (
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Timer className="h-3 w-3" />
                              {r.duration_minutes} min
                            </span>
                            <span className={`text-sm font-bold ${isAwaitingPayment ? 'text-rose-300' : isPaid ? 'text-teal-300' : 'text-slate-200'}`}>
                              {Number(r.total_price).toFixed(2)} TND
                            </span>
                          </div>
                        )}
                      </div>

                      {/* ✅ BLOC PAIEMENT BRAINTREE — awaiting_payment */}
                      {isAwaitingPayment && (
                        <div className="mt-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-rose-200 flex items-center gap-1.5">
                              <Receipt className="h-3.5 w-3.5" />
                              Paiement requis pour sortir
                            </p>
                            <p className="text-[11px] text-rose-300/80 mt-0.5">
                              Votre véhicule a quitté la zone ·{' '}
                              {r.duration_minutes != null
                                ? `${r.duration_minutes} min`
                                : '—'}
                            </p>
                            {r.actual_exit_at && (
                              <p className="text-[10px] text-rose-400/70 mt-0.5 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Sortie détectée à {formatTime(r.actual_exit_at)}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            <p className="text-lg font-bold text-rose-200">
                              {Number(r.total_price).toFixed(2)} TND
                            </p>
                            <Button
                              size="sm"
                              className="gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold px-4"
                              onClick={() => handlePayClick(r)}
                            >
                              <CreditCard className="h-3.5 w-3.5" />
                              Pay Now
                            </Button>
                          </div>
                        </div>
                      )}

                      {isPaid && (
                        <div className="mt-3 rounded-xl border border-teal-500/30 bg-teal-500/10 px-3 py-2 flex items-center gap-2">
                          <DoorOpen className="h-4 w-4 text-teal-400 flex-shrink-0" />
                          <p className="text-[11px] text-teal-200">
                            Paiement confirmé — La barrière a été ouverte.
                          </p>
                        </div>
                      )}

                      {/* Bas : date/heure */}
                      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          <div className="flex flex-col leading-tight">
                            <span className="text-[10px] uppercase text-slate-400 tracking-wide">
                              Reserved at
                            </span>
                            <span>
                              {reservedAt.toLocaleDateString()} •{' '}
                              {reservedAt.toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>

                        <div className="text-[9px] uppercase tracking-[0.18em] text-slate-500">
                          DIGITAL TICKET
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Modal annulation ────────────────────────────────────────────────── */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <span>Cancel reservation</span>
            </DialogTitle>
            <DialogDescription>
              {reservationToCancel ? (
                <p className="text-sm">
                  Are you sure you want to cancel the reservation for{' '}
                  <span className="font-semibold">
                    {reservationToCancel.parking.name}
                  </span>{' '}
                  with vehicle{' '}
                  <span className="font-semibold">
                    {reservationToCancel.vehicle.license_plate}
                  </span>
                  ?
                </p>
              ) : (
                <p>No reservation selected.</p>
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmOpen(false)}
            >
              Keep reservation
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmCancel}
            >
              Confirm cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ✅ MODAL PAIEMENT BRAINTREE */}
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