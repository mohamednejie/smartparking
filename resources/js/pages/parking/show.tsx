// resources/js/pages/parking/show.tsx

import { Head, router } from '@inertiajs/react';
import { MapPin, Car, Clock, Edit, ArrowLeft, Power, PowerOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';

type Props = {
    parking: {
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
        annotated_file_url: string | null;
        photo_path: string | null;
        annotated_file_path: string | null;
        created_at: string;
    };
    isPremium: boolean;
};

export default function ShowParking({ parking, isPremium }: Props) {
    return (
        <AppLayout breadcrumbs={[
            { title: 'My Parkings', href: '/parkings' },
            { title: parking.name, href: `/parkings/${parking.id}` },
        ]}>
            <Head title={parking.name} />

            <div className="mx-auto max-w-3xl py-8 px-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <Button variant="outline" size="sm" onClick={() => router.visit('/parkings')}>
                        <ArrowLeft className="mr-1 h-4 w-4" /> Back
                    </Button>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className={parking.status === 'active' ? 'text-amber-600' : 'text-green-600'}
                            onClick={() => router.post(`/parkings/${parking.id}/toggle-status`)}
                        >
                            {parking.status === 'active' ? <><PowerOff className="mr-1 h-4 w-4" /> Deactivate</> : <><Power className="mr-1 h-4 w-4" /> Activate</>}
                        </Button>
                        <Button size="sm" onClick={() => router.visit(`/parkings/${parking.id}/edit`)}>
                            <Edit className="mr-1 h-4 w-4" /> Edit
                        </Button>
                    </div>
                </div>

                {/* Title + Status */}
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold">{parking.name}</h1>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        parking.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                    }`}>
                        {parking.status === 'active' ? '● Active' : '● Maintenance'}
                    </span>
                </div>

                {parking.description && <p className="mt-2 text-muted-foreground">{parking.description}</p>}

                {/* Photo */}
                <div className="mt-6 rounded-lg overflow-hidden border relative">
                    {isPremium && parking.annotated_file_url ? (
                        <>
                            <img src={parking.annotated_file_url} alt={parking.name} className="w-full object-cover max-h-96" />
                            <span className="absolute top-2 right-2 rounded-full bg-yellow-500 px-2 py-0.5 text-xs font-bold text-white">AI Annotated</span>
                        </>
                    ) : parking.photo_url ? (
                        <img src={parking.photo_url} alt={parking.name} className="w-full object-cover max-h-96" />
                    ) : (
                        <div className="flex h-48 items-center justify-center bg-muted">
                            <Car className="h-12 w-12 text-muted-foreground" />
                        </div>
                    )}
                </div>

                {/* Stats */}
                <div className="mt-6 grid grid-cols-4 gap-4">
                    <div className="rounded-lg border p-4 text-center">
                        <p className="text-2xl font-bold">{parking.total_spots}</p>
                        <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                    <div className="rounded-lg border p-4 text-center">
                        <p className="text-2xl font-bold text-blue-600">{parking.detected_cars}</p>
                        <p className="text-xs text-muted-foreground">Cars</p>
                    </div>
                    <div className="rounded-lg border p-4 text-center">
                        <p className={`text-2xl font-bold ${parking.available_spots > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {parking.available_spots}
                        </p>
                        <p className="text-xs text-muted-foreground">Available</p>
                    </div>
                    <div className="rounded-lg border p-4 text-center">
                        <p className="text-2xl font-bold text-yellow-600">{parking.price_per_hour}</p>
                        <p className="text-xs text-muted-foreground">TND/h</p>
                    </div>
                </div>

                {/* Info */}
                <div className="mt-6 space-y-2">
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {parking.is_24h ? 'Open 24/7' : `${parking.opening_time || '?'} - ${parking.closing_time || '?'}`}
                    </p>
                    {parking.address_label && (
                        <p className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" /> {parking.address_label}
                        </p>
                    )}
                </div>

                {/* Map */}
                <div className="mt-4 rounded-lg overflow-hidden border">
                    <iframe
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${parking.longitude - 0.005},${parking.latitude - 0.005},${parking.longitude + 0.005},${parking.latitude + 0.005}&layer=mapnik&marker=${parking.latitude},${parking.longitude}`}
                        width="100%"
                        height="350"
                        style={{ border: 0 }}
                        allowFullScreen
                        loading="lazy"
                    />
                </div>

                
            </div>
        </AppLayout>
    );
}