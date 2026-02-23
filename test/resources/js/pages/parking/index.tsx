// resources/js/pages/parking/index.tsx

import { Head, router, usePage } from '@inertiajs/react';
import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
    Plus, MapPin, Car, Eye, Edit, Trash2, Crown,
    CheckCircle, AlertTriangle, XCircle,
    Power, PowerOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';

type Parking = {
    id: number;
    name: string;
    description: string | null;
    address_label: string | null;
    latitude: number;
    longitude: number;
    total_spots: number;
    available_spots: number;
    detected_cars: number;
    price_per_hour: number;
    is_24h: boolean;
    opening_time: string | null;
    closing_time: string | null;
    status: string;
    photo_url: string | null;
    photo_path: string | null;
    annotated_file_url: string | null;
};

type Props = {
    parkings: Parking[];
    canAdd: boolean;
    currentPlan: string;
    isPremium: boolean;
};

export default function ParkingIndex({ parkings, canAdd, currentPlan, isPremium }: Props) {
    const { flash } = usePage().props as any;
    const [deleteTarget, setDeleteTarget] = useState<Parking | null>(null);
    const [toggleTarget, setToggleTarget] = useState<Parking | null>(null);

    const confirmDelete = () => {
        if (deleteTarget) {
            router.delete(`/parkings/${deleteTarget.id}`, {
                onFinish: () => setDeleteTarget(null),
            });
        }
    };

    const confirmToggle = () => {
        if (toggleTarget) {
            router.post(`/parkings/${toggleTarget.id}/toggle-status`, {}, {
                onFinish: () => setToggleTarget(null),
            });
        }
    };

    const statusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                        <Power className="h-3 w-3" /> Active
                    </span>
                );
            case 'inactive':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                        <PowerOff className="h-3 w-3" /> Maintenance
                    </span>
                );
            default:
                return null;
        }
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'My Parkings', href: '/parkings' }]}>
            <Head title="My Parkings" />

            <div className="mx-auto max-w-6xl py-8 px-4">
                {/* ═══ Header ═══ */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold">My Parkings</h1>
                        <p className="text-muted-foreground">Manage your parking lots</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                            isPremium ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                            {isPremium && <Crown className="inline h-3 w-3 mr-1" />}
                            {currentPlan}
                        </span>
                        {canAdd ? (
                            <Button onClick={() => router.visit('/parkings/create')}>
                                <Plus className="mr-2 h-4 w-4" /> Add Parking
                            </Button>
                        ) : (
                            <Button variant="outline" onClick={() => router.visit('/payment/upgrade')}>
                                <Crown className="mr-2 h-4 w-4 text-yellow-500" /> Upgrade
                            </Button>
                        )}
                    </div>
                </div>

                {/* ═══ Alerts ═══ */}
                {flash?.success && (
                    <div className="mb-6 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300">
                        <CheckCircle className="h-5 w-5 shrink-0" />
                        <p>{flash.success}</p>
                    </div>
                )}

                {flash?.warning && (
                    <div className="mb-6 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                        <AlertTriangle className="h-5 w-5 shrink-0" />
                        <p>{flash.warning}</p>
                    </div>
                )}

                {flash?.error && (
                    <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                        <XCircle className="h-5 w-5 shrink-0" />
                        <p>{flash.error}</p>
                    </div>
                )}

                {/* ═══ Vide ═══ */}
                {parkings.length === 0 && (
                    <div className="text-center py-20 border rounded-lg bg-muted/30">
                        <Car className="mx-auto h-16 w-16 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-semibold">No parkings yet</h3>
                        <p className="mt-1 text-muted-foreground">Create your first parking lot to get started</p>
                        {canAdd && (
                            <Button className="mt-6" onClick={() => router.visit('/parkings/create')}>
                                <Plus className="mr-2 h-4 w-4" /> Add Parking
                            </Button>
                        )}
                    </div>
                )}

                {/* ═══ Grille ═══ */}
                <div className="grid md:grid-cols-2 gap-6">
                    {parkings.map((parking) => {
                        const lat = Number(parking.latitude);
                        const lng = Number(parking.longitude);

                        return (
                            <div
                                key={parking.id}
                                className={`rounded-xl border overflow-hidden shadow-sm hover:shadow-md transition-shadow ${
                                    parking.status === 'inactive' ? 'opacity-60' : ''
                                }`}
                            >
                                {/* Photo */}
                                <div className="h-48 bg-muted relative">
                                    {isPremium && parking.annotated_file_url ? (
                                        <>
                                            <img
                                                src={parking.annotated_file_url}
                                                alt={parking.name}
                                                className="h-full w-full object-cover"
                                            />
                                            <span className="absolute top-2 left-2 rounded-full bg-yellow-500 px-2 py-0.5 text-xs font-bold text-white">
                                                AI Annotated
                                            </span>
                                        </>
                                    ) : parking.photo_url ? (
                                        <img
                                            src={parking.photo_url}
                                            alt={parking.name}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-full items-center justify-center">
                                            <Car className="h-12 w-12 text-muted-foreground" />
                                        </div>
                                    )}

                                    {/* Status badge */}
                                    <div className="absolute top-2 right-2">
                                        {statusBadge(parking.status)}
                                    </div>
                                </div>

                                {/* Infos */}
                                <div className="p-5">
                                    <h3 className="font-semibold text-lg">{parking.name}</h3>

                                    {parking.address_label && (
                                        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                                            <MapPin className="h-3 w-3 shrink-0" />
                                            {parking.address_label.length > 60
                                                ? parking.address_label.substring(0, 60) + '...'
                                                : parking.address_label}
                                        </p>
                                    )}

                                    {/* Stats */}
                                    <div className="mt-4 grid grid-cols-3 gap-3">
                                        <div className="rounded-lg border p-3 text-center">
                                            <p className="text-xl font-bold text-blue-600">
                                                {parking.detected_cars}
                                            </p>
                                            <p className="text-xs text-muted-foreground">Cars</p>
                                        </div>
                                        <div className="rounded-lg border p-3 text-center">
                                            <p className={`text-xl font-bold ${
                                                parking.available_spots > 0 ? 'text-green-600' : 'text-red-600'
                                            }`}>
                                                {parking.available_spots}
                                            </p>
                                            <p className="text-xs text-muted-foreground">Available</p>
                                        </div>
                                        <div className="rounded-lg border p-3 text-center">
                                            <p className="text-xl font-bold text-yellow-600">
                                                {parking.price_per_hour}
                                            </p>
                                            <p className="text-xs text-muted-foreground">TND/h</p>
                                        </div>
                                    </div>

                                    {/* Horaires */}
                                    <p className="mt-3 text-sm text-muted-foreground text-center">
                                        {parking.is_24h
                                            ? '🕐 Open 24/7'
                                            : `🕐 ${parking.opening_time || '?'} - ${parking.closing_time || '?'}`}
                                    </p>

                                    {/* Mini map */}
                                    <div className="mt-3 rounded-lg overflow-hidden border">
                                        <iframe
                                            src={`https://www.openstreetmap.org/export/embed.html?bbox=${
                                                lng - 0.003
                                            },${
                                                lat - 0.003
                                            },${
                                                lng + 0.003
                                            },${
                                                lat + 0.003
                                            }&layer=mapnik&marker=${lat},${lng}`}
                                            width="100%"
                                            height="150"
                                            style={{ border: 0 }}
                                            loading="lazy"
                                        />
                                    </div>

                                    {/* Actions */}
                                    <div className="mt-4 grid grid-cols-2 gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => router.visit(`/parkings/${parking.id}`)}
                                        >
                                            <Eye className="mr-1 h-3 w-3" /> View
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => router.visit(`/parkings/${parking.id}/edit`)}
                                        >
                                            <Edit className="mr-1 h-3 w-3" /> Edit
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className={
                                                parking.status === 'active'
                                                    ? 'text-amber-600 hover:bg-amber-50'
                                                    : 'text-green-600 hover:bg-green-50'
                                            }
                                            onClick={() => setToggleTarget(parking)}
                                        >
                                            {parking.status === 'active' ? (
                                                <><PowerOff className="mr-1 h-3 w-3" /> Deactivate</>
                                            ) : (
                                                <><Power className="mr-1 h-3 w-3" /> Activate</>
                                            )}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-red-600 hover:bg-red-50"
                                            onClick={() => setDeleteTarget(parking)}
                                        >
                                            <Trash2 className="mr-1 h-3 w-3" /> Delete
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ═══════════════════════════════════════════ */}
            {/* MODAL : Confirmation suppression            */}
            {/* ═══════════════════════════════════════════ */}
            <Transition appear show={!!deleteTarget} as={Fragment}>
                <Dialog
                    as="div"
                    className="relative z-50"
                    onClose={() => setDeleteTarget(null)}
                >
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-200"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-150"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-200"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-150"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-neutral-900">
                                    {/* Icône */}
                                    <div className="flex justify-center">
                                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                                            <Trash2 className="h-8 w-8 text-red-600" />
                                        </div>
                                    </div>

                                    {/* Titre */}
                                    <Dialog.Title className="mt-4 text-center text-lg font-bold">
                                        Delete Parking
                                    </Dialog.Title>

                                    {/* Message */}
                                    <p className="mt-2 text-center text-sm text-muted-foreground">
                                        Are you sure you want to delete{' '}
                                        <strong>"{deleteTarget?.name}"</strong>?
                                        This action cannot be undone. All data and photos
                                        will be permanently removed.
                                    </p>

                                    {/* Boutons */}
                                    <div className="mt-6 flex gap-3">
                                        <Button
                                            variant="outline"
                                            className="flex-1"
                                            onClick={() => setDeleteTarget(null)}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            className="flex-1"
                                            onClick={confirmDelete}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                                        </Button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            {/* ═══════════════════════════════════════════ */}
            {/* MODAL : Confirmation toggle status          */}
            {/* ═══════════════════════════════════════════ */}
            <Transition appear show={!!toggleTarget} as={Fragment}>
                <Dialog
                    as="div"
                    className="relative z-50"
                    onClose={() => setToggleTarget(null)}
                >
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-200"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-150"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-200"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-150"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-neutral-900">
                                    {/* Icône */}
                                    <div className="flex justify-center">
                                        <div
                                            className={`flex h-16 w-16 items-center justify-center rounded-full ${
                                                toggleTarget?.status === 'active'
                                                    ? 'bg-amber-100 dark:bg-amber-900/30'
                                                    : 'bg-green-100 dark:bg-green-900/30'
                                            }`}
                                        >
                                            {toggleTarget?.status === 'active' ? (
                                                <PowerOff className="h-8 w-8 text-amber-600" />
                                            ) : (
                                                <Power className="h-8 w-8 text-green-600" />
                                            )}
                                        </div>
                                    </div>

                                    {/* Titre */}
                                    <Dialog.Title className="mt-4 text-center text-lg font-bold">
                                        {toggleTarget?.status === 'active'
                                            ? 'Deactivate Parking'
                                            : 'Activate Parking'}
                                    </Dialog.Title>

                                    {/* Message */}
                                    <p className="mt-2 text-center text-sm text-muted-foreground">
                                        {toggleTarget?.status === 'active' ? (
                                            <>
                                                Are you sure you want to put{' '}
                                                <strong>"{toggleTarget?.name}"</strong> in
                                                maintenance mode? Drivers will no longer see
                                                this parking.
                                            </>
                                        ) : (
                                            <>
                                                Reactivate{' '}
                                                <strong>"{toggleTarget?.name}"</strong>? It
                                                will be visible to drivers again.
                                            </>
                                        )}
                                    </p>

                                    {/* Boutons */}
                                    <div className="mt-6 flex gap-3">
                                        <Button
                                            variant="outline"
                                            className="flex-1"
                                            onClick={() => setToggleTarget(null)}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            className={`flex-1 ${
                                                toggleTarget?.status === 'active'
                                                    ? 'bg-amber-500 hover:bg-amber-600'
                                                    : 'bg-green-500 hover:bg-green-600'
                                            } text-white`}
                                            onClick={confirmToggle}
                                        >
                                            {toggleTarget?.status === 'active' ? (
                                                <>
                                                    <PowerOff className="mr-2 h-4 w-4" />{' '}
                                                    Deactivate
                                                </>
                                            ) : (
                                                <>
                                                    <Power className="mr-2 h-4 w-4" />{' '}
                                                    Activate
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </AppLayout>
    );
}