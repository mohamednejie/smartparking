// resources/js/pages/parking/create.tsx

import { Head, useForm, usePage, router } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import InputError from '@/components/input-error';
import { Spinner } from '@/components/ui/spinner';
import { MapPin, CheckCircle, AlertTriangle, Navigation } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import MapPicker from '@/components/map-picker';

export default function CreateParking() {
    const { flash, errors: serverErrors } = usePage().props as any;

    const { data, setData, post, processing, errors } = useForm({
        name: '',
        description: '',
        latitude: '',
        longitude: '',
        address_label: '',
        total_spots: '',
        price_per_hour: '',
        opening_time: '',
        closing_time: '',
        is_24h: false,
        photo: null as File | null,
        city: '',
    });

    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
    const [isLocating, setIsLocating] = useState(false);

    // Validation côté client
    const validateField = (field: string, value: string) => {
        let error = '';
        switch (field) {
            case 'name':
                if (!value.trim()) error = 'Parking name is required.';
                else if (value.length > 255) error = 'Max 255 characters.';
                break;
            case 'city':
                if (!value.trim()) error = 'Parking city is required.';
                else if (value.length > 255) error = 'Max 255 characters.';
                break;
            case 'latitude':
                if (!value) error = 'Latitude is required.';
                else if (parseFloat(value) < -90 || parseFloat(value) > 90) error = 'Must be between -90 and 90.';
                break;
            case 'longitude':
                if (!value) error = 'Longitude is required.';
                else if (parseFloat(value) < -180 || parseFloat(value) > 180) error = 'Must be between -180 and 180.';
                break;
            case 'total_spots':
                if (!value) error = 'Required.';
                else if (parseInt(value) < 1) error = 'At least 1 spot.';
                break;
            case 'price_per_hour':
                if (!value) error = 'Required.';
                else if (parseFloat(value) < 0) error = 'Cannot be negative.';
                break;
        }
        setClientErrors((prev) => {
            const copy = { ...prev };
            if (error) copy[field] = error;
            else delete copy[field];
            return copy;
        });
    };

    const getError = (field: string) => clientErrors[field] || errors[field];

    // 🔥 Sélection sur la carte
    const handleLocationSelect = (lat: number, lng: number) => {
        const latStr = lat.toFixed(7);
        const lngStr = lng.toFixed(7);

        setData((prev) => ({
            ...prev,
            latitude: latStr,
            longitude: lngStr,
        }));

        // Effacer les erreurs de lat/lng
        setClientErrors((prev) => {
            const copy = { ...prev };
            delete copy.latitude;
            delete copy.longitude;
            return copy;
        });

        // Reverse geocoding
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latStr}&lon=${lngStr}`)
            .then((r) => r.json())
            .then((res) => {
                if (res.display_name) {
                    setData((prev) => ({ ...prev, address_label: res.display_name }));
                }
            })
            .catch(() => {});
    };

    // Géolocalisation GPS
    const getCurrentLocation = () => {
        if (!navigator.geolocation) return alert('Geolocation not supported');

        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                handleLocationSelect(pos.coords.latitude, pos.coords.longitude);
                setIsLocating(false);
            },
            (err) => {
                alert('Error: ' + err.message);
                setIsLocating(false);
            }
        );
    };

    // Photo
    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setData('photo', file);

        if (!file) {
            setClientErrors((prev) => ({ ...prev, photo: 'Photo is required.' }));
            setPhotoPreview(null);
        } else if (file.size > 4096 * 1024) {
            setClientErrors((prev) => ({ ...prev, photo: 'Max 4MB.' }));
            setPhotoPreview(null);
        } else if (!file.type.startsWith('image/')) {
            setClientErrors((prev) => ({ ...prev, photo: 'Must be an image.' }));
            setPhotoPreview(null);
        } else {
            setClientErrors((prev) => {
                const c = { ...prev };
                delete c.photo;
                return c;
            });
            const reader = new FileReader();
            reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (Object.keys(clientErrors).length > 0) return;
        post('/parkings', {
            forceFormData: true,
            onSuccess: () => {
                setPhotoPreview(null);
            },
        });
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'My Parkings', href: '/parkings' },
                { title: 'Add', href: '/parkings/create' },
            ]}
        >
            <Head title="Add Parking" />

            <div className="mx-auto max-w-2xl py-8 px-4">
                <h1 className="text-2xl font-bold mb-8">Add a Parking</h1>

                {/* Alerts */}
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

                {serverErrors?.limit && (
                    <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                        <AlertTriangle className="h-5 w-5 shrink-0" />
                        <p>{serverErrors.limit}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* ═══ Nom ═══ */}
                    <div className="grid gap-2">
                        <Label htmlFor="name">Parking Name *</Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => {
                                setData('name', e.target.value);
                                validateField('name', e.target.value);
                            }}
                            onBlur={(e) => validateField('name', e.target.value)}
                            placeholder="My Parking"
                            className={getError('name') ? 'border-red-500' : ''}
                        />
                        <InputError message={getError('name')} />
                    </div>
                     {/* ═══ city ═══ */}
                    <div className="grid gap-2">
                        <Label htmlFor="city">City *</Label>
                        <Input
                            id="city"
                            value={data.city}

                            onChange={(e) => {
                                setData('city', e.target.value);
                                validateField('city', e.target.value);
                            }}
                            onBlur={(e) => validateField('city', e.target.value)}
                            placeholder="My City"
                            className={getError('city') ? 'border-red-500' : ''}
                        />
                        <InputError message={getError('city')} />
                    </div>

                    {/* ═══ Description ═══ */}
                    <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <textarea
                            id="description"
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            placeholder="Describe your parking..."
                            className="w-full rounded border px-3 py-2 text-sm"
                            rows={3}
                            maxLength={1000}
                        />
                    </div>

                    {/* ═══ Localisation avec carte interactive ═══ */}
                    <div className="space-y-4 rounded-lg border p-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-base font-semibold">
                                <MapPin className="inline h-4 w-4 mr-1" />
                                Location *
                            </Label>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={getCurrentLocation}
                                disabled={isLocating}
                            >
                                {isLocating ? (
                                    <><Spinner /> Locating...</>
                                ) : (
                                    <><Navigation className="mr-1 h-4 w-4" /> Use my location</>
                                )}
                            </Button>
                        </div>

                        {/* 🔥 Carte interactive */}
                        <MapPicker
                            latitude={data.latitude ? parseFloat(data.latitude) : null}
                            longitude={data.longitude ? parseFloat(data.longitude) : null}
                            onLocationSelect={handleLocationSelect}
                            height="400px"
                        />

                        {/* Lat/Lng inputs */}
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Latitude</Label>
                                <Input
                                    type="number"
                                    step="any"
                                    value={data.latitude}
                                    onChange={(e) => {
                                        setData('latitude', e.target.value);
                                        validateField('latitude', e.target.value);
                                    }}
                                    onBlur={(e) => validateField('latitude', e.target.value)}
                                    placeholder="36.8065"
                                    className={getError('latitude') ? 'border-red-500' : ''}
                                />
                                <InputError message={getError('latitude')} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Longitude</Label>
                                <Input
                                    type="number"
                                    step="any"
                                    value={data.longitude}
                                    onChange={(e) => {
                                        setData('longitude', e.target.value);
                                        validateField('longitude', e.target.value);
                                    }}
                                    onBlur={(e) => validateField('longitude', e.target.value)}
                                    placeholder="10.1815"
                                    className={getError('longitude') ? 'border-red-500' : ''}
                                />
                                <InputError message={getError('longitude')} />
                            </div>
                        </div>

                        {/* Adresse générée */}
                        {data.address_label && (
                            <div className="flex items-start gap-2 rounded-lg bg-muted p-3">
                                <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">{data.address_label}</p>
                            </div>
                        )}
                    </div>

                    {/* ═══ Spots + Prix ═══ */}
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Total Spots *</Label>
                            <Input
                                type="number"
                                min="1"
                                value={data.total_spots}
                                onChange={(e) => {
                                    setData('total_spots', e.target.value);
                                    validateField('total_spots', e.target.value);
                                }}
                                onBlur={(e) => validateField('total_spots', e.target.value)}
                                placeholder="50"
                                className={getError('total_spots') ? 'border-red-500' : ''}
                            />
                            <InputError message={getError('total_spots')} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Price / Hour (TND) *</Label>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={data.price_per_hour}
                                onChange={(e) => {
                                    setData('price_per_hour', e.target.value);
                                    validateField('price_per_hour', e.target.value);
                                }}
                                onBlur={(e) => validateField('price_per_hour', e.target.value)}
                                placeholder="2.00"
                                className={getError('price_per_hour') ? 'border-red-500' : ''}
                            />
                            <InputError message={getError('price_per_hour')} />
                        </div>
                    </div>

                    {/* ═══ Horaires ═══ */}
                    <div className="space-y-3 rounded-lg border p-4">
                        <Label className="text-base font-semibold">Hours</Label>
                        <div className="flex items-center space-x-3">
                            <Checkbox
                                id="is_24h"
                                checked={data.is_24h}
                                onCheckedChange={(c) => setData('is_24h', !!c)}
                            />
                            <Label htmlFor="is_24h">Open 24/7</Label>
                        </div>
                        {!data.is_24h && (
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Opening</Label>
                                    <Input
                                        type="time"
                                        value={data.opening_time}
                                        onChange={(e) => setData('opening_time', e.target.value)}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Closing</Label>
                                    <Input
                                        type="time"
                                        value={data.closing_time}
                                        onChange={(e) => setData('closing_time', e.target.value)}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ═══ Photo ═══ */}
                    <div className="grid gap-2">
                        <Label>Parking Photo *</Label>
                        <Input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoChange}
                            className={getError('photo') ? 'border-red-500' : ''}
                        />
                        <InputError message={getError('photo')} />
                        {photoPreview && (
                            <img
                                src={photoPreview}
                                alt="Preview"
                                className="mt-2 max-w-xs rounded-lg border"
                            />
                        )}
                    </div>

                    {/* ═══ Submit ═══ */}
                    <div className="flex gap-4">
                        <Button type="submit" className="flex-1" disabled={processing}>
                            {processing && <Spinner />} Add Parking
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.visit('/parkings')}
                        >
                            Cancel
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}