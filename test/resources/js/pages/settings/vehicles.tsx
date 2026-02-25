import { Dialog, Transition } from '@headlessui/react';
import { Head, router, usePage } from '@inertiajs/react';
import { Fragment, useState, useCallback } from 'react';
import { Car, Plus, Trash2, Star, Edit2, X, AlertTriangle, Check, AlertCircle } from 'lucide-react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Settings', href: '/settings/profile' },
    { title: 'My Vehicles', href: '/settings/vehicles' },
];

type Vehicle = {
    id: number;
    license_plate: string;
    brand: string | null;
    model: string | null;
    color: string | null;
    type: string | null;
    year: number | null;
    is_primary: boolean;
};

type PageProps = {
    vehicles: Vehicle[];
    vehicleTypes: Record<string, string>;
};

// 🔥 Validation de plaque côté frontend
// 🔥 Validation de plaque côté frontend (VERSION STRICTE)
const validateLicensePlate = (plate: string): { isValid: boolean; error: string | null; formatted: string } => {
    const original = plate;
    const cleaned = plate.toUpperCase().trim();
    
    // Supprimer les caractères non autorisés
    const sanitized = cleaned.replace(/[^A-Z0-9\-\s]/g, '');
    
    // Vérifications de base
    if (sanitized.length === 0) {
        return { isValid: false, error: null, formatted: '' };
    }
    
    // ✅ LONGUEUR MINIMALE: 4 caractères
    if (sanitized.length < 4) {
        return { isValid: false, error: 'At least 4 characters required', formatted: sanitized };
    }
    
    if (sanitized.length > 20) {
        return { isValid: false, error: 'Maximum 20 characters allowed', formatted: sanitized.substring(0, 20) };
    }
    
    // Retirer les séparateurs pour vérification
    const cleanedNoSeparators = sanitized.replace(/[\-\s]/g, '');
    
    // ✅ VÉRIFIER LA LONGUEUR NETTOYÉE
    if (cleanedNoSeparators.length < 4) {
        return { isValid: false, error: 'Must contain at least 4 letters/numbers', formatted: sanitized };
    }
    
    // ✅ VÉRIFIER PRÉSENCE DE LETTRES **ET** CHIFFRES
    const hasLetters = /[A-Z]/.test(cleanedNoSeparators);
    const hasNumbers = /[0-9]/.test(cleanedNoSeparators);
    
    if (!hasLetters || !hasNumbers) {
        return { isValid: false, error: 'Must contain both letters AND numbers', formatted: sanitized };
    }
    
    // ✅ VÉRIFIER MINIMUM 2 LETTRES ET 2 CHIFFRES
    const letterCount = (cleanedNoSeparators.match(/[A-Z]/g) || []).length;
    const numberCount = (cleanedNoSeparators.match(/[0-9]/g) || []).length;
    
    if (letterCount < 2 || numberCount < 2) {
        return { isValid: false, error: 'At least 2 letters and 2 numbers required', formatted: sanitized };
    }
    
    // Vérifier les plaques interdites
    const forbiddenPlates = ['TEST', 'FAKE', 'NULL', 'VOID', 'NONE', 'XXX', 'XXXX', 'AAAA', 'ZZZZ', 'POLICE'];
    
    if (forbiddenPlates.includes(cleanedNoSeparators)) {
        return { isValid: false, error: 'This plate is reserved/forbidden', formatted: sanitized };
    }
    
    // Vérifier les caractères répétés
    if (/(.)\1{4,}/.test(cleanedNoSeparators)) {
        return { isValid: false, error: 'Too many repeated characters', formatted: sanitized };
    }
    
    // ✅ Vérifier qu'il ne contient pas QUE des lettres ou QUE des chiffres
    if (/^[A-Z]+$/.test(cleanedNoSeparators) || /^[0-9]+$/.test(cleanedNoSeparators)) {
        return { isValid: false, error: 'Must mix letters and numbers', formatted: sanitized };
    }
    
    // Patterns valides (STRICTS)
    const patterns = [
        // France: AB-123-CD (strict)
        /^[A-Z]{2}[-\s]?\d{3}[-\s]?[A-Z]{2}$/,
        
        // Maroc: formats variés mais minimum 4 caractères
        /^(\d{3,5}[-\s]?[A-Z]{1,2}[-\s]?\d{1,2})|([A-Z]{2,3}[-\s]?\d{4,6})$/,
        
        // Allemagne: M-AB-1234
        /^[A-Z]{1,3}[-\s][A-Z]{1,2}[-\s]\d{1,4}$/,
        
        // UK: AB12 CDE
        /^[A-Z]{2}\d{2}[-\s]?[A-Z]{3}$/,
        
        // USA: 4-8 caractères alphanumériques
        /^[A-Z0-9]{4,8}$/,
        
        // Espagne: 1234-ABC
        /^\d{4}[-\s]?[A-Z]{3}$/,
        
        // Générique STRICT: au moins 2 lettres ET 2 chiffres, 4-20 caractères
        /^(?=.*[A-Z].*[A-Z])(?=.*\d.*\d)[A-Z0-9\-\s]{4,20}$/,
    ];
    
    const isValidFormat = patterns.some(pattern => pattern.test(sanitized));
    
    // Formatage automatique pour la France (AB-123-CD)
    let formatted = sanitized;
    const frenchMatch = cleanedNoSeparators.match(/^([A-Z]{2})(\d{3})([A-Z]{2})$/);
    if (frenchMatch) {
        formatted = `${frenchMatch[1]}-${frenchMatch[2]}-${frenchMatch[3]}`;
    }
    
    if (!isValidFormat) {
        return { 
            isValid: false, 
            error: 'Invalid format (e.g., AB-1234, 12-AB-34)', 
            formatted: sanitized 
        };
    }
    
    return { isValid: true, error: null, formatted };
};
// 🔥 Formatage automatique pendant la saisie
const formatLicensePlateInput = (value: string): string => {
    // Supprimer les caractères non autorisés
    let formatted = value.toUpperCase().replace(/[^A-Z0-9\-\s]/g, '');
    
    // Limiter la longueur
    formatted = formatted.substring(0, 20);
    
    // Auto-format pour le pattern français (optionnel)
    const noSeparators = formatted.replace(/[\-\s]/g, '');
    
    if (noSeparators.length === 7) {
        const match = noSeparators.match(/^([A-Z]{2})(\d{3})([A-Z]{2})$/);
        if (match) {
            return `${match[1]}-${match[2]}-${match[3]}`;
        }
    }
    
    return formatted;
};

export default function Vehicles({ vehicles = [], vehicleTypes = {} }: PageProps) {
    const { errors } = usePage().props as any;

    const [showVehicleModal, setShowVehicleModal] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
    const [vehicleProcessing, setVehicleProcessing] = useState(false);

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
    const [deleteProcessing, setDeleteProcessing] = useState(false);

    // 🔥 État pour la validation de la plaque
    const [plateValue, setPlateValue] = useState('');
    const [plateValidation, setPlateValidation] = useState<{ isValid: boolean; error: string | null }>({ isValid: false, error: null });

    // ══════════════════════════════════════════════
    // LICENSE PLATE HANDLERS
    // ══════════════════════════════════════════════

    const handlePlateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatLicensePlateInput(e.target.value);
        setPlateValue(formatted);
        
        const validation = validateLicensePlate(formatted);
        setPlateValidation({ isValid: validation.isValid, error: validation.error });
    }, []);

    // ══════════════════════════════════════════════
    // VEHICLE MODAL HANDLERS
    // ══════════════════════════════════════════════

    const openAddVehicle = () => {
        setEditingVehicle(null);
        setPlateValue('');
        setPlateValidation({ isValid: false, error: null });
        setShowVehicleModal(true);
    };

    const openEditVehicle = (vehicle: Vehicle) => {
        setEditingVehicle(vehicle);
        setPlateValue(vehicle.license_plate);
        setPlateValidation({ isValid: true, error: null });
        setShowVehicleModal(true);
    };

    const closeVehicleModal = () => {
        setShowVehicleModal(false);
        setEditingVehicle(null);
        setPlateValue('');
        setPlateValidation({ isValid: false, error: null });
    };

    const handleVehicleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        // Valider la plaque avant soumission
        const validation = validateLicensePlate(plateValue);
        if (!validation.isValid) {
            setPlateValidation({ isValid: false, error: validation.error || 'Invalid license plate' });
            return;
        }
        
        setVehicleProcessing(true);

        const formData = new FormData(e.currentTarget);
        const data: Record<string, any> = {};
        formData.forEach((value, key) => {
            data[key] = value;
        });

        // Utiliser la plaque formatée
        data['license_plate'] = validation.formatted;
        data['is_primary'] = formData.has('is_primary') ? true : false;

        const url = editingVehicle
            ? `/settings/vehicles/${editingVehicle.id}`
            : '/settings/vehicles';

        const method = editingVehicle ? 'put' : 'post';

        router[method](url, data, {
            preserveScroll: true,
            onSuccess: () => closeVehicleModal(),
            onFinish: () => setVehicleProcessing(false),
        });
    };

    // ══════════════════════════════════════════════
    // DELETE MODAL HANDLERS
    // ══════════════════════════════════════════════

    const openDeleteModal = (vehicle: Vehicle) => {
        setVehicleToDelete(vehicle);
        setShowDeleteModal(true);
    };

    const closeDeleteModal = () => {
        setShowDeleteModal(false);
        setVehicleToDelete(null);
    };

    const confirmDeleteVehicle = () => {
        if (!vehicleToDelete) return;

        setDeleteProcessing(true);

        router.delete(`/settings/vehicles/${vehicleToDelete.id}`, {
            preserveScroll: true,
            onSuccess: () => closeDeleteModal(),
            onFinish: () => setDeleteProcessing(false),
        });
    };

    const handleSetPrimary = (vehicle: Vehicle) => {
        router.patch(
            `/settings/vehicles/${vehicle.id}/primary`,
            {},
            { preserveScroll: true }
        );
    };

    // 🔥 Déterminer la couleur de l'input selon la validation
    const getPlateInputClasses = () => {
        if (plateValue.length === 0) return 'border-input';
        if (plateValidation.isValid) return 'border-green-500 focus:ring-green-500';
        if (plateValidation.error) return 'border-red-500 focus:ring-red-500';
        return 'border-input';
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="My Vehicles" />

            <SettingsLayout>
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <Heading
                            variant="small"
                            title="My Vehicles"
                            description="Manage your registered vehicles and license plates"
                        />
                        <Button
                            onClick={openAddVehicle}
                            disabled={vehicles.length >= 5}
                            className="flex items-center gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            Add Vehicle
                        </Button>
                    </div>

                    {/* Info box */}
                    <div className="rounded-lg border border-cyan-200 bg-cyan-50 dark:border-cyan-800 dark:bg-cyan-950/30 p-4">
                        <div className="flex gap-3">
                            <Car className="h-5 w-5 text-cyan-600 dark:text-cyan-400 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-cyan-800 dark:text-cyan-300">
                                <p className="font-semibold">Accepted license plate formats</p>
                                <ul className="mt-1 list-disc list-inside space-y-1 text-cyan-700 dark:text-cyan-400">
                                    <li>France: AB-123-CD</li>
                                    <li>Germany: M-AB-1234</li>
                                    <li>Morocco: 12345-A-1</li>
                                    <li>And other international formats</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Empty state */}
                    {vehicles.length === 0 ? (
                        <div className="text-center py-16 bg-muted/30 rounded-xl border-2 border-dashed">
                            <div className="flex justify-center mb-4">
                                <div className="p-4 rounded-full bg-muted">
                                    <Car className="h-12 w-12 text-muted-foreground/50" />
                                </div>
                            </div>
                            <h3 className="text-lg font-semibold text-foreground">
                                No vehicles registered
                            </h3>
                            <p className="text-muted-foreground mt-1 mb-6">
                                Add your first vehicle to start booking parking spots
                            </p>
                            <Button onClick={openAddVehicle}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Your First Vehicle
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Vehicle count */}
                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                                <span>
                                    {vehicles.length} of 5 vehicles registered
                                </span>
                                <div className="flex gap-1">
                                    {[...Array(5)].map((_, i) => (
                                        <div
                                            key={i}
                                            className={`h-2 w-6 rounded-full ${
                                                i < vehicles.length
                                                    ? 'bg-cyan-500'
                                                    : 'bg-muted'
                                            }`}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Vehicles list */}
                            <div className="space-y-3">
                                {vehicles.map((vehicle) => (
                                    <div
                                        key={vehicle.id}
                                        className={`group flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-200 ${
                                            vehicle.is_primary
                                                ? 'bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-300 dark:from-cyan-950/30 dark:to-blue-950/30 dark:border-cyan-700'
                                                : 'bg-card border-transparent hover:border-muted-foreground/20 hover:shadow-md'
                                        }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div
                                                className={`p-3 rounded-xl ${
                                                    vehicle.is_primary
                                                        ? 'bg-gradient-to-br from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25'
                                                        : 'bg-muted text-muted-foreground'
                                                }`}
                                            >
                                                <Car className="h-6 w-6" />
                                            </div>

                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xl font-bold tracking-wider">
                                                        {vehicle.license_plate}
                                                    </span>
                                                    {vehicle.is_primary && (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-sm">
                                                            <Star className="h-3 w-3 fill-current" />
                                                            PRIMARY
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    {[
                                                        vehicle.brand,
                                                        vehicle.model,
                                                        vehicle.year,
                                                        vehicle.color,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(' • ') || 'No details added'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {!vehicle.is_primary && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleSetPrimary(vehicle)}
                                                    className="text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50"
                                                >
                                                    <Star className="h-4 w-4 mr-1" />
                                                    Set Primary
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => openEditVehicle(vehicle)}
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => openDeleteModal(vehicle)}
                                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </SettingsLayout>

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* MODAL AJOUT/MODIFICATION VÉHICULE                             */}
            {/* ══════════════════════════════════════════════════════════════ */}
            <Transition appear show={showVehicleModal} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={closeVehicleModal}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-200"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-150"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
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
                                <Dialog.Panel className="w-full max-w-md rounded-2xl bg-white dark:bg-neutral-900 shadow-2xl overflow-hidden">
                                    {/* Header */}
                                    <div className="bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-4">
                                        <div className="flex items-center justify-between">
                                            <Dialog.Title className="text-lg font-semibold text-white flex items-center gap-2">
                                                <Car className="h-5 w-5" />
                                                {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
                                            </Dialog.Title>
                                            <button
                                                onClick={closeVehicleModal}
                                                className="p-1 rounded-full hover:bg-white/20 transition-colors"
                                            >
                                                <X className="h-5 w-5 text-white" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Form */}
                                    <form onSubmit={handleVehicleSubmit} className="p-6 space-y-4">
                                        {/* 🔥 License Plate avec validation en temps réel */}
                                        <div className="grid gap-2">
                                            <Label htmlFor="license_plate">
                                                License Plate <span className="text-red-500">*</span>
                                            </Label>
                                            <div className="relative">
                                                <Input
                                                    id="license_plate"
                                                    name="license_plate"
                                                    required
                                                    placeholder="AB-123-CD"
                                                    value={plateValue}
                                                    onChange={handlePlateChange}
                                                    className={`font-mono text-xl tracking-wider uppercase text-center pr-10 ${getPlateInputClasses()}`}
                                                    maxLength={20}
                                                    autoComplete="off"
                                                />
                                                {/* Icône de validation */}
                                                {plateValue.length > 0 && (
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                        {plateValidation.isValid ? (
                                                            <Check className="h-5 w-5 text-green-500" />
                                                        ) : plateValidation.error ? (
                                                            <AlertCircle className="h-5 w-5 text-red-500" />
                                                        ) : null}
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Message d'erreur ou aide */}
                                            {plateValidation.error ? (
                                                <p className="text-sm text-red-500 flex items-center gap-1">
                                                    <AlertCircle className="h-4 w-4" />
                                                    {plateValidation.error}
                                                </p>
                                            ) : plateValue.length > 0 && plateValidation.isValid ? (
                                                <p className="text-sm text-green-600 flex items-center gap-1">
                                                    <Check className="h-4 w-4" />
                                                    Valid license plate format
                                                </p>
                                            ) : (
                                                <p className="text-xs text-muted-foreground">
                                                    Enter your vehicle's license plate (e.g., AB-123-CD)
                                                </p>
                                            )}
                                            
                                            <InputError message={errors?.license_plate} />
                                        </div>

                                        {/* Brand & Model */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="grid gap-2">
                                                <Label htmlFor="brand">Brand</Label>
                                                <Input
                                                    id="brand"
                                                    name="brand"
                                                    placeholder="Toyota"
                                                    defaultValue={editingVehicle?.brand ?? ''}
                                                    pattern="[a-zA-Z0-9\s\-]+"
                                                    title="Letters, numbers, spaces and hyphens only"
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="model">Model</Label>
                                                <Input
                                                    id="model"
                                                    name="model"
                                                    placeholder="Corolla"
                                                    defaultValue={editingVehicle?.model ?? ''}
                                                    pattern="[a-zA-Z0-9\s\-]+"
                                                    title="Letters, numbers, spaces and hyphens only"
                                                />
                                            </div>
                                        </div>

                                        {/* Color & Year */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="grid gap-2">
                                                <Label htmlFor="color">Color</Label>
                                                <Input
                                                    id="color"
                                                    name="color"
                                                    placeholder="Silver"
                                                    defaultValue={editingVehicle?.color ?? ''}
                                                    pattern="[a-zA-Z\s]+"
                                                    title="Letters and spaces only"
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="year">Year</Label>
                                                <Input
                                                    id="year"
                                                    name="year"
                                                    type="number"
                                                    placeholder="2023"
                                                    defaultValue={editingVehicle?.year ?? ''}
                                                    min={1900}
                                                    max={new Date().getFullYear() + 1}
                                                />
                                            </div>
                                        </div>

                                        {/* Type */}
                                        <div className="grid gap-2">
                                            <Label htmlFor="type">Vehicle Type</Label>
                                            <select
                                                id="type"
                                                name="type"
                                                defaultValue={editingVehicle?.type ?? ''}
                                                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                            >
                                                <option value="">Select type...</option>
                                                {Object.entries(vehicleTypes).map(([value, label]) => (
                                                    <option key={value} value={value}>
                                                        {label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Set as Primary */}
                                        {vehicles.length > 0 && !editingVehicle?.is_primary && (
                                            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                                                <input
                                                    type="checkbox"
                                                    id="is_primary"
                                                    name="is_primary"
                                                    className="h-4 w-4 rounded border-gray-300 text-cyan-500 focus:ring-cyan-500"
                                                />
                                                <Label htmlFor="is_primary" className="font-normal cursor-pointer">
                                                    Set as primary vehicle
                                                </Label>
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div className="flex gap-3 pt-4">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={closeVehicleModal}
                                                className="flex-1"
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                type="submit"
                                                disabled={vehicleProcessing || !plateValidation.isValid}
                                                className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50"
                                            >
                                                {vehicleProcessing
                                                    ? 'Saving...'
                                                    : editingVehicle
                                                    ? 'Update Vehicle'
                                                    : 'Add Vehicle'}
                                            </Button>
                                        </div>
                                    </form>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* MODAL DE SUPPRESSION                                          */}
            {/* ══════════════════════════════════════════════════════════════ */}
            <Transition appear show={showDeleteModal} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={closeDeleteModal}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-neutral-900 shadow-2xl">
                                    {/* Header */}
                                    <div className="bg-red-50 dark:bg-red-950/30 px-6 py-8">
                                        <div className="flex justify-center">
                                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
                                                <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
                                            </div>
                                        </div>
                                        <Dialog.Title className="mt-4 text-center text-xl font-bold text-gray-900 dark:text-white">
                                            Delete Vehicle
                                        </Dialog.Title>
                                        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
                                            This action cannot be undone
                                        </p>
                                    </div>

                                    {/* Content */}
                                    <div className="px-6 py-6">
                                        {vehicleToDelete && (
                                            <div className="mb-6">
                                                <div className="rounded-xl border-2 border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20 p-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white dark:bg-neutral-800 shadow-sm">
                                                            <Car className="h-6 w-6 text-red-500" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-mono text-lg font-bold">
                                                                    {vehicleToDelete.license_plate}
                                                                </span>
                                                                {vehicleToDelete.is_primary && (
                                                                    <span className="rounded-full bg-cyan-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                                                                        PRIMARY
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-muted-foreground">
                                                                {[
                                                                    vehicleToDelete.brand,
                                                                    vehicleToDelete.model,
                                                                    vehicleToDelete.year,
                                                                ]
                                                                    .filter(Boolean)
                                                                    .join(' • ') || 'No details'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex gap-3">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={closeDeleteModal}
                                                disabled={deleteProcessing}
                                                className="flex-1"
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                type="button"
                                                onClick={confirmDeleteVehicle}
                                                disabled={deleteProcessing}
                                                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                                            >
                                                {deleteProcessing ? 'Deleting...' : 'Delete Vehicle'}
                                            </Button>
                                        </div>
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