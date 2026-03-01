// resources/js/pages/parking/available.tsx

import { Head, router, usePage } from '@inertiajs/react';
import { useState, useCallback, useEffect } from 'react';
import {
    Search,
    MapPin,
    Car,
    Navigation,
    Loader2,
    List,
    LayoutGrid,
    Clock,
    DollarSign,
    Filter,
    X,
    SlidersHorizontal,
    RefreshCw,
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    Star,
    Zap,
    Eye,
    Heart,
    Share2,
    ExternalLink,
    CalendarCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { BreadcrumbItem } from '@/types';
import debounce from 'lodash/debounce';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Available Parkings', href: '/parkings/available' },
];

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

type Parking = {
    id: number;
    name: string;
    description: string | null;
    address_label: string;
    city: string | null;
    latitude: number;
    longitude: number;
    total_spots: number;
    available_spots: number;
    detected_cars: number;
    price_per_hour: number;
    opening_time: string | null;
    closing_time: string | null;
    is_24h: boolean;
    photo_url: string | null;
    annotated_file_url: string | null;
    owner_name: string | null;
    status: string;
    distance?: number;
    distance_text?: string;
    is_open_now?: boolean;
    occupancy_percent?: number;
};

type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

type PageProps = {
    parkings: {
        data: Parking[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from: number;
        to: number;
        links: PaginationLink[];
    };
    filters?: Record<string, any>;
    cities?: string[];
    priceRange?: { min: number; max: number };
    sortOptions?: Array<{ value: string; label: string; order: string }>;
    flash?: {
        success?: string;
        error?: string;
        warning?: string;
        info?: string;
    };
};

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('fr-MA', {
        style: 'currency',
        currency: 'MAD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(price);
};

const formatDistance = (distance: number): string => {
    if (distance < 1) {
        return `${Math.round(distance * 1000)} m`;
    }
    return `${distance.toFixed(1)} km`;
};

const getOccupancyColor = (percent: number): string => {
    if (percent < 50) return 'text-green-500';
    if (percent < 80) return 'text-yellow-500';
    return 'text-red-500';
};

const getOccupancyBgColor = (percent: number): string => {
    if (percent < 50) return 'bg-green-500';
    if (percent < 80) return 'bg-yellow-500';
    return 'bg-red-500';
};

// ══════════════════════════════════════════════════════════════════════════════
export default function AvailableParkings({
    parkings,
    filters = {},
    cities = [],
    priceRange = { min: 0, max: 100 },
    sortOptions = [],
    flash,
}: PageProps) {
    const { errors } = usePage().props as any;

    const [isLoading, setIsLoading] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [favorites, setFavorites] = useState<number[]>([]);

    const [localFilters, setLocalFilters] = useState({
        q: filters.q || '',
        city: filters.city || '',
        min_price: filters.min_price || '',
        max_price: filters.max_price || '',
        min_spots: filters.min_spots || '',
        available_only: filters.available_only || false,
        open_now: filters.open_now || false,
        latitude: filters.latitude || '',
        longitude: filters.longitude || '',
        radius: filters.radius || '10',
        sort: filters.sort || 'created_at',
        order: filters.order || 'desc',
    });

    const defaultSortOptions = [
        { value: 'created_at', label: 'Most Recent', order: 'desc' },
        { value: 'price_per_hour', label: 'Price: Low to High', order: 'asc' },
        { value: 'price_per_hour', label: 'Price: High to Low', order: 'desc' },
        { value: 'available_spots', label: 'Most Available', order: 'desc' },
        { value: 'name', label: 'Name (A-Z)', order: 'asc' },
    ];

    const activeSortOptions =
        sortOptions.length > 0 ? sortOptions : defaultSortOptions;

    // Flash
    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success, { icon: '✅', duration: 4000 });
        }
        if (flash?.error) {
            toast.error(flash.error, { icon: '❌', duration: 6000 });
        }
        if (flash?.warning) {
            toast.warning(flash.warning, { icon: '⚠️', duration: 5000 });
        }
        if (flash?.info) {
            toast.info(flash.info, { icon: 'ℹ️', duration: 4000 });
        }
    }, [flash]);

    // Errors
    useEffect(() => {
        if (errors && Object.keys(errors).length > 0) {
            Object.entries(errors).forEach(([field, message]) => {
                toast.error(message as string, {
                    description: `Field: ${field}`,
                    duration: 6000,
                });
            });
        }
    }, [errors]);

    // Favorites from localStorage
    useEffect(() => {
        const savedFavorites = localStorage.getItem('parking_favorites');
        if (savedFavorites) {
            try {
                setFavorites(JSON.parse(savedFavorites));
            } catch {
                // ignore
            }
        }
    }, []);

    // SEARCH & FILTERS
    const performSearch = useCallback((newFilters: typeof localFilters) => {
        setIsLoading(true);

        const cleanFilters = Object.fromEntries(
            Object.entries(newFilters).filter(
                ([_, v]) => v !== '' && v !== null && v !== false
            )
        );

        router.get('/parkings/available', cleanFilters, {
            preserveState: true,
            preserveScroll: true,
            onError: (errors) => {
                toast.error('Failed to load parkings', {
                    description: 'Please try again later',
                    duration: 5000,
                });
                console.error('Search error:', errors);
            },
            onFinish: () => setIsLoading(false),
        });
    }, []);

    const debouncedSearch = useCallback(
        debounce((filters: typeof localFilters) => performSearch(filters), 500),
        [performSearch]
    );

    const handleSearchChange = (value: string) => {
        const newFilters = { ...localFilters, q: value };
        setLocalFilters(newFilters);
        debouncedSearch(newFilters);
    };

    const handleFilterChange = (key: string, value: any) => {
        setLocalFilters((prev) => ({ ...prev, [key]: value }));
    };

    const applyFilters = () => {
        performSearch(localFilters);
        setShowFilters(false);
        toast.success('Filters applied', { duration: 2000 });
    };

    const resetFilters = () => {
        const resetState = {
            q: '',
            city: '',
            min_price: '',
            max_price: '',
            min_spots: '',
            available_only: false,
            open_now: false,
            latitude: '',
            longitude: '',
            radius: '10',
            sort: 'created_at',
            order: 'desc',
        };
        setLocalFilters(resetState);
        performSearch(resetState);
        toast.info('Filters cleared', { duration: 2000 });
    };

    const handleSortChange = (value: string) => {
        const [sort, order] = value.split('-');
        const newFilters = { ...localFilters, sort, order };
        setLocalFilters(newFilters);
        performSearch(newFilters);
    };

    // GEOLOCATION
    const getCurrentLocation = () => {
        if (!navigator.geolocation) {
            toast.error('Geolocation not supported', {
                description: 'Your browser does not support geolocation',
                duration: 5000,
            });
            return;
        }

        setIsLocating(true);
        toast.loading('Getting your location...', { id: 'location' });

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const newFilters = {
                    ...localFilters,
                    latitude: position.coords.latitude.toString(),
                    longitude: position.coords.longitude.toString(),
                    sort: 'distance',
                    order: 'asc',
                };
                setLocalFilters(newFilters);
                performSearch(newFilters);
                setIsLocating(false);
                toast.success('Location found!', {
                    id: 'location',
                    description: 'Showing parkings near you',
                    duration: 3000,
                });
            },
            (error) => {
                setIsLocating(false);
                let errorMessage = 'Unable to get your location';

                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Location permission denied';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Location information unavailable';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Location request timed out';
                        break;
                }

                toast.error(errorMessage, {
                    id: 'location',
                    description:
                        'Please enable location services and try again',
                    duration: 5000,
                });
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000,
            }
        );
    };

    const clearLocation = () => {
        const newFilters = {
            ...localFilters,
            latitude: '',
            longitude: '',
            sort: 'created_at',
            order: 'desc',
        };
        setLocalFilters(newFilters);
        performSearch(newFilters);
        toast.info('Location filter cleared', { duration: 2000 });
    };

    // FAVORITES
    const toggleFavorite = (parkingId: number, parkingName: string) => {
        setFavorites((prev) => {
            const newFavorites = prev.includes(parkingId)
                ? prev.filter((id) => id !== parkingId)
                : [...prev, parkingId];

            localStorage.setItem(
                'parking_favorites',
                JSON.stringify(newFavorites)
            );

            if (newFavorites.includes(parkingId)) {
                toast.success(`Added to favorites`, {
                    description: parkingName,
                    icon: '❤️',
                    duration: 2000,
                });
            } else {
                toast.info(`Removed from favorites`, {
                    description: parkingName,
                    duration: 2000,
                });
            }

            return newFavorites;
        });
    };

    // SHARE
    const shareParking = async (parking: Parking) => {
        const url = `${window.location.origin}/parkings/${parking.id}`;
        const text = `Check out ${parking.name} - ${parking.available_spots} spots available at ${formatPrice(
            parking.price_per_hour
        )}/hour`;

        if (navigator.share) {
            try {
                await navigator.share({ title: parking.name, text, url });
                toast.success('Shared successfully!', { duration: 2000 });
            } catch (error) {
                if ((error as Error).name !== 'AbortError') {
                    copyToClipboard(url);
                }
            }
        } else {
            copyToClipboard(url);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard
            .writeText(text)
            .then(() => {
                toast.success('Link copied to clipboard!', {
                    icon: '📋',
                    duration: 2000,
                });
            })
            .catch(() => {
                toast.error('Failed to copy link', { duration: 2000 });
            });
    };

    // REFRESH
    const refreshData = () => {
        setIsLoading(true);
        toast.loading('Refreshing...', { id: 'refresh' });

        router.reload({
            only: ['parkings'],
            onSuccess: () => {
                toast.success('Data refreshed!', {
                    id: 'refresh',
                    duration: 2000,
                });
            },
            onError: () => {
                toast.error('Failed to refresh', {
                    id: 'refresh',
                    duration: 3000,
                });
            },
            onFinish: () => setIsLoading(false),
        });
    };

    const hasLocation = localFilters.latitude && localFilters.longitude;
    const activeFiltersCount = [
        localFilters.city,
        localFilters.min_price,
        localFilters.max_price,
        localFilters.min_spots,
        localFilters.available_only,
        localFilters.open_now,
    ].filter(Boolean).length;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Available Parkings" />

            <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* HEADER */}
                    <div className="mb-8">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                                    Available Parkings
                                </h1>
                                <p className="text-muted-foreground mt-2">
                                    Find and book the perfect parking spot
                                </p>
                            </div>

                            <Button
                                variant="outline"
                                onClick={refreshData}
                                disabled={isLoading}
                                className="self-start sm:self-auto"
                            >
                                <RefreshCw
                                    className={`h-4 w-4 mr-2 ${
                                        isLoading ? 'animate-spin' : ''
                                    }`}
                                />
                                Refresh
                            </Button>
                        </div>
                    </div>
 {/* ════════════════════════════════════════════════════════════ */}
                    {/* SEARCH BAR                                                  */}
                    {/* ════════════════════════════════════════════════════════════ */}
                    <div className="bg-card border rounded-2xl p-4 sm:p-6 mb-6 shadow-sm">
                        <div className="flex flex-col lg:flex-row gap-4">
                            {/* Search Input */}
                            <div className="flex-1 relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input
                                    type="text"
                                    placeholder="Search by name, city, or address..."
                                    value={localFilters.q}
                                    onChange={(e) => handleSearchChange(e.target.value)}
                                    className="pl-12 h-12 text-lg rounded-xl border-2 focus:border-primary transition-colors"
                                />
                                {isLoading && (
                                    <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-primary" />
                                )}
                            </div>

                            {/* Location Button */}
                            <Button
                                variant={hasLocation ? 'default' : 'outline'}
                                className={`h-12 px-6 rounded-xl transition-all ${
                                    hasLocation
                                        ? 'bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70'
                                        : ''
                                }`}
                                onClick={hasLocation ? clearLocation : getCurrentLocation}
                                disabled={isLocating}
                            >
                                {isLocating ? (
                                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                ) : (
                                    <Navigation
                                        className={`h-5 w-5 mr-2 transition-transform ${
                                            hasLocation ? 'fill-current' : ''
                                        }`}
                                    />
                                )}
                                {hasLocation ? 'Clear Location' : 'Near Me'}
                            </Button>

                            {/* Filters Button */}
                            <Button
                                variant="outline"
                                className="h-12 px-6 rounded-xl"
                                onClick={() => setShowFilters(!showFilters)}
                            >
                                <SlidersHorizontal className="h-5 w-5 mr-2" />
                                Filters
                                {activeFiltersCount > 0 && (
                                    <span className="ml-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                                        {activeFiltersCount}
                                    </span>
                                )}
                            </Button>
                        </div>

                        {/* Radius Selector (when location is active) */}
                        {hasLocation && (
                            <div className="mt-4 pt-4 border-t flex flex-wrap items-center gap-3">
                                <span className="text-sm text-muted-foreground font-medium">
                                    Search radius:
                                </span>
                                <div className="flex gap-2">
                                    {[5, 10, 20, 50].map((km) => (
                                        <Button
                                            key={km}
                                            variant={localFilters.radius === km.toString() ? 'default' : 'outline'}
                                            size="sm"
                                            className="rounded-full"
                                            onClick={() => {
                                                const f = { ...localFilters, radius: km.toString() };
                                                setLocalFilters(f);
                                                performSearch(f);
                                            }}
                                        >
                                            {km} km
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ════════════════════════════════════════════════════════════ */}
                    {/* FILTERS PANEL                                               */}
                    {/* ════════════════════════════════════════════════════════════ */}
                    {showFilters && (
                        <div className="bg-card border rounded-2xl p-6 mb-6 shadow-sm animate-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <Filter className="h-5 w-5 text-primary" />
                                    Advanced Filters
                                </h3>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowFilters(false)}
                                >
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                {/* City Filter */}
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2 text-sm font-medium">
                                        <MapPin className="h-4 w-4 text-muted-foreground" />
                                        City
                                    </Label>
                                    <select
                                        value={localFilters.city}
                                        onChange={(e) => handleFilterChange('city', e.target.value)}
                                        className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    >
                                        <option value="">All cities</option>
                                        {cities.map((city) => (
                                            <option key={city} value={city}>
                                                {city}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Min Price */}
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2 text-sm font-medium">
                                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                                        Min Price / hour
                                    </Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.5"
                                        placeholder={`${priceRange.min} MAD`}
                                        value={localFilters.min_price}
                                        onChange={(e) => handleFilterChange('min_price', e.target.value)}
                                        className="h-10"
                                    />
                                </div>

                                {/* Max Price */}
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2 text-sm font-medium">
                                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                                        Max Price / hour
                                    </Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.5"
                                        placeholder={`${priceRange.max} MAD`}
                                        value={localFilters.max_price}
                                        onChange={(e) => handleFilterChange('max_price', e.target.value)}
                                        className="h-10"
                                    />
                                </div>

                                {/* Min Spots */}
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2 text-sm font-medium">
                                        <Car className="h-4 w-4 text-muted-foreground" />
                                        Min Available Spots
                                    </Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        placeholder="1"
                                        value={localFilters.min_spots}
                                        onChange={(e) => handleFilterChange('min_spots', e.target.value)}
                                        className="h-10"
                                    />
                                </div>
                            </div>

                            {/* Checkboxes */}
                            <div className="mt-6 flex flex-wrap gap-6">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={localFilters.available_only as boolean}
                                        onChange={(e) => handleFilterChange('available_only', e.target.checked)}
                                        className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                    <span className="text-sm group-hover:text-primary transition-colors">
                                        Available spots only
                                    </span>
                                </label>

                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={localFilters.open_now as boolean}
                                        onChange={(e) => handleFilterChange('open_now', e.target.checked)}
                                        className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm group-hover:text-primary transition-colors">
                                        Open now
                                    </span>
                                </label>
                            </div>

                            {/* Filter Actions */}
                            <div className="mt-6 pt-6 border-t flex flex-col sm:flex-row justify-end gap-3">
                                <Button variant="outline" onClick={resetFilters} className="order-2 sm:order-1">
                                    <X className="h-4 w-4 mr-2" />
                                    Reset All
                                </Button>
                                <Button onClick={applyFilters} className="order-1 sm:order-2">
                                    <Filter className="h-4 w-4 mr-2" />
                                    Apply Filters
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* ════════════════════════════════════════════════════════════ */}
                    {/* TOOLBAR (Results count, Sort, View mode)                    */}
                    {/* ════════════════════════════════════════════════════════════ */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-2">
                            <Zap className="h-5 w-5 text-primary" />
                            <span className="text-sm">
                                <span className="font-bold text-foreground">{parkings.total}</span>
                                <span className="text-muted-foreground"> parking(s) found</span>
                            </span>
                            {parkings.total > 0 && (
                                <span className="text-xs text-muted-foreground">
                                    (showing {parkings.from}-{parkings.to})
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Sort Dropdown */}
                            <div className="flex items-center gap-2">
                                <Label className="text-sm text-muted-foreground whitespace-nowrap hidden sm:inline">
                                    Sort by:
                                </Label>
                                <select
                                    value={`${localFilters.sort}-${localFilters.order}`}
                                    onChange={(e) => handleSortChange(e.target.value)}
                                    className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                    {activeSortOptions.map((option) => (
                                        <option
                                            key={`${option.value}-${option.order}`}
                                            value={`${option.value}-${option.order}`}
                                        >
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* View Mode Toggle */}
                            <div className="flex border rounded-lg overflow-hidden">
                                <Button
                                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                                    size="sm"
                                    className="rounded-none px-3"
                                    onClick={() => setViewMode('grid')}
                                >
                                    <LayoutGrid className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                                    size="sm"
                                    className="rounded-none px-3"
                                    onClick={() => setViewMode('list')}
                                >
                                    <List className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>



                    {/* RESULTS */}
                    {parkings.data.length === 0 ? (
                        <EmptyState onReset={resetFilters} />
                    ) : (
                        <div
                            className={
                                viewMode === 'grid'
                                    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                                    : 'space-y-4'
                            }
                        >
                            {parkings.data.map((parking) => (
                                <ParkingCard
                                    key={parking.id}
                                    parking={parking}
                                    viewMode={viewMode}
                                    isFavorite={favorites.includes(parking.id)}
                                    onToggleFavorite={() =>
                                        toggleFavorite(parking.id, parking.name)
                                    }
                                    onShare={() => shareParking(parking)}
                                />
                            ))}
                        </div>
                    )}

                    {/* PAGINATION */}
                    {parkings.last_page > 1 && (
                        <Pagination
                            links={parkings.links}
                            currentPage={parkings.current_page}
                        />
                    )}
                </div>
            </div>
        </AppLayout>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// PARKING CARD COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

function ParkingCard({
    parking,
    viewMode,
    isFavorite,
    onToggleFavorite,
    onShare,
}: {
    parking: Parking;
    viewMode: 'grid' | 'list';
    isFavorite: boolean;
    onToggleFavorite: () => void;
    onShare: () => void;
}) {
    const occupancyPercent =
        parking.total_spots > 0
            ? Math.round(
                  ((parking.total_spots - parking.available_spots) /
                      parking.total_spots) *
                      100
              )
            : 0;

    const isOpen = parking.is_24h || parking.is_open_now;

    if (viewMode === 'list') {
        // ----- LIST VIEW (inchangée) -----
        return (
            <div className="group flex flex-col sm:flex-row gap-4 bg-card border rounded-xl p-4 hover:shadow-lg hover:border-primary/20 transition-all duration-300">
                {/* Image */}
                <div className="relative w-full sm:w-40 h-32 sm:h-28 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    {parking.photo_url ? (
                        <img
                            src={parking.photo_url}
                            alt={parking.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                            <Car className="h-10 w-10 text-muted-foreground/30" />
                        </div>
                    )}

                    {/* Status Badge */}
                    <div className="absolute top-2 left-2">
                        <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                                parking.available_spots > 0
                                    ? 'bg-green-500/90 text-white'
                                    : 'bg-red-500/90 text-white'
                            }`}
                        >
                            {parking.available_spots > 0
                                ? `${parking.available_spots} spots`
                                : 'Full'}
                        </span>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-colors">
                                {parking.name}
                            </h3>
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                <MapPin className="h-4 w-4 flex-shrink-0" />
                                <span className="truncate">
                                    {parking.city || parking.address_label}
                                </span>
                            </p>
                        </div>

                        {/* Price */}
                        <div className="text-right flex-shrink-0">
                            <div className="text-xl font-bold text-primary">
                                {formatPrice(parking.price_per_hour)}
                            </div>
                            <span className="text-xs text-muted-foreground">
                                /hour
                            </span>
                        </div>
                    </div>

                    {/* Info Row */}
                    <div className="flex flex-wrap items-center gap-3 mt-3 text-sm">
                        <span
                            className={
                                parking.available_spots > 0
                                    ? 'text-green-600'
                                    : 'text-red-600'
                            }
                        >
                            <Car className="h-4 w-4 inline mr-1" />
                            {parking.available_spots}/{parking.total_spots}
                        </span>

                        {parking.distance_text && (
                            <span className="text-muted-foreground">
                                <Navigation className="h-4 w-4 inline mr-1" />
                                {parking.distance_text}
                            </span>
                        )}

                        <span
                            className={
                                isOpen ? 'text-green-600' : 'text-red-600'
                            }
                        >
                            <Clock className="h-4 w-4 inline mr-1" />
                            {parking.is_24h
                                ? '24/7'
                                : isOpen
                                ? 'Open'
                                : 'Closed'}
                        </span>

                        {/* Occupancy Bar */}
                        <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${getOccupancyBgColor(
                                        occupancyPercent
                                    )} transition-all`}
                                    style={{
                                        width: `${occupancyPercent}%`,
                                    }}
                                />
                            </div>
                            <span
                                className={`text-xs ${getOccupancyColor(
                                    occupancyPercent
                                )}`}
                            >
                                {occupancyPercent}%
                            </span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-auto pt-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={onToggleFavorite}
                        >
                            <Heart
                                className={`h-4 w-4 transition-colors ${
                                    isFavorite
                                        ? 'fill-red-500 text-red-500'
                                        : ''
                                }`}
                            />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={onShare}
                        >
                            <Share2 className="h-4 w-4" />
                        </Button>
                        <div className="flex-1" />
                        <Button size="sm" asChild>
                            <a href={`/parkings/${parking.id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                            </a>
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // ----- GRID VIEW : avec bouton Booking sur l’image -----
    return (
        <div className="group bg-card border rounded-2xl overflow-hidden hover:shadow-xl hover:border-primary/20 transition-all duration-300 hover:-translate-y-1">
            {/* Image */}
            <div className="relative h-48 bg-muted overflow-hidden group/image">
                {parking.photo_url ? (
                    <img
                        src={parking.photo_url}
                        alt={parking.name}
                        className="w-full h-full object-cover group-hover/image:scale-110 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                        <Car className="h-16 w-16 text-muted-foreground/20" />
                    </div>
                )}

                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                {/* Top Right Actions */}
                <div className="absolute top-3 right-3 flex gap-2 z-20">
                    <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 bg-white/90 hover:bg-white shadow-sm"
                        onClick={onToggleFavorite}
                    >
                        <Heart
                            className={`h-4 w-4 transition-colors ${
                                isFavorite
                                    ? 'fill-red-500 text-red-500'
                                    : ''
                            }`}
                        />
                    </Button>
                    <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 bg-white/90 hover:bg-white shadow-sm"
                        onClick={onShare}
                    >
                        <Share2 className="h-4 w-4" />
                    </Button>
                </div>

                {/* Top Left Badge - Distance */}
                {parking.distance_text && (
                    <span className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1 z-20">
                        <Navigation className="h-3 w-3" />
                        {parking.distance_text}
                    </span>
                )}

                {/* Bottom Left - Availability */}
                <div className="absolute bottom-3 left-3 z-20">
                    <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg ${
                            parking.available_spots > 0
                                ? 'bg-green-500 text-white'
                                : 'bg-red-500 text-white'
                        }`}
                    >
                        <Car className="h-3.5 w-3.5" />
                        {parking.available_spots > 0
                            ? `${parking.available_spots} Available`
                            : 'Full'}
                    </span>
                </div>

                {/* Bottom Right - Open Status */}
                <div className="absolute bottom-3 right-3 z-20">
                    <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            isOpen
                                ? 'bg-green-500/20 text-green-100 backdrop-blur-sm'
                                : 'bg-red-500/20 text-red-100 backdrop-blur-sm'
                        }`}
                    >
                        <span
                            className={`w-1.5 h-1.5 rounded-full ${
                                isOpen ? 'bg-green-400' : 'bg-red-400'
                            } animate-pulse`}
                        />
                        {parking.is_24h ? '24/7' : isOpen ? 'Open' : 'Closed'}
                    </span>
                </div>

                {/* BOUTON BOOKING SUR L'IMAGE (animation pro) */}
                <div className="absolute inset-0 flex items-end justify-center pb-4 opacity-0 translate-y-4 group-hover/image:opacity-100 group-hover/image:translate-y-0 transition-all duration-300 ease-out pointer-events-none z-30">
                    <Button
                        size="sm"
                        className="bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-black/40 rounded-full px-4 py-2 flex items-center gap-2 pointer-events-auto"
                        onClick={(e) => {
                            e.preventDefault();
                            router.visit(
                                `/parkings/${parking.id}/reservations/create`
                            );
                        }}
                    >
                        <CalendarCheck className="h-4 w-4" />
                        Booking
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-colors">
                        {parking.name}
                    </h3>
                    {parking.owner_name && (
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded flex-shrink-0">
                            {parking.owner_name}
                        </span>
                    )}
                </div>

                <p className="text-sm text-muted-foreground flex items-center gap-1 mb-3">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">
                        {parking.city || parking.address_label}
                    </span>
                </p>

                {/* Occupancy Bar */}
                <div className="mb-4">
                    <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">
                            Occupancy
                        </span>
                        <span className={getOccupancyColor(occupancyPercent)}>
                            {occupancyPercent}%
                        </span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                            className={`h-full ${getOccupancyBgColor(
                                occupancyPercent
                            )} transition-all duration-500`}
                            style={{ width: `${occupancyPercent}%` }}
                        />
                    </div>
                </div>

                {/* Price & Action */}
                <div className="flex items-center justify-between pt-3 border-t">
                    <div>
                        <span className="text-2xl font-bold text-primary">
                            {formatPrice(parking.price_per_hour)}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">
                            /hour
                        </span>
                    </div>

                    <Button asChild className="rounded-xl">
                        <a href={`/parkings/${parking.id}`}>
                            View
                            <ExternalLink className="h-4 w-4 ml-2" />
                        </a>
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// EMPTY STATE
// ══════════════════════════════════════════════════════════════════════════════

function EmptyState({ onReset }: { onReset: () => void }) {
    return (
        <div className="text-center py-16 px-4">
            <div className="max-w-md mx-auto">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                    <AlertTriangle className="h-12 w-12 text-muted-foreground/50" />
                </div>
                <h3 className="text-2xl font-bold mb-2">No parkings found</h3>
                <p className="text-muted-foreground mb-8">
                    We couldn't find any parkings matching your criteria. Try
                    adjusting your filters or expanding your search area.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-3">
                    <Button variant="outline" onClick={onReset}>
                        <X className="h-4 w-4 mr-2" />
                        Clear All Filters
                    </Button>
                    <Button asChild>
                        <a href="/parkings/available">
                            <Search className="h-4 w-4 mr-2" />
                            Advanced Search
                        </a>
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGINATION
// ══════════════════════════════════════════════════════════════════════════════

function Pagination({
    links,
    currentPage,
}: {
    links: PaginationLink[];
    currentPage: number;
}) {
    const handlePageClick = (url: string | null) => {
        if (!url) return;

        toast.loading('Loading...', { id: 'pagination' });

        router.get(
            url,
            {},
            {
                preserveState: true,
                preserveScroll: false,
                onSuccess: () => {
                    toast.dismiss('pagination');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                },
                onError: () => {
                    toast.error('Failed to load page', {
                        id: 'pagination',
                    });
                },
            }
        );
    };

    return (
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="flex items-center gap-1">
                {links.map((link, index) => {
                    const isPrev =
                        link.label.includes('Previous') ||
                        link.label.includes('&laquo;');
                    const isNext =
                        link.label.includes('Next') ||
                        link.label.includes('&raquo;');

                    if (isPrev) {
                        return (
                            <Button
                                key={index}
                                variant="outline"
                                size="icon"
                                disabled={!link.url}
                                onClick={() => handlePageClick(link.url)}
                                className="h-10 w-10"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                        );
                    }

                    if (isNext) {
                        return (
                            <Button
                                key={index}
                                variant="outline"
                                size="icon"
                                disabled={!link.url}
                                onClick={() => handlePageClick(link.url)}
                                className="h-10 w-10"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        );
                    }

                    return (
                        <Button
                            key={index}
                            variant={link.active ? 'default' : 'outline'}
                            size="sm"
                            disabled={!link.url || link.active}
                            onClick={() => handlePageClick(link.url)}
                            className="h-10 min-w-[40px]"
                        >
                            {link.label}
                        </Button>
                    );
                })}
            </div>
        </div>
    );
}