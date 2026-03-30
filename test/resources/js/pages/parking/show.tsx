import { Head, router } from '@inertiajs/react'
import { toast } from 'sonner'
import { useState, useMemo, useEffect, useRef } from 'react'
import axios from 'axios'
import {
    MapPin, Car, Clock, Edit, ArrowLeft, Power, PowerOff,
    CalendarCheck, Navigation, Shield, Sparkles, Timer,
    CircleParking, BadgeCheck, AlertTriangle, ExternalLink,
    Search, ChevronDown, ChevronUp, Calendar, Mail,
    TrendingUp, DollarSign, ClipboardList, X, Video,
    Camera as CameraIcon, AlertCircle, LayoutGrid, PlayCircle,
    StopCircle, ScanLine, CarFront, Maximize, Minimize, Loader2,
    RefreshCw, Trash2, CheckCircle2, XCircle, HelpCircle, LogOut,
    Wifi, WifiOff, Bug, ListFilter, ArrowUpDown, ArrowUp, ArrowDown, Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import AppLayout from '@/layouts/app-layout'

// ─── CONFIGURATION ───────────────────────────────────────────────────────────
const FLASK_API_URL      = 'http://localhost:5000'
const POLLING_INTERVAL   = 1500
const DEBUG_MODE         = true
const PAGE_SIZE          = 10

const debugLog = (...args: any[]) => { if (DEBUG_MODE) console.log('[DEBUG]', ...args) }

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const STATUS_FILTERS = [
    { key: 'all',       label: 'All'       },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'active',    label: 'Active'    },
    { key: 'pending',   label: 'Pending'   },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
]

// ─── TYPES ───────────────────────────────────────────────────────────────────
type Camera = {
    id: number
    name: string
    type: 'gate' | 'zone'
    stream_url: string
    status: string
}

type PlateDetection = {
    plate: string
    time: string
    date: string
    timestamp: number
    status: string
    confidence?: number
}

type LiveAIData = {
    total_cars: number
    free_spots: number | string
    occupied_spots: number | string
    infractions: number | string
    last_plate: string | null
    last_plate_time: string | null
    last_plate_status: string | null
    last_update: number | null
    recent_plates: PlateDetection[]
    detection_count: number
}

type Reservation = {
    id: number
    user_name: string
    user_email: string
    vehicle_plate: string
    vehicle_brand: string
    vehicle_model: string
    start_time: string
    end_time: string
    status: string
    total_price: number
    created_at: string
    user_avatar?: string | null
}

type Props = {
    parking: {
        id: number
        name: string
        description: string | null
        address_label: string | null
        latitude: number
        longitude: number
        total_spots: number
        available_spots: number
        detected_cars: number
        price_per_hour: number
        is_24h: boolean
        opening_time: string | null
        closing_time: string | null
        status: string
        photo_url: string | null
        annotated_file_url: string | null
        created_at: string
        city: string | null
        cancel_time_limit?: number | null
        cameras?: Camera[]
    }
    isPremium: boolean
    isOwner: boolean
    reservations: Reservation[]
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function isParkingOpenNow(parking: { is_24h: boolean; opening_time: string | null; closing_time: string | null }) {
    if (parking.is_24h) return true
    if (!parking.opening_time || !parking.closing_time) return false
    const nowTime = new Date().toTimeString().slice(0, 5)
    return nowTime >= parking.opening_time && nowTime < parking.closing_time
}

function getOccupancyPercent(total: number, available: number) {
    if (total <= 0) return 0
    const occupied = Math.max(0, total - Math.max(0, available))
    return Math.min(100, Math.round((occupied / total) * 100))
}

function formatDateShort(dateStr: string): string {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatTime(dateStr: string): string {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function getStatusConfig(status: string) {
    switch (status) {
        case 'confirmed':
        case 'active':
            return { label: status === 'active' ? 'Active' : 'Confirmed', bg: 'bg-emerald-50 dark:bg-emerald-950', text: 'text-emerald-700 dark:text-emerald-300', ring: 'ring-emerald-200 dark:ring-emerald-800', icon: BadgeCheck }
        case 'pending':
            return { label: 'Pending',   bg: 'bg-amber-50 dark:bg-amber-950', text: 'text-amber-700 dark:text-amber-300',   ring: 'ring-amber-200 dark:ring-amber-800',   icon: Clock      }
        case 'completed':
            return { label: 'Completed', bg: 'bg-blue-50 dark:bg-blue-950',   text: 'text-blue-700 dark:text-blue-300',     ring: 'ring-blue-200 dark:ring-blue-800',     icon: BadgeCheck }
        case 'cancelled':
            return { label: 'Cancelled', bg: 'bg-red-50 dark:bg-red-950',     text: 'text-red-700 dark:text-red-300',       ring: 'ring-red-200 dark:ring-red-800',       icon: X          }
        default:
            return { label: status,      bg: 'bg-gray-50 dark:bg-gray-900',   text: 'text-gray-600 dark:text-gray-400',     ring: 'ring-gray-200 dark:ring-gray-800',     icon: Clock      }
    }
}

function getPlateStatusConfig(status: string) {
    switch (status) {
        case 'authorized':     return { label: 'Autorisé',      color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle2  }
        case 'exiting':        return { label: 'Sortie',         color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-200',    icon: LogOut        }
        case 'unknown':        return { label: 'Inconnu',        color: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-200',     icon: XCircle       }
        case 'no_reservation': return { label: 'Sans réserv.',   color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200',   icon: AlertTriangle }
        default:               return { label: 'Détecté',        color: 'text-slate-600',   bg: 'bg-slate-50',   border: 'border-slate-200',   icon: HelpCircle    }
    }
}

// ─── COMPOSANT PRINCIPAL ──────────────────────────────────────────────────────
export default function ShowParking({ parking, isPremium, isOwner, reservations = [] }: Props) {
    const lat   = Number(parking.latitude)
    const lng   = Number(parking.longitude)
    const price = Number(parking.price_per_hour)
    const isOpen = isParkingOpenNow(parking)

    // ── Tabs & Cameras ──────────────────────────────────────────────────────
    const [activeTab,       setActiveTab]       = useState<'overview' | 'cameras' | 'reservations'>('overview')
    const [activeCameras,   setActiveCameras]   = useState<string[]>([])
    const [liveAIData,      setLiveAIData]      = useState<LiveAIData | null>(null)
    const [isFullscreen,    setIsFullscreen]    = useState(false)
    const [loadingCameras,  setLoadingCameras]  = useState<string[]>([])
    const [connectionError, setConnectionError] = useState<string | null>(null)
    const [lastDetectedPlate, setLastDetectedPlate] = useState<string | null>(null)
    const [isServerOnline,  setIsServerOnline]  = useState<boolean | null>(null)
    const [showDebugPanel,  setShowDebugPanel]  = useState(DEBUG_MODE)
    const [isSyncingState,  setIsSyncingState]  = useState(true)   // ✅ FIX: état de sync initial
    const lastNotifiedPlateRef = useRef<string | null>(null)

    // ── Reservations states ─────────────────────────────────────────────────
    const [searchQuery,    setSearchQuery]    = useState('')
    const [selectedDay,    setSelectedDay]    = useState('')
    const [selectedMonth,  setSelectedMonth]  = useState('')
    const [statusFilter,   setStatusFilter]   = useState('all')
    const [currentPage,    setCurrentPage]    = useState(1)
    const [expandedRow,    setExpandedRow]    = useState<number | null>(null)
    const [sortField,      setSortField]      = useState<'start_time' | 'total_price' | null>(null)
    const [sortDirection,  setSortDirection]  = useState<'asc' | 'desc'>('asc')

    // ══════════════════════════════════════════════════════════════════════════
    // ✅ FIX 1 — SYNC DE L'ÉTAT DES CAMÉRAS AU MONTAGE
    // Au lieu de partir avec activeCameras = [], on interroge Flask pour savoir
    // quelles caméras tournent déjà côté serveur, et on restaure l'état local
    // sans les redémarrer. Cela résout le bug "Caméra déjà active" après navigation.
    // ══════════════════════════════════════════════════════════════════════════
    useEffect(() => {
        const syncCameraState = async () => {
            setIsSyncingState(true)
            try {
                const response = await axios.get(
                    `${FLASK_API_URL}/api/parking/${parking.id}/cameras/status`,
                    { timeout: 3000 }
                )
                if (response.data.success) {
                    const activeCams = response.data.cameras
                        .filter((c: any) => c.active === true)
                        .map((c: any) => c.type as string)

                    if (activeCams.length > 0) {
                        debugLog('Caméras déjà actives côté Flask:', activeCams)
                        setActiveCameras(activeCams)
                        toast.info(`🔄 ${activeCams.length} caméra(s) restaurée(s)`, {
                            description: `Déjà actives côté serveur : ${activeCams.join(', ')}`
                        })
                    }
                }
            } catch {
                debugLog('Sync state: serveur non disponible, on part de zéro')
            } finally {
                setIsSyncingState(false)
            }
        }
        syncCameraState()
    }, [parking.id])

    // ══════════════════════════════════════════════════════════════════════════
    // ✅ FIX 2 — NETTOYAGE AU DÉMONTAGE (beforeunload + cleanup React)
    // Arrête proprement les caméras quand on quitte la page.
    // On utilise sendBeacon pour les cas où React démonte trop vite.
    // ══════════════════════════════════════════════════════════════════════════
    useEffect(() => {
        const activeCamerasSnapshot = [...activeCameras]

        // Cleanup React classique (fonctionne dans la plupart des cas)
        return () => {
            if (activeCamerasSnapshot.length === 0) return
            debugLog('Démontage: arrêt des caméras', activeCamerasSnapshot)
            activeCamerasSnapshot.forEach((camType) => {
                // On utilise fetch en mode keepalive pour être sûr que la requête parte
                fetch(`${FLASK_API_URL}/api/parking/${parking.id}/camera/stop`, {
                    method:   'POST',
                    headers:  { 'Content-Type': 'application/json' },
                    body:     JSON.stringify({ camera_type: camType }),
                    keepalive: true,
                }).catch(() => {})
            })
        }
    }, [activeCameras, parking.id])

    // ─── Valeurs dynamiques temps réel ───────────────────────────────────────
    const liveDetectedCars = liveAIData?.total_cars ?? parking.detected_cars

    const liveAvailableSpots = useMemo(() => {
        if (!liveAIData) return parking.available_spots
        if (typeof liveAIData.free_spots === 'number') return Math.max(0, liveAIData.free_spots)
        if (typeof liveAIData.total_cars === 'number') return Math.max(0, parking.total_spots - liveAIData.total_cars)
        return parking.available_spots
    }, [liveAIData, parking.total_spots, parking.available_spots])

    const liveOccupancy = getOccupancyPercent(parking.total_spots, liveAvailableSpots)
    const isLive        = activeCameras.length > 0 && liveAIData !== null

    // ─── Sort ─────────────────────────────────────────────────────────────────
    const toggleSort = (field: 'start_time' | 'total_price') => {
        if (sortField === field) setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
        else { setSortField(field); setSortDirection('asc') }
        setCurrentPage(1)
    }

    const SortIcon = ({ field }: { field: 'start_time' | 'total_price' }) => {
        if (sortField !== field) return <ArrowUpDown className="inline h-3 w-3 ml-1 opacity-40" />
        return sortDirection === 'asc'
            ? <ArrowUp   className="inline h-3 w-3 ml-1 text-primary" />
            : <ArrowDown className="inline h-3 w-3 ml-1 text-primary" />
    }

    // ─── Filtered reservations ────────────────────────────────────────────────
    const filteredReservations = useMemo(() => {
        let list = [...reservations]
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase()
            list = list.filter(r =>
                r.user_name.toLowerCase().includes(q) ||
                r.vehicle_plate.toLowerCase().includes(q) ||
                r.user_email.toLowerCase().includes(q)
            )
        }
        if (statusFilter !== 'all')  list = list.filter(r => r.status === statusFilter)
        if (selectedDay)             list = list.filter(r => r.start_time.startsWith(selectedDay))
        if (selectedMonth)           list = list.filter(r => r.start_time.startsWith(selectedMonth))
        if (sortField) {
            list.sort((a, b) => {
                const valA: number | string = sortField === 'start_time' ? a.start_time : Number(a.total_price)
                const valB: number | string = sortField === 'start_time' ? b.start_time : Number(b.total_price)
                if (valA < valB) return sortDirection === 'asc' ? -1 : 1
                if (valA > valB) return sortDirection === 'asc' ?  1 : -1
                return 0
            })
        }
        return list
    }, [reservations, searchQuery, statusFilter, selectedDay, selectedMonth, sortField, sortDirection])

    const totalFiltered       = filteredReservations.length
    const totalPages          = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE))
    const paginatedReservations = filteredReservations.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
    )

    const reservationStats = useMemo(() => ({
        total:        reservations.length,
        active:       reservations.filter(r => ['active', 'confirmed'].includes(r.status)).length,
        pending:      reservations.filter(r => r.status === 'pending').length,
        totalRevenue: reservations
            .filter(r => ['completed', 'active', 'confirmed'].includes(r.status))
            .reduce((sum, r) => sum + Number(r.total_price), 0)
    }), [reservations])

    // ── Server health check ───────────────────────────────────────────────────
    useEffect(() => {
        const checkServer = async () => {
            try {
                const response = await axios.get(`${FLASK_API_URL}/api/health`, { timeout: 3000 })
                setIsServerOnline(response.data.status === 'healthy')
            } catch {
                setIsServerOnline(false)
            }
        }
        checkServer()
        const interval = setInterval(checkServer, 10000)
        return () => clearInterval(interval)
    }, [])

    // ── Start camera ──────────────────────────────────────────────────────────
    const startCamera = async (camera: Camera) => {
        setLoadingCameras(prev => [...prev, camera.type])
        setConnectionError(null)
        try {
            await axios.post(`${FLASK_API_URL}/api/parking/${parking.id}/setup`, {
                mode: isPremium ? 'premium' : 'basic',
            })
            const response = await axios.post(`${FLASK_API_URL}/api/parking/${parking.id}/camera/start`, {
                camera_type: camera.type,
                stream_url:  camera.stream_url,
                name:        camera.name
            })
            if (response.data.success) {
                setActiveCameras(prev => [...prev, camera.type])
                toast.success(`🟢 ${camera.name} démarrée`, {
                    description: camera.type === 'gate' ? 'Détection de plaques active' : 'Surveillance parking active'
                })
            }
        } catch (error: any) {
            // ✅ FIX 3 — Si Flask dit "déjà active", on réconcilie le state local
            // plutôt que d'afficher une erreur et de bloquer l'utilisateur.
            if (error.response?.data?.error?.includes('déjà active')) {
                debugLog(`Caméra ${camera.type} déjà active côté serveur → sync state local`)
                if (!activeCameras.includes(camera.type)) {
                    setActiveCameras(prev => [...prev, camera.type])
                }
                toast.info(`📡 ${camera.name} déjà active`, {
                    description: 'Reconnexion au flux en cours...'
                })
            } else {
                setConnectionError(error.response?.data?.error || error.message)
                toast.error('❌ Erreur', { description: error.response?.data?.error || 'Connexion impossible' })
            }
        } finally {
            setLoadingCameras(prev => prev.filter(t => t !== camera.type))
        }
    }

    // ── Stop camera ───────────────────────────────────────────────────────────
    const stopCamera = async (camera: Camera) => {
        setLoadingCameras(prev => [...prev, camera.type])
        try {
            const response = await axios.post(
                `${FLASK_API_URL}/api/parking/${parking.id}/camera/stop`,
                { camera_type: camera.type },
                { headers: { 'Content-Type': 'application/json' }, timeout: 5000 }
            )
            if (response.data.success) {
                setActiveCameras(prev => prev.filter(t => t !== camera.type))
                toast.info(`🔴 ${camera.name} arrêtée`)
            }
        } catch {
            toast.error("Erreur lors de l'arrêt")
        } finally {
            setLoadingCameras(prev => prev.filter(t => t !== camera.type))
        }
    }

    const toggleCamera = (camera: Camera) => {
        activeCameras.includes(camera.type) ? stopCamera(camera) : startCamera(camera)
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ✅ FIX 4 — POLLING FONCTIONNEL QUEL QUE SOIT L'ONGLET ACTIF
    // Le polling démarre dès qu'une caméra est active (même si on est sur
    // l'onglet Overview ou Reservations), et reset les données quand tout est éteint.
    // ══════════════════════════════════════════════════════════════════════════
    useEffect(() => {
        if (activeCameras.length === 0) {
            setLiveAIData(null)
            return
        }

        const fetchLiveData = async () => {
            try {
                const response = await axios.get(`${FLASK_API_URL}/api/parking/${parking.id}/live_status`)
                if (response.data.status === 'online') {
                    const newData = response.data.data as LiveAIData

                    // Notification pour nouvelle plaque
                    if (newData.last_plate && newData.last_plate !== lastNotifiedPlateRef.current) {
                        lastNotifiedPlateRef.current = newData.last_plate
                        setLastDetectedPlate(newData.last_plate)
                        const statusConfig = getPlateStatusConfig(newData.last_plate_status || 'detected')
                        toast(
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${statusConfig.bg}`}>
                                    <CarFront className={`h-5 w-5 ${statusConfig.color}`} />
                                </div>
                                <div>
                                    <p className="font-bold font-mono text-lg">{newData.last_plate}</p>
                                    <p className={`text-sm ${statusConfig.color}`}>{statusConfig.label}</p>
                                </div>
                            </div>,
                            { duration: 5000 }
                        )
                    }

                    setLiveAIData(newData)
                    setConnectionError(null)
                    debugLog('Live data updated:', {
                        total_cars:     newData.total_cars,
                        free_spots:     newData.free_spots,
                        occupied_spots: newData.occupied_spots
                    })
                } else {
                    // ✅ Si Flask répond "offline" alors qu'on a des caméras localement actives,
                    // on garde les dernières données (ne pas reset).
                    debugLog('Flask dit offline mais activeCameras non vide — on conserve les données')
                }
            } catch (error) {
                debugLog('Polling error:', error)
            }
        }

        fetchLiveData()
        const interval = setInterval(fetchLiveData, POLLING_INTERVAL)
        return () => clearInterval(interval)
    }, [activeCameras, parking.id])

    // ── Clear plate history ───────────────────────────────────────────────────
    const clearHistory = async () => {
        try {
            await axios.post(`${FLASK_API_URL}/api/parking/${parking.id}/clear_history`)
            setLiveAIData(prev => prev
                ? { ...prev, recent_plates: [], detection_count: 0, last_plate: null, last_plate_time: null, last_plate_status: null }
                : null
            )
            lastNotifiedPlateRef.current = null
            setLastDetectedPlate(null)
            toast.success('🗑️ Historique effacé')
        } catch {
            toast.error('Erreur')
        }
    }

    // ── Fullscreen ────────────────────────────────────────────────────────────
    const toggleFullscreen = (cameraType: string) => {
        const container = document.getElementById(`camera-container-${cameraType}`)
        if (!document.fullscreenElement) {
            container?.requestFullscreen()
            setIsFullscreen(true)
        } else {
            document.exitFullscreen()
            setIsFullscreen(false)
        }
    }

    useEffect(() => {
        const handler = () => setIsFullscreen(!!document.fullscreenElement)
        document.addEventListener('fullscreenchange', handler)
        return () => document.removeEventListener('fullscreenchange', handler)
    }, [])

    // ── Render video feed ─────────────────────────────────────────────────────
    const renderVideoFeed = (camera: Camera) => {
        const isCamActive = activeCameras.includes(camera.type)
        const isLoading   = loadingCameras.includes(camera.type)

        if (isSyncingState) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-900">
                    <Loader2 className="h-10 w-10 animate-spin mb-3" />
                    <span className="text-sm">Vérification de l'état...</span>
                </div>
            )
        }

        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-900">
                    <Loader2 className="h-10 w-10 animate-spin mb-3" />
                    <span className="text-sm">Connexion...</span>
                </div>
            )
        }

        if (!isCamActive) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-900">
                    <Video className="h-12 w-12 mb-3 opacity-30" />
                    <span className="text-sm font-medium">Caméra désactivée</span>
                    <span className="text-xs text-slate-500 mt-1 px-4 text-center truncate max-w-full">{camera.stream_url}</span>
                </div>
            )
        }

        // ✅ On ajoute parking.id + camera.type dans la clé de l'img pour forcer
        // un rechargement propre du stream quand on revient sur la page.
        const feedUrl = `${FLASK_API_URL}/api/parking/${parking.id}/camera/${camera.type}/stream`
        return (
            <>
                <img
                    key={`${parking.id}-${camera.type}-stream`}
                    src={feedUrl}
                    alt={`Flux ${camera.name}`}
                    className="w-full h-full object-contain bg-black"
                    onError={(e) => {
                        const target   = e.target as HTMLImageElement
                        target.style.display = 'none'
                        const errorDiv = target.nextElementSibling as HTMLElement | null
                        if (errorDiv) errorDiv.classList.replace('hidden', 'flex')
                    }}
                />
                <div className="hidden absolute inset-0 flex-col items-center justify-center bg-slate-900 text-slate-400">
                    <AlertCircle className="h-10 w-10 mb-2 opacity-50" />
                    <p className="text-sm">Erreur de connexion</p>
                    <p className="text-xs mt-2 px-4 text-center">{camera.stream_url}</p>
                </div>
                <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/70 z-10">
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-white uppercase">Live</span>
                </div>
                <div className="absolute top-3 right-12 px-2 py-1 rounded-md bg-black/70 z-10">
                    <span className={`text-[10px] font-bold uppercase ${camera.type === 'gate' ? 'text-amber-400' : 'text-indigo-400'}`}>
                        {camera.type === 'gate' ? '🚗 Entrée/Sortie' : '🅿️ Zone'}
                    </span>
                </div>
            </>
        )
    }

    const renderPlateStatusBadge = (status: string) => {
        const config = getPlateStatusConfig(status)
        const Icon   = config.icon
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${config.bg} ${config.color} border ${config.border}`}>
                <Icon className="h-3 w-3" />
                {config.label}
            </span>
        )
    }

    // ══════════════════════════════════════════════════════════════════════════
    // RENDER
    // ══════════════════════════════════════════════════════════════════════════
    return (
        <AppLayout breadcrumbs={[
            { title: isOwner ? 'Mes Parkings' : 'Parkings', href: isOwner ? '/parkings' : '/parkings/available' },
            { title: parking.name, href: `/parkings/${parking.id}` }
        ]}>
            <Head title={parking.name} />

            <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">

                {/* HEADER */}
                <div className="mb-6 flex items-center justify-between">
                    <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => router.visit(isOwner ? '/parkings' : '/parkings/available')}>
                        <ArrowLeft className="h-4 w-4" /> Retour
                    </Button>
                    <div className="flex items-center gap-2">
                        {/* Server Status */}
                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${isServerOnline === null ? 'bg-gray-100 text-gray-500' : isServerOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {isServerOnline === null ? <Loader2 className="h-3 w-3 animate-spin" /> : isServerOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                            <span>{isServerOnline ? 'IA Online' : 'IA Offline'}</span>
                        </div>

                        {/* Sync indicator */}
                        {isSyncingState && (
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                                <RefreshCw className="h-3 w-3 animate-spin" />
                                <span>Sync...</span>
                            </div>
                        )}

                        {/* Live Indicator */}
                        {isLive && (
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs bg-green-100 text-green-700 animate-pulse">
                                <Zap className="h-3 w-3" />
                                <span>LIVE</span>
                            </div>
                        )}

                        {/* Active Cameras */}
                        {activeCameras.length > 0 && (
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                                <CameraIcon className="h-3 w-3" />
                                <span>{activeCameras.length} active{activeCameras.length > 1 ? 's' : ''}</span>
                            </div>
                        )}

                        {/* Debug Button */}
                        <Button variant="ghost" size="sm" onClick={() => setShowDebugPanel(!showDebugPanel)} className={showDebugPanel ? 'bg-amber-100 text-amber-700' : ''}>
                            <Bug className="h-4 w-4" />
                        </Button>

                        {/* Edit Button */}
                        {isOwner && (
                            <Button size="sm" onClick={() => router.visit(`/parkings/${parking.id}/edit`)}>
                                <Edit className="h-3.5 w-3.5 mr-1" /> Modifier
                            </Button>
                        )}
                    </div>
                </div>

                {/* TABS */}
                {isOwner && (
                    <div className="mb-8 flex gap-2 border-b pb-px overflow-x-auto">
                        {[
                            { key: 'overview',      label: 'OVERVIEW',         icon: LayoutGrid  },
                            { key: 'cameras',       label: 'Live Monitoring',  icon: Video       },
                            { key: 'reservations',  label: 'Reservations',     icon: ClipboardList },
                        ].map(({ key, label, icon: Icon }) => (
                            <button
                                key={key}
                                onClick={() => setActiveTab(key as any)}
                                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === key ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                            >
                                <Icon className="w-4 h-4" />
                                {label}
                                {key === 'cameras' && parking.cameras && (
                                    <span className="bg-slate-200 text-slate-600 text-[10px] px-1.5 py-0.5 rounded-full">{parking.cameras.length}</span>
                                )}
                                {key === 'cameras' && activeCameras.length > 0 && (
                                    <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full animate-pulse">LIVE</span>
                                )}
                                {key === 'reservations' && (
                                    <span className="bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded-full">{reservations.length}</span>
                                )}
                            </button>
                        ))}
                    </div>
                )}

                <div className="animate-in fade-in duration-300">

                    {/* ══════════════════════════════════════
                        TAB: OVERVIEW
                    ══════════════════════════════════════ */}
                    {(!isOwner || activeTab === 'overview') && (
                        <div className="space-y-6">
                            {/* Hero */}
                            <div className="relative overflow-hidden rounded-2xl border bg-card shadow-sm">
                                <div className="relative aspect-[21/9] w-full overflow-hidden bg-muted">
                                    {isPremium && parking.annotated_file_url ? (
                                        <>
                                            <img src={parking.annotated_file_url} alt={parking.name} className="h-full w-full object-cover transition-transform duration-700 hover:scale-105" />
                                            <div className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1.5 text-xs font-bold text-white shadow-lg shadow-amber-500/30">
                                                <Sparkles className="h-3.5 w-3.5" /> AI Annotated
                                            </div>
                                        </>
                                    ) : parking.photo_url ? (
                                        <img src={parking.photo_url} alt={parking.name} className="h-full w-full object-cover transition-transform duration-700 hover:scale-105" />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                                            <div className="flex flex-col items-center gap-2 text-muted-foreground/50">
                                                <CircleParking className="h-16 w-16" />
                                                <span className="text-sm font-medium">No photo</span>
                                            </div>
                                        </div>
                                    )}
                                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 to-transparent" />
                                    <div className="absolute inset-x-0 bottom-0 p-6">
                                        <div className="flex items-end justify-between gap-4">
                                            <div>
                                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur-sm ${parking.status === 'active' ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30' : 'bg-red-500/20 text-red-300 ring-1 ring-red-500/30'}`}>
                                                        <span className={`h-1.5 w-1.5 rounded-full ${parking.status === 'active' ? 'animate-pulse bg-emerald-400' : 'bg-red-400'}`} />
                                                        {parking.status === 'active' ? 'Active' : 'Maintenance'}
                                                    </span>
                                                    {parking.status === 'active' && (
                                                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur-sm ${isOpen ? 'bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/30' : 'bg-gray-500/20 text-gray-300 ring-1 ring-gray-500/30'}`}>
                                                            <Clock className="h-3 w-3" />
                                                            {isOpen ? 'Open Now' : 'Closed'}
                                                        </span>
                                                    )}
                                                    {isLive && (
                                                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur-sm bg-green-500/20 text-green-300 ring-1 ring-green-500/30 animate-pulse">
                                                            <Zap className="h-3 w-3" /> Live Data
                                                        </span>
                                                    )}
                                                </div>
                                                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{parking.name}</h1>
                                                {parking.address_label && (
                                                    <p className="mt-1 flex items-center gap-1.5 text-sm text-white/70">
                                                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                                                        {parking.address_label}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="shrink-0 rounded-xl bg-white/10 px-4 py-3 text-center backdrop-blur-md ring-1 ring-white/20">
                                                <p className="text-2xl font-extrabold text-white">{isNaN(price) ? '0.00' : price.toFixed(2)}</p>
                                                <p className="text-[11px] font-medium uppercase tracking-wider text-white/60">TND / hour</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                <div className="rounded-xl border bg-card p-4 shadow-sm">
                                    <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                                        <CircleParking className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                                    </div>
                                    <p className="text-2xl font-bold tracking-tight">{parking.total_spots}</p>
                                    <p className="text-xs font-medium text-muted-foreground">Total Spots</p>
                                </div>

                                <div className="rounded-xl border bg-card p-4 shadow-sm relative overflow-hidden">
                                    <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950 relative">
                                        <Car className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                        {isLive && <span className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full animate-ping" />}
                                    </div>
                                    <p className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400 transition-all duration-500">{liveDetectedCars}</p>
                                    <div className="flex items-center gap-1">
                                        <p className="text-xs font-medium text-muted-foreground">Detected Cars</p>
                                        {isLive && <Zap className="h-3 w-3 text-green-500" />}
                                    </div>
                                    {isLive && (
                                        <div className="absolute top-2 right-2">
                                            <span className="flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-xl border bg-card p-4 shadow-sm relative overflow-hidden">
                                    <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-lg relative ${liveAvailableSpots > 0 ? 'bg-emerald-50 dark:bg-emerald-950' : 'bg-red-50 dark:bg-red-950'}`}>
                                        <BadgeCheck className={`h-4 w-4 ${liveAvailableSpots > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`} />
                                        {isLive && <span className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full animate-ping" />}
                                    </div>
                                    <p className={`text-2xl font-bold tracking-tight transition-all duration-500 ${liveAvailableSpots > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                        {liveAvailableSpots}
                                    </p>
                                    <div className="flex items-center gap-1">
                                        <p className="text-xs font-medium text-muted-foreground">Available</p>
                                        {isLive && <Zap className="h-3 w-3 text-green-500" />}
                                    </div>
                                    {isLive && (
                                        <div className="absolute top-2 right-2">
                                            <span className="flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-xl border bg-card p-4 shadow-sm relative overflow-hidden">
                                    <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-950 relative">
                                        <Shield className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                                        {isLive && <span className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full animate-ping" />}
                                    </div>
                                    <p className="text-2xl font-bold tracking-tight text-violet-600 dark:text-violet-400 transition-all duration-500">{liveOccupancy}%</p>
                                    <div className="flex items-center gap-1">
                                        <p className="text-xs font-medium text-muted-foreground">Occupancy</p>
                                        {isLive && <Zap className="h-3 w-3 text-green-500" />}
                                    </div>
                                    {isLive && (
                                        <div className="absolute top-2 right-2">
                                            <span className="flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Occupancy bar */}
                            <div className="rounded-xl border bg-card p-4 shadow-sm">
                                <div className="mb-2 flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-muted-foreground">Occupancy Rate</span>
                                        {isLive && (
                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">
                                                <Zap className="h-2.5 w-2.5" /> LIVE
                                            </span>
                                        )}
                                    </div>
                                    <span className="font-semibold transition-all duration-300">{parking.total_spots - liveAvailableSpots} / {parking.total_spots} used</span>
                                </div>
                                <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                                    <div
                                        className={`h-full rounded-full transition-all duration-1000 ease-out ${liveOccupancy >= 90 ? 'bg-gradient-to-r from-red-500 to-red-600' : liveOccupancy >= 60 ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'}`}
                                        style={{ width: `${liveOccupancy}%` }}
                                    />
                                </div>
                                <p className={`mt-2 text-xs font-medium ${liveOccupancy >= 90 ? 'text-red-600' : liveOccupancy >= 60 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                    {liveOccupancy >= 90 ? '⚠️ Parking presque complet' : liveOccupancy >= 60 ? '🟡 Occupation modérée' : '✅ Places disponibles'}
                                </p>
                            </div>

                            {/* Schedule & Location */}
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="rounded-xl border bg-card p-5 shadow-sm">
                                    <div className="mb-3 flex items-center gap-2">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950"><Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" /></div>
                                        <h3 className="font-semibold">Schedule</h3>
                                    </div>
                                    {parking.is_24h ? (
                                        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> Open 24 hours · 7 days a week
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <div className="flex justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm"><span className="text-muted-foreground">Opening</span><span className="font-semibold">{parking.opening_time ?? '—'}</span></div>
                                            <div className="flex justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm"><span className="text-muted-foreground">Closing</span><span className="font-semibold">{parking.closing_time ?? '—'}</span></div>
                                        </div>
                                    )}
                                </div>
                                <div className="rounded-xl border bg-card p-5 shadow-sm">
                                    <div className="mb-3 flex items-center gap-2">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-950"><MapPin className="h-4 w-4 text-rose-600 dark:text-rose-400" /></div>
                                        <h3 className="font-semibold">Location</h3>
                                    </div>
                                    <div className="space-y-2">
                                        {parking.address_label && <p className="text-sm text-muted-foreground">{parking.address_label}</p>}
                                        {parking.city && <div className="flex justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm"><span className="text-muted-foreground">City</span><span className="font-semibold">{parking.city}</span></div>}
                                        <div className="flex justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm"><span className="text-muted-foreground">Coordinates</span><span className="font-mono text-xs font-semibold">{lat.toFixed(4)}, {lng.toFixed(4)}</span></div>
                                        <a href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700">
                                            <Navigation className="h-3.5 w-3.5" /> Get Directions <ExternalLink className="h-3 w-3" />
                                        </a>
                                    </div>
                                </div>
                            </div>

                            {parking.description && (
                                <div className="rounded-xl border bg-card p-5 shadow-sm">
                                    <h3 className="mb-2 font-semibold">About this parking</h3>
                                    <p className="text-sm leading-relaxed text-muted-foreground">{parking.description}</p>
                                </div>
                            )}

                            {parking.cancel_time_limit != null && (
                                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/50">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900"><Timer className="h-4 w-4 text-amber-600 dark:text-amber-400" /></div>
                                    <div>
                                        <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Auto-cancellation Policy</p>
                                        <p className="mt-0.5 text-sm text-amber-700 dark:text-amber-300">Reservations are automatically cancelled if the driver doesn't enter within <strong>{parking.cancel_time_limit} minutes</strong>.</p>
                                    </div>
                                </div>
                            )}

                            <div className="overflow-hidden rounded-xl border shadow-sm">
                                <div className="flex items-center justify-between border-b bg-card px-4 py-3">
                                    <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-semibold">Map View</span></div>
                                </div>
                                <iframe src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.005},${lat - 0.005},${lng + 0.005},${lat + 0.005}&layer=mapnik&marker=${lat},${lng}`} width="100%" height="350" className="border-0" loading="lazy" />
                            </div>
                        </div>
                    )}

                    {/* ══════════════════════════════════════
                        TAB: CAMERAS
                    ══════════════════════════════════════ */}
                    {isOwner && activeTab === 'cameras' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold">Surveillance IA — 2 Caméras</h2>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        <span className="font-semibold">Gate:</span> Détection plaques entrée/sortie •
                                        <span className="font-semibold ml-2">Zone:</span> Surveillance parking intérieur
                                    </p>
                                </div>
                                {parking.cameras && parking.cameras.length > 0 && (
                                    <div className="flex gap-2">
                                        {activeCameras.length < (parking.cameras?.length ?? 0) && (
                                            <Button size="sm" variant="outline" disabled={!isServerOnline || isSyncingState} onClick={() => parking.cameras?.filter(c => !activeCameras.includes(c.type)).forEach(c => startCamera(c))}>
                                                <PlayCircle className="h-4 w-4 mr-1" /> Tout démarrer
                                            </Button>
                                        )}
                                        {activeCameras.length > 0 && (
                                            <Button size="sm" variant="destructive" onClick={() => parking.cameras?.filter(c => activeCameras.includes(c.type)).forEach(c => stopCamera(c))}>
                                                <StopCircle className="h-4 w-4 mr-1" /> Tout arrêter
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {connectionError && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                                    <div>
                                        <p className="font-medium text-red-800">Erreur</p>
                                        <p className="text-sm text-red-600">{connectionError}</p>
                                    </div>
                                    <button onClick={() => setConnectionError(null)} className="ml-auto"><X className="h-4 w-4 text-red-400" /></button>
                                </div>
                            )}

                            <div className="flex flex-col lg:flex-row gap-6">
                                <div className="flex-1">
                                    {parking.cameras && parking.cameras.length > 0 ? (
                                        <div className="grid gap-4 md:grid-cols-2">
                                            {parking.cameras.map((camera) => {
                                                const isCamActive = activeCameras.includes(camera.type)
                                                const isLoading   = loadingCameras.includes(camera.type)
                                                return (
                                                    <div key={camera.id} className="rounded-xl border bg-card shadow-sm overflow-hidden">
                                                        <div className="flex items-center justify-between p-3 border-b bg-muted/30">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <CameraIcon className="h-4 w-4 text-primary flex-shrink-0" />
                                                                <h3 className="font-semibold text-sm truncate">{camera.name}</h3>
                                                                {isCamActive && <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />}
                                                            </div>
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase flex-shrink-0 ${camera.type === 'gate' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                                                {camera.type}
                                                            </span>
                                                        </div>
                                                        <div id={`camera-container-${camera.type}`} className="group relative aspect-video bg-slate-950 overflow-hidden">
                                                            {renderVideoFeed(camera)}
                                                            {isCamActive && (
                                                                <button onClick={() => toggleFullscreen(camera.type)} className="absolute top-3 right-3 p-1.5 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                                                    {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                                                                </button>
                                                            )}
                                                        </div>
                                                        <div className="p-3 bg-muted/20 space-y-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] text-muted-foreground">URL:</span>
                                                                <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded truncate flex-1">{camera.stream_url}</span>
                                                            </div>
                                                            <Button
                                                                variant={isCamActive ? "destructive" : "default"}
                                                                size="sm"
                                                                className="w-full"
                                                                disabled={isLoading || !isServerOnline || isSyncingState}
                                                                onClick={() => toggleCamera(camera)}
                                                            >
                                                                {isLoading || isSyncingState
                                                                    ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> {isSyncingState ? 'Sync...' : 'Connexion...'}</>
                                                                    : isCamActive
                                                                        ? <><StopCircle className="h-4 w-4 mr-1.5" /> Arrêter</>
                                                                        : <><PlayCircle className="h-4 w-4 mr-1.5" /> Démarrer</>
                                                                }
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-2xl bg-muted/20">
                                            <Video className="h-16 w-16 text-muted-foreground/30 mb-4" />
                                            <h3 className="text-lg font-semibold mb-2">Aucune caméra configurée</h3>
                                            <p className="text-sm text-muted-foreground mb-6 text-center">Ajoutez 2 caméras : une pour l'entrée/sortie et une pour la zone de parking</p>
                                            <Button onClick={() => router.visit(`/parkings/${parking.id}/edit`)}><Edit className="w-4 h-4 mr-2" /> Configurer</Button>
                                        </div>
                                    )}
                                </div>

                                {/* AI Panel */}
                                {activeCameras.length > 0 && (
                                    <div className="w-full lg:w-80 flex-shrink-0">
                                        <div className="rounded-2xl border bg-card shadow-lg sticky top-6 overflow-hidden">
                                            <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 text-white">
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="flex items-center gap-2">
                                                        <ScanLine className="h-5 w-5 text-blue-400" />
                                                        <h3 className="font-bold text-lg">AI Tracker</h3>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                                        <span className="text-xs text-green-400">{activeCameras.length} cam</span>
                                                    </div>
                                                </div>
                                                <p className="text-xs text-slate-400">Détections: {liveAIData?.detection_count || 0}</p>
                                            </div>
                                            <div className="p-4 space-y-5">
                                                <div>
                                                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                                                        <CarFront className="h-3.5 w-3.5" /> Dernière plaque
                                                    </p>
                                                    {liveAIData?.last_plate ? (
                                                        <div className="flex flex-col items-center">
                                                            <div className="relative">
                                                                <div className="border-4 border-slate-800 rounded-lg bg-white text-slate-900 font-mono font-extrabold text-2xl px-4 py-2 tracking-widest shadow-lg overflow-hidden">
                                                                    <div className="absolute left-0 top-0 bottom-0 w-3 bg-blue-700" />
                                                                    <span className="pl-2">{liveAIData.last_plate}</span>
                                                                </div>
                                                                {lastDetectedPlate === liveAIData.last_plate && (
                                                                    <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full animate-ping" />
                                                                )}
                                                            </div>
                                                            <div className="mt-2 flex flex-col items-center gap-1">
                                                                {renderPlateStatusBadge(liveAIData.last_plate_status || 'detected')}
                                                                <span className="text-xs text-muted-foreground">{liveAIData.last_plate_time}</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="border-2 border-dashed rounded-lg p-4 text-center bg-muted/20">
                                                            <Loader2 className="h-5 w-5 animate-spin mx-auto mb-1 text-muted-foreground/50" />
                                                            <p className="text-xs text-muted-foreground">En attente...</p>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="h-px bg-border" />
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                                                        <p className="text-xl font-bold text-blue-600">{liveDetectedCars}</p>
                                                        <p className="text-[10px] text-blue-700/70 uppercase">Voitures</p>
                                                    </div>
                                                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
                                                        <p className="text-xl font-bold text-emerald-600">{liveAvailableSpots}</p>
                                                        <p className="text-[10px] text-emerald-700/70 uppercase">Libres</p>
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="flex justify-between text-[10px] mb-1">
                                                        <span className="text-muted-foreground">Occupation</span>
                                                        <span className="font-bold">{liveOccupancy}%</span>
                                                    </div>
                                                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                                        <div className={`h-full rounded-full transition-all duration-500 ${liveOccupancy >= 90 ? 'bg-red-500' : liveOccupancy >= 60 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${liveOccupancy}%` }} />
                                                    </div>
                                                </div>
                                                <div className="h-px bg-border" />
                                                <div>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <p className="text-xs font-semibold text-muted-foreground uppercase">Historique</p>
                                                        {(liveAIData?.recent_plates?.length ?? 0) > 0 && (
                                                            <button onClick={clearHistory} className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5">
                                                                <Trash2 className="h-3 w-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                    {(liveAIData?.recent_plates?.length ?? 0) > 0 ? (
                                                        <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                                            {liveAIData!.recent_plates.slice(0, 8).map((entry, idx) => {
                                                                const config = getPlateStatusConfig(entry.status)
                                                                const Icon   = config.icon
                                                                return (
                                                                    <div key={`${entry.plate}-${entry.timestamp}`} className={`flex items-center justify-between p-2 rounded-lg ${idx === 0 ? 'bg-primary/5 border border-primary/20' : 'bg-muted/30'}`}>
                                                                        <div className="flex items-center gap-1.5">
                                                                            <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                                                                            <span className="font-mono font-bold text-xs">{entry.plate}</span>
                                                                        </div>
                                                                        <span className="text-[10px] text-muted-foreground">{entry.time}</span>
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs text-muted-foreground text-center py-2">Aucune</p>
                                                    )}
                                                </div>
                                                <div className="text-center pt-2 border-t">
                                                    <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                                                        <RefreshCw className="h-3 w-3 animate-spin" style={{ animationDuration: '3s' }} />
                                                        Sync {POLLING_INTERVAL / 1000}s
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ══════════════════════════════════════
                        TAB: RESERVATIONS
                    ══════════════════════════════════════ */}
                    {isOwner && activeTab === 'reservations' && (
                        <div className="space-y-6 w-full">
                            <div>
                                <h2 className="text-2xl font-bold tracking-tight text-foreground">Reservations</h2>
                                <p className="text-sm text-muted-foreground mt-1">Manage and track all bookings for this parking.</p>
                            </div>

                            {/* Stats cards */}
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                <div className="rounded-xl border bg-card p-4 shadow-sm flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950"><ClipboardList className="h-5 w-5 text-indigo-600 dark:text-indigo-400" /></div>
                                    <div><p className="text-xl font-bold">{reservationStats.total}</p><p className="text-[11px] text-muted-foreground">Total Bookings</p></div>
                                </div>
                                <div className="rounded-xl border bg-card p-4 shadow-sm flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950"><TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /></div>
                                    <div><p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{reservationStats.active}</p><p className="text-[11px] text-muted-foreground">Active Now</p></div>
                                </div>
                                <div className="rounded-xl border bg-card p-4 shadow-sm flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950"><Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" /></div>
                                    <div><p className="text-xl font-bold text-amber-600 dark:text-amber-400">{reservationStats.pending}</p><p className="text-[11px] text-muted-foreground">Pending Entry</p></div>
                                </div>
                                <div className="rounded-xl border bg-card p-4 shadow-sm flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 dark:bg-green-950"><DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" /></div>
                                    <div><p className="text-xl font-bold text-green-600 dark:text-green-400">{reservationStats.totalRevenue.toFixed(2)}</p><p className="text-[11px] text-muted-foreground">Revenue (TND)</p></div>
                                </div>
                            </div>

                            {/* Filters */}
                            <div className="rounded-xl border bg-card p-4 shadow-sm">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="relative flex-1 sm:max-w-xs">
                                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <input
                                            type="text"
                                            placeholder="Search name, plate, email..."
                                            value={searchQuery}
                                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                                            className="h-9 w-full rounded-lg border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                        />
                                        {searchQuery && (
                                            <button onClick={() => { setSearchQuery(''); setCurrentPage(1) }} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5">
                                                <X className="h-3.5 w-3.5 text-muted-foreground" />
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-3 items-center">
                                        <div className="flex items-center gap-2">
                                            <label className="text-xs text-muted-foreground">Day</label>
                                            <input type="date" value={selectedDay} onChange={(e) => { setSelectedDay(e.target.value); setSelectedMonth(''); setCurrentPage(1) }} className="h-8 rounded-md border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                                            {selectedDay && <button onClick={() => { setSelectedDay(''); setCurrentPage(1) }} className="rounded p-0.5 hover:bg-muted"><X className="h-3 w-3 text-muted-foreground" /></button>}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <label className="text-xs text-muted-foreground">Month</label>
                                            <input type="month" value={selectedMonth} onChange={(e) => { setSelectedMonth(e.target.value); setSelectedDay(''); setCurrentPage(1) }} className="h-8 rounded-md border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                                            {selectedMonth && <button onClick={() => { setSelectedMonth(''); setCurrentPage(1) }} className="rounded p-0.5 hover:bg-muted"><X className="h-3 w-3 text-muted-foreground" /></button>}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto">
                                            <ListFilter className="h-3.5 w-3.5" />
                                            {totalFiltered} of {reservations.length} reservations
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {STATUS_FILTERS.map((sf) => {
                                        const count = sf.key === 'all' ? reservations.length : reservations.filter(r => r.status === sf.key).length
                                        if (sf.key !== 'all' && count === 0) return null
                                        return (
                                            <button
                                                key={sf.key}
                                                onClick={() => { setStatusFilter(sf.key); setCurrentPage(1) }}
                                                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${statusFilter === sf.key ? 'bg-primary text-primary-foreground border-primary' : 'bg-transparent text-muted-foreground hover:bg-muted border-border'}`}
                                            >
                                                {sf.label} <span className="ml-1 opacity-70">({count})</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Desktop table */}
                            <div className="rounded-xl border bg-card shadow-sm overflow-x-auto hidden sm:block">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-muted/50 border-b">
                                        <tr>
                                            <th className="px-4 py-3 font-medium text-muted-foreground">Driver</th>
                                            <th className="px-4 py-3 font-medium text-muted-foreground">Vehicle</th>
                                            <th className="px-4 py-3 font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort('start_time')}>Schedule <SortIcon field="start_time" /></th>
                                            <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                                            <th className="px-4 py-3 font-medium text-muted-foreground text-right cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort('total_price')}>Price <SortIcon field="total_price" /></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {paginatedReservations.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="py-12 text-center text-muted-foreground">
                                                    <CalendarCheck className="h-8 w-8 opacity-30 mx-auto mb-2" />
                                                    No reservations found
                                                </td>
                                            </tr>
                                        ) : (
                                            paginatedReservations.map((r) => {
                                                const sc         = getStatusConfig(r.status)
                                                const StatusIcon = sc.icon
                                                return (
                                                    <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-3">
                                                                {r.user_avatar
                                                                    ? <img src={r.user_avatar} alt={r.user_name} className="h-8 w-8 rounded-full object-cover border border-slate-200" />
                                                                    : <div className="h-8 w-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-xs">{r.user_name.charAt(0).toUpperCase()}</div>
                                                                }
                                                                <div>
                                                                    <p className="font-medium text-sm">{r.user_name}</p>
                                                                    <p className="text-xs text-muted-foreground">{r.user_email}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <p className="font-mono text-xs font-bold">{r.vehicle_plate}</p>
                                                            <p className="text-[11px] text-muted-foreground">{r.vehicle_brand} {r.vehicle_model}</p>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <p className="text-xs font-medium">{formatDateShort(r.start_time)}</p>
                                                            <p className="text-[11px] text-muted-foreground">{formatTime(r.start_time)} → {formatTime(r.end_time)}</p>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold ${sc.bg} ${sc.text}`}>
                                                                <StatusIcon className="h-3 w-3" />
                                                                {sc.label}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-medium tabular-nums">{Number(r.total_price).toFixed(2)} TND</td>
                                                    </tr>
                                                )
                                            })
                                        )}
                                    </tbody>
                                </table>
                                {totalFiltered > PAGE_SIZE && (
                                    <div className="flex justify-between items-center px-4 py-3 border-t text-xs text-muted-foreground">
                                        <span>Page {currentPage} of {totalPages} · {totalFiltered} results</span>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Prev</Button>
                                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                const page = Math.max(1, Math.min(currentPage - 2, totalPages - 4)) + i
                                                return (
                                                    <Button key={page} variant={page === currentPage ? 'default' : 'outline'} size="sm" className="w-8 px-0" onClick={() => setCurrentPage(page)}>{page}</Button>
                                                )
                                            })}
                                            <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</Button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Mobile cards */}
                            <div className="space-y-3 sm:hidden">
                                {paginatedReservations.length === 0 ? (
                                    <div className="flex flex-col items-center gap-2 rounded-xl border bg-card p-8 text-muted-foreground shadow-sm">
                                        <CalendarCheck className="h-10 w-10 opacity-30" />
                                        <p className="font-medium">No reservations found</p>
                                    </div>
                                ) : (
                                    paginatedReservations.map((r) => {
                                        const sc         = getStatusConfig(r.status)
                                        const StatusIcon = sc.icon
                                        const isExpanded = expandedRow === r.id
                                        return (
                                            <div key={r.id} className="overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md">
                                                <button className="flex w-full items-center justify-between p-4 text-left" onClick={() => setExpandedRow(isExpanded ? null : r.id)}>
                                                    <div className="flex items-center gap-3">
                                                        {r.user_avatar
                                                            ? <img src={r.user_avatar} alt={r.user_name} className="h-10 w-10 rounded-full object-cover" />
                                                            : <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold">{r.user_name.charAt(0).toUpperCase()}</div>
                                                        }
                                                        <div className="min-w-0">
                                                            <p className="truncate font-semibold">{r.user_name}</p>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${sc.bg} ${sc.text} ${sc.ring}`}>
                                                                    <StatusIcon className="h-2.5 w-2.5" />
                                                                    {sc.label}
                                                                </span>
                                                                <span className="text-xs text-muted-foreground tabular-nums">{Number(r.total_price).toFixed(2)} TND</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {isExpanded ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
                                                </button>
                                                {isExpanded && (
                                                    <div className="border-t bg-muted/20 px-4 py-3 space-y-2.5">
                                                        <div className="flex items-center gap-2 text-sm"><Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" /><span className="text-muted-foreground truncate">{r.user_email}</span></div>
                                                        <div className="flex items-center gap-2 text-sm"><Car className="h-3.5 w-3.5 text-muted-foreground shrink-0" /><span className="font-mono text-xs font-bold tracking-wider">{r.vehicle_plate}</span><span className="text-xs text-muted-foreground">{r.vehicle_brand} {r.vehicle_model}</span></div>
                                                        <div className="flex items-center gap-2 text-sm"><Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" /><span>{formatDateShort(r.start_time)}</span><span className="text-muted-foreground">{formatTime(r.start_time)} → {formatTime(r.end_time)}</span></div>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })
                                )}
                                {totalFiltered > PAGE_SIZE && (
                                    <div className="flex justify-between items-center pt-2 text-xs text-muted-foreground">
                                        <span>Page {currentPage} of {totalPages}</span>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Prev</Button>
                                            <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* DEBUG PANEL */}
                {showDebugPanel && (
                    <div className="fixed bottom-4 right-4 bg-black/90 text-white p-4 rounded-lg text-xs font-mono max-w-sm z-50 shadow-xl">
                        <div className="flex items-center justify-between mb-3">
                            <span className="font-bold text-green-400">🔧 DEBUG PANEL</span>
                            <button onClick={() => setShowDebugPanel(false)}><X className="h-4 w-4 text-gray-400 hover:text-white" /></button>
                        </div>
                        <div className="space-y-1">
                            <div className="flex justify-between"><span className="text-gray-400">Parking ID:</span><span className="text-yellow-400">{parking.id}</span></div>
                            <div className="flex justify-between"><span className="text-gray-400">Server:</span><span className={isServerOnline ? 'text-green-400' : 'text-red-400'}>{isServerOnline ? 'ONLINE' : 'OFFLINE'}</span></div>
                            <div className="flex justify-between"><span className="text-gray-400">Syncing:</span><span className={isSyncingState ? 'text-blue-400' : 'text-gray-500'}>{isSyncingState ? 'YES' : 'NO'}</span></div>
                            <div className="flex justify-between"><span className="text-gray-400">Live Mode:</span><span className={isLive ? 'text-green-400' : 'text-gray-500'}>{isLive ? 'ACTIVE' : 'INACTIVE'}</span></div>
                            <div className="flex justify-between"><span className="text-gray-400">Cameras:</span><span className="text-yellow-400">{activeCameras.join(', ') || 'None'}</span></div>
                            <div className="border-t border-gray-700 my-2 pt-2">
                                <p className="text-gray-400 mb-1">📊 Live Values:</p>
                                <div className="flex justify-between"><span className="text-gray-400">Detected:</span><span className="text-cyan-400">{liveDetectedCars}</span></div>
                                <div className="flex justify-between"><span className="text-gray-400">Available:</span><span className="text-emerald-400">{liveAvailableSpots}</span></div>
                                <div className="flex justify-between"><span className="text-gray-400">Occupancy:</span><span className="text-violet-400">{liveOccupancy}%</span></div>
                            </div>
                            <div className="border-t border-gray-700 my-2 pt-2">
                                <p className="text-gray-400 mb-1">🔄 Raw IA Data:</p>
                                <div className="flex justify-between"><span className="text-gray-400">total_cars:</span><span className="text-orange-400">{liveAIData?.total_cars ?? 'null'}</span></div>
                                <div className="flex justify-between"><span className="text-gray-400">free_spots:</span><span className="text-orange-400">{String(liveAIData?.free_spots ?? 'null')}</span></div>
                                <div className="flex justify-between"><span className="text-gray-400">occupied_spots:</span><span className="text-orange-400">{String(liveAIData?.occupied_spots ?? 'null')}</span></div>
                            </div>
                            <div className="border-t border-gray-700 my-2 pt-2">
                                <div className="flex justify-between"><span className="text-gray-400">Last Plate:</span><span className="text-cyan-400">{liveAIData?.last_plate || '-'}</span></div>
                                <div className="flex justify-between"><span className="text-gray-400">Plate Status:</span><span className="text-purple-400">{liveAIData?.last_plate_status || '-'}</span></div>
                                <div className="flex justify-between"><span className="text-gray-400">Detection Count:</span><span className="text-orange-400">{liveAIData?.detection_count || 0}</span></div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="h-8" />
            </div>
        </AppLayout>
    )
}