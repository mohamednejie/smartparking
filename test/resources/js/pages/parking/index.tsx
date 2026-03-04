import { Head, Link, router, usePage } from '@inertiajs/react';
import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
    Plus, MapPin, Car, Eye, Edit, Trash2, Crown,
    CheckCircle, AlertTriangle, XCircle,
    Power, PowerOff, Lock
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
    showUpgradeMessage?: boolean; // <-- Ajouté
    hiddenCount?: number;         // <-- Ajouté
};

export default function ParkingIndex({ 
    parkings, 
    canAdd, 
    currentPlan, 
    isPremium, 
    showUpgradeMessage, 
    hiddenCount 
}: Props) {
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
                            {isPremium ? 'Premium' : 'Basic'}
                        </span>
                        
                        {canAdd ? (
                            <Button onClick={() => router.visit('/parkings/create')}>
                                <Plus className="mr-2 h-4 w-4" /> Add Parking
                            </Button>
                        ) : (
                            <Button variant="outline" onClick={() => router.visit('/payment')} className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100">
                                <Crown className="mr-2 h-4 w-4 text-amber-500" /> Upgrade Limit
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
                {parkings.length === 0 && !showUpgradeMessage && (
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
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {parkings.map((parking) => {
                        const lat = Number(parking.latitude);
                        const lng = Number(parking.longitude);

                        return (
                            <div
                                key={parking.id}
                                className={`flex flex-col rounded-xl border overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-card ${
                                    parking.status === 'inactive' ? 'opacity-75 grayscale-[0.2]' : ''
                                }`}
                            >
                                {/* Photo */}
                                <div className="h-48 bg-muted relative shrink-0">
                                    {isPremium && parking.annotated_file_url ? (
                                        <>
                                            <img
                                                src={parking.annotated_file_url}
                                                alt={parking.name}
                                                className="h-full w-full object-cover transition-transform hover:scale-105 duration-500"
                                            />
                                            <span className="absolute top-2 left-2 rounded-full bg-yellow-500 px-2 py-0.5 text-xs font-bold text-white shadow-sm">
                                                AI Annotated
                                            </span>
                                        </>
                                    ) : parking.photo_url ? (
                                        <img
                                            src={parking.photo_url}
                                            alt={parking.name}
                                            className="h-full w-full object-cover transition-transform hover:scale-105 duration-500"
                                        />
                                    ) : (
                                        <div className="flex h-full items-center justify-center">
                                            <Car className="h-12 w-12 text-muted-foreground/50" />
                                        </div>
                                    )}

                                    {/* Status badge */}
                                    <div className="absolute top-2 right-2 shadow-sm">
                                        {statusBadge(parking.status)}
                                    </div>
                                </div>

                                {/* Infos */}
                                <div className="p-5 flex flex-col flex-1">
                                    <div className="mb-4">
                                        <h3 className="font-semibold text-lg line-clamp-1" title={parking.name}>
                                            {parking.name}
                                        </h3>

                                        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                                            <span className="truncate">
                                                {parking.address_label || 'No address provided'}
                                            </span>
                                        </p>
                                    </div>

                                    {/* Stats */}
                                    <div className="grid grid-cols-3 gap-2 mb-4">
                                        <div className="rounded-lg border bg-muted/20 p-2 text-center">
                                            <p className="text-lg font-bold text-blue-600">
                                                {parking.detected_cars}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground uppercase font-medium">Cars</p>
                                        </div>
                                        <div className="rounded-lg border bg-muted/20 p-2 text-center">
                                            <p className={`text-lg font-bold ${
                                                parking.available_spots > 0 ? 'text-green-600' : 'text-red-600'
                                            }`}>
                                                {parking.available_spots}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground uppercase font-medium">Free</p>
                                        </div>
                                        <div className="rounded-lg border bg-muted/20 p-2 text-center">
                                            <p className="text-lg font-bold text-yellow-600">
                                                {parking.price_per_hour}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground uppercase font-medium">TND/h</p>
                                        </div>
                                    </div>

                                    {/* Horaires */}
                                    <p className="text-xs text-center text-muted-foreground mb-4 font-medium bg-muted/30 py-1.5 rounded-md">
                                        {parking.is_24h
                                            ? 'Open 24/7'
                                            : `${parking.opening_time || '--:--'} - ${parking.closing_time || '--:--'}`}
                                    </p>

                                    <div className="mt-auto pt-4 border-t grid grid-cols-2 gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full"
                                            onClick={() => router.visit(`/parkings/${parking.id}`)}
                                        >
                                            <Eye className="mr-1.5 h-3.5 w-3.5" /> View
                                        </Button>
                                        
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full"
                                            onClick={() => router.visit(`/parkings/${parking.id}/edit`)}
                                        >
                                            <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit
                                        </Button>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className={`w-full ${
                                                parking.status === 'active'
                                                    ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
                                                    : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                                            }`}
                                            onClick={() => setToggleTarget(parking)}
                                        >
                                            {parking.status === 'active' ? (
                                                <><PowerOff className="mr-1.5 h-3.5 w-3.5" /> Stop</>
                                            ) : (
                                                <><Power className="mr-1.5 h-3.5 w-3.5" /> Start</>
                                            )}
                                        </Button>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => setDeleteTarget(parking)}
                                        >
                                            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Del
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* 🔥 CARTE VERROUILLÉE SI LIMITÉ 🔥 */}
                    {showUpgradeMessage && (
                        <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-6 flex flex-col items-center justify-center text-center h-full min-h-[480px] transition-all hover:bg-slate-100 dark:hover:bg-slate-900 group">
                            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
                            
                            <div className="relative z-10 flex flex-col items-center">
                                <div className="p-4 bg-white dark:bg-slate-800 rounded-full mb-4 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 group-hover:scale-110 transition-transform">
                                    <Lock className="w-8 h-8 text-slate-400" />
                                </div>
                                
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                    {hiddenCount} Hidden Parking{hiddenCount && hiddenCount > 1 ? 's' : ''}
                                </h3>
                                
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 mb-6 max-w-[250px] leading-relaxed">
                                    Your subscription plan limits you to 3 visible parkings. Upgrade to Premium to manage unlimited locations.
                                </p>
                                
                                <Button asChild className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-0 shadow-lg shadow-orange-500/20 rounded-full px-6">
                                    <Link href="/payment">
                                        <Crown className="w-4 h-4 mr-2 fill-current" />
                                        Unlock All Parkings
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    )}
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