// resources/js/pages/parking/reserve.tsx

import { useEffect, useState } from 'react'
import { Head, Link, useForm, usePage } from '@inertiajs/react'
import { toast } from 'sonner'
import {
    CarFront,
    MapPin,
    Clock,
    AlertCircle,
    PlusCircle,
    CheckCircle2,
    XCircle,
} from 'lucide-react'

import AppLayout from '@/layouts/app-layout'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'

type Vehicle = {
    id: number
    license_plate: string
    brand: string | null
    model: string | null
}

type Parking = {
    id: number
    name: string
    address_label: string | null
    price_per_hour: number
    available_spots: number
    cancel_time_limit: number | null
    photo_url?: string | null
}

// Props partagés par Inertia (flash + errors)
type SharedProps = {
    flash: {
        success?: string
        error?: string
    }
    errors: Record<string, string>
}

type Props = {
    parking: Parking
    vehicles: Vehicle[]
    canBook: boolean
    notBookableReason: string | null
}

function formatRemaining(ms: number | null): string {
    if (ms === null || ms <= 0) return '0:00'
    const totalSec = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSec / 60)
    const seconds = totalSec % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export default function Reserve({
    parking,
    vehicles,
    canBook,
    notBookableReason,
}: Props) {
    const { props } = usePage<SharedProps>()
    const { errors, flash } = props

    const { data, setData, post, processing } = useForm({
        vehicle_id: vehicles[0]?.id ?? '',
    })

    const [showSuccessModal, setShowSuccessModal] = useState(false)
    const [remainingMs, setRemainingMs] = useState<number | null>(null)

    // Toast + modal en cas de succès (flash.success)
    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success, {
                icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
            })

            setShowSuccessModal(true)

            if (parking.cancel_time_limit) {
                const deadline =
                    Date.now() + parking.cancel_time_limit * 60 * 1000

                setRemainingMs(deadline - Date.now())

                const interval = setInterval(() => {
                    const diff = deadline - Date.now()
                    setRemainingMs(diff > 0 ? diff : 0)
                    if (diff <= 0) {
                        clearInterval(interval)
                    }
                }, 1000)

                return () => clearInterval(interval)
            }
        }
    }, [flash?.success, parking.cancel_time_limit])

    // Toast erreur si formulaire invalide (errors)
    useEffect(() => {
        if (Object.keys(errors).length > 0) {
            const firstError =
                errors.vehicle_id ||
                errors.reservation ||
                Object.values(errors)[0]

            toast.error(firstError, {
                icon: <AlertCircle className="h-5 w-5 text-red-500" />,
            })
        }
    }, [errors])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        post(`/parkings/${parking.id}/reservations`)
    }

    const disableSubmit =
        processing || !canBook || vehicles.length === 0

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Available Parkings', href: '/parkings/available' },
                { title: parking.name, href: `/parkings/${parking.id}` },
                {
                    title: 'Reservation',
                    href: `/parkings/${parking.id}/reservations/create`,
                },
            ]}
        >
            <Head title={`Book - ${parking.name}`} />

            <div className="mx-auto max-w-5xl py-8 px-4 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h1 className="flex items-center gap-2 text-2xl font-semibold">
                        <CarFront className="h-6 w-6 text-blue-600" />
                        <span>Reserve this parking</span>
                    </h1>

                    <Link href={`/parkings/${parking.id}`}>
                        <Button
                            variant="outline"
                            size="sm"
                            className="inline-flex items-center gap-2"
                        >
                            <XCircle className="h-4 w-4" />
                            Back to parking
                        </Button>
                    </Link>
                </div>

                {/* Layout 2 colonnes */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    {/* Colonne gauche : image + infos */}
                    <div className="space-y-4">
                        {/* Image du parking */}
                        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                            {parking.photo_url ? (
                                <img
                                    src={parking.photo_url}
                                    alt={parking.name}
                                    className="w-full h-56 object-cover"
                                />
                            ) : (
                                <div className="flex h-56 items-center justify-center bg-muted text-muted-foreground text-sm">
                                    No photo available
                                </div>
                            )}
                        </div>

                        {/* Infos parking */}
                        <div className="rounded-xl border bg-card shadow-sm p-4 space-y-3">
                            <div>
                                <p className="text-lg font-semibold">
                                    {parking.name}
                                </p>
                                {parking.address_label && (
                                    <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                                        <MapPin className="h-4 w-4 text-blue-500" />
                                        <span>{parking.address_label}</span>
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="flex flex-col rounded-lg border bg-slate-50 px-3 py-2">
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        Price / hour
                                    </span>
                                    <span className="font-semibold text-slate-900">
                                        {Number(
                                            parking.price_per_hour
                                        ).toFixed(2)}{' '}
                                        TND
                                    </span>
                                </div>

                                <div className="flex flex-col rounded-lg border bg-slate-50 px-3 py-2">
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <CarFront className="h-3 w-3" />
                                        Available spots
                                    </span>
                                    <span className="font-semibold text-slate-900">
                                        {parking.available_spots}
                                    </span>
                                </div>
                            </div>

                            {parking.cancel_time_limit !== null && (
                                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                                    <Clock className="mt-0.5 h-4 w-4" />
                                    <p>
                                        Reservation will be automatically
                                        cancelled if you don&apos;t enter the
                                        parking within{' '}
                                        <span className="font-semibold">
                                            {parking.cancel_time_limit} minutes
                                        </span>
                                        .
                                    </p>
                                </div>
                            )}

                            {notBookableReason && (
                                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                                    <AlertCircle className="mt-0.5 h-4 w-4" />
                                    <p>{notBookableReason}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Colonne droite : formulaire */}
                    <div className="rounded-xl border bg-card shadow-sm p-5 space-y-5">
                        <div className="space-y-1">
                            <h2 className="text-lg font-semibold">
                                Booking details
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                Choose one of your registered vehicles and
                                confirm your reservation for this parking.
                            </p>
                        </div>

                        {/* Erreur globale (store) */}
                        {errors.reservation && (
                            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                                <AlertCircle className="mt-0.5 h-4 w-4" />
                                <p>{errors.reservation}</p>
                            </div>
                        )}

                        <form
                            onSubmit={handleSubmit}
                            className="space-y-5 text-sm"
                        >
                            {/* Choix du véhicule */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="flex items-center gap-1 text-xs font-medium text-slate-700 uppercase tracking-wide">
                                        <CarFront className="h-4 w-4 text-slate-500" />
                                        <span>Vehicle</span>
                                    </label>

                                    <Link href="/settings/vehicles">
                                        <Button
                                            variant="ghost"
                                            size="xs"
                                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                        >
                                            <PlusCircle className="h-3 w-3" />
                                            Add vehicle
                                        </Button>
                                    </Link>
                                </div>

                                <select
                                    className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500 bg-white"
                                    value={data.vehicle_id}
                                    onChange={(e) =>
                                        setData(
                                            'vehicle_id',
                                            Number(e.target.value)
                                        )
                                    }
                                >
                                    {vehicles.map((v) => (
                                        <option key={v.id} value={v.id}>
                                            {v.license_plate} — {v.brand ?? ''}{' '}
                                            {v.model ?? ''}
                                        </option>
                                    ))}
                                </select>

                                {errors.vehicle_id && (
                                    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" />
                                        {errors.vehicle_id}
                                    </p>
                                )}
                            </div>

                            <div className="h-px w-full bg-slate-100" />

                            {/* Actions */}
                            <div className="flex justify-end gap-2 pt-1">
                                <Link href={`/parkings/${parking.id}`}>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="inline-flex items-center gap-2"
                                    >
                                        <XCircle className="h-4 w-4" />
                                        Cancel
                                    </Button>
                                </Link>

                                <Button
                                    type="submit"
                                    disabled={disableSubmit}
                                    size="sm"
                                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    <CheckCircle2 className="h-4 w-4" />
                                    {processing
                                        ? 'Processing...'
                                        : 'Confirm reservation'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Modal de succès + compte à rebours */}
            <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            <span>Reservation created</span>
                        </DialogTitle>
                        <DialogDescription className="space-y-2">
                            <p>
                                Your reservation has been created successfully.
                            </p>
                            {parking.cancel_time_limit !== null && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-4 w-4 text-amber-500" />
                                    <span>
                                        Time remaining before automatic
                                        cancellation (if you do not enter the
                                        parking):{' '}
                                        <span className="font-semibold text-slate-900">
                                            {formatRemaining(remainingMs)}
                                        </span>
                                    </span>
                                </p>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-4 flex justify-end gap-2">
                        <Link href="/reservations">
                            <Button
                                variant="outline"
                                size="sm"
                                className="inline-flex items-center gap-1"
                            >
                                <CarFront className="h-4 w-4" />
                                My reservations
                            </Button>
                        </Link>
                        <Button
                            size="sm"
                            className="inline-flex items-center gap-1"
                            onClick={() => setShowSuccessModal(false)}
                        >
                            <XCircle className="h-4 w-4" />
                            Close
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </AppLayout>
    )
}