// resources/js/pages/parking/edit.tsx

import { Head, useForm, router, usePage } from '@inertiajs/react';
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import InputError from '@/components/input-error';
import { Spinner } from '@/components/ui/spinner';
import { MapPin, CheckCircle, Navigation } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import MapPicker from '@/components/map-picker';

type Props = {
    parking: {
        id: number;
        name: string;
        description: string | null;
        latitude: number;
        longitude: number;
        address_label: string | null;
        total_spots: number;
        price_per_hour: number;
        opening_time: string | null;
        closing_time: string | null;
        is_24h: boolean;
        photo_url: string | null;
        city: string;
    };
};

export default function EditParking({ parking }: Props) {
    const { flash } = usePage().props as any;

    const { data, setData, post, processing, errors } = useForm({
        _method: 'PUT',
        name: parking.name,
        description: parking.description || '',
        latitude: String(parking.latitude),
        longitude: String(parking.longitude),
        address_label: parking.address_label || '',
        total_spots: String(parking.total_spots),
        price_per_hour: String(parking.price_per_hour),
        opening_time: parking.opening_time || '',
        closing_time: parking.closing_time || '',
        is_24h: parking.is_24h,
        photo: null as File | null,
        city: parking.city || '',
        cancel_time_limit: String(parking.cancel_time_limit || 30),
    });

    const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [isLocating, setIsLocating] = useState(false);

    // Validation
    const validateField = (field: string, value: string) => {
        let error = '';
        switch (field) {
            case 'name':
                if (!value.trim()) error = 'Name is required.';
                break;
            case 'city':
                if (!value.trim()) error = 'City is required.';
                break;
            case 'cancel_time_limit':
                if (!value.trim()) error = 'Cancel time limit is required.';
                else if (parseInt(value) < 10 || parseInt(value) > 1000) error = 'Must be between 10 and 1000.';
                break;     
            case 'latitude':
                if (!value) error = 'Required.';
                else if (parseFloat(value) < -90 || parseFloat(value) > 90) error = 'Must be -90 to 90.';
                break;
            case 'longitude':
                if (!value) error = 'Required.';
                else if (parseFloat(value) < -180 || parseFloat(value) > 180) error = 'Must be -180 to 180.';
                break;
            case 'total_spots':
                if (!value || parseInt(value) < 1) error = 'At least 1 spot.';
                break;
            case 'price_per_hour':
                if (!value || parseFloat(value) < 0) error = 'Cannot be negative.';
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

    // Location
    const handleLocationSelect = (lat: number, lng: number) => {
        const latStr = lat.toFixed(7);
        const lngStr = lng.toFixed(7);
        setData((prev) => ({ ...prev, latitude: latStr, longitude: lngStr }));
        setClientErrors((prev) => {
            const copy = { ...prev };
            delete copy.latitude;
            delete copy.longitude;
            return copy;
        });
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latStr}&lon=${lngStr}`)
            .then((r) => r.json())
            .then((res) => {
                if (res.display_name) {
                    setData((prev) => ({ ...prev, address_label: res.display_name }));
                }
            })
            .catch(() => {});
    };

    const getCurrentLocation = () => {
        if (!navigator.geolocation) return alert('Not supported');
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
        if (file) {
            if (file.size > 4096 * 1024) {
                setClientErrors((prev) => ({ ...prev, photo: 'Max 4MB.' }));
            } else {
                setClientErrors((prev) => {
                    const c = { ...prev };
                    delete c.photo;
                    return c;
                });
            }
            const reader = new FileReader();
            reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
            reader.readAsDataURL(file);
        } else {
            setPhotoPreview(null);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (Object.keys(clientErrors).length > 0) return;
        post(`/parkings/${parking.id}`, { forceFormData: true });
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'My Parkings', href: '/parkings' },
                { title: 'Edit', href: `/parkings/${parking.id}/edit` },
            ]}
        >
            <Head title={`Edit - ${parking.name}`} />

            <div className="mx-auto max-w-2xl py-8 px-4">
                <h1 className="text-2xl font-bold mb-8">Edit Parking</h1>

                {flash?.success && (
                    <div className="mb-6 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                        <CheckCircle className="h-5 w-5 shrink-0" /> {flash.success}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Name */}
                    <div className="grid gap-2">
                        <Label>Parking Name *</Label>
                        <Input
                            value={data.name}
                            onChange={(e) => {
                                setData('name', e.target.value);
                                validateField('name', e.target.value);
                            }}
                            onBlur={(e) => validateField('name', e.target.value)}
                            className={getError('name') ? 'border-red-500' : ''}
                        />
                        <InputError message={getError('name')} />
                    </div>
                    {/* city */}
                    <div className="grid gap-2">
                        <Label> City *</Label>
                        <Input
                            value={data.city}
                            onChange={(e) => {
                                setData('city', e.target.value);
                                validateField('city', e.target.value);
                            }}
                            onBlur={(e) => validateField('city', e.target.value)}
                            className={getError('city') ? 'border-red-500' : ''}
                        />
                        <InputError message={getError('city')} />
                    </div>

                    {/* Description */}
                    <div className="grid gap-2">
                        <Label>Description</Label>
                        <textarea
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            className="w-full rounded border px-3 py-2 text-sm"
                            rows={3}
                            maxLength={1000}
                        />
                    </div>

                    {/* Location */}
                    <div className="space-y-4 rounded-lg border p-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-base font-semibold">
                                <MapPin className="inline h-4 w-4 mr-1" /> Location *
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

                        <MapPicker
                            latitude={data.latitude ? parseFloat(data.latitude) : null}
                            longitude={data.longitude ? parseFloat(data.longitude) : null}
                            onLocationSelect={handleLocationSelect}
                            height="400px"
                        />

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
                                    className={getError('longitude') ? 'border-red-500' : ''}
                                />
                                <InputError message={getError('longitude')} />
                            </div>
                        </div>

                        {data.address_label && (
                            <div className="flex items-start gap-2 rounded-lg bg-muted p-3">
                                <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">{data.address_label}</p>
                            </div>
                        )}
                    </div>

                    {/* Spots + Prix */}
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
                                className={getError('price_per_hour') ? 'border-red-500' : ''}
                            />
                            <InputError message={getError('price_per_hour')} />
                        </div>
                    </div>

                    {/* Hours */}
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
                         <div className="grid gap-2">
                            <Label>cancel time limit (minutes) *</Label>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={data.cancel_time_limit}
                                onChange={(e) => {
                                    setData('cancel_time_limit', e.target.value);
                                    validateField('cancel_time_limit', e.target.value);
                                }}
                                onBlur={(e) => validateField('cancel_time_limit', e.target.value)}
                                className={getError('cancel_time_limit') ? 'border-red-500' : ''}
                            />
                            <InputError message={getError('cancel_time_limit')} />
                        </div>
                    </div>

                    {/* Photo */}
                    <div className="grid gap-2">
                        <Label>Photo (optional)</Label>
                        {parking.photo_url && !photoPreview && (
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Current photo:</p>
                                <img src={parking.photo_url} alt="Current" className="max-w-xs rounded-lg border" />
                            </div>
                        )}
                        <Input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoChange}
                            className={getError('photo') ? 'border-red-500' : ''}
                        />
                        <InputError message={getError('photo')} />
                        {photoPreview && (
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">New photo:</p>
                                <img src={photoPreview} alt="Preview" className="max-w-xs rounded-lg border" />
                            </div>
                        )}
                    </div>

                    {/* Submit */}
                    <div className="flex gap-4">
                        <Button type="submit" className="flex-1" disabled={processing}>
                            {processing && <Spinner />} Update Parking
                        </Button>
                        <Button type="button" variant="outline" onClick={() => router.visit('/parkings')}>
                            Cancel
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}