import { Head, router } from '@inertiajs/react'
import { toast } from 'sonner'
import { useState, useMemo, useEffect, useRef } from 'react'
import axios from 'axios'
import {
    MapPin, Car, Clock, Edit, ArrowLeft,
    CalendarCheck, Navigation, Shield, Sparkles, Timer,
    CircleParking, BadgeCheck, AlertTriangle, ExternalLink,
    Search, ChevronDown, ChevronUp, Calendar, Mail,
    TrendingUp, DollarSign, ClipboardList, X, Video,
    Camera as CameraIcon, AlertCircle, LayoutGrid, PlayCircle,
    StopCircle, ScanLine, CarFront, Maximize, Minimize, Loader2,
    RefreshCw, Trash2, CheckCircle2, XCircle, HelpCircle,
    Wifi, WifiOff, Bug, ListFilter, ArrowUpDown, ArrowUp, ArrowDown,
    Zap, DoorOpen, CreditCard, Receipt, Ban
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import AppLayout from '@/layouts/app-layout'

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const FLASK_API_URL    = 'http://localhost:5000'
const POLLING_INTERVAL = 1500
const DEBUG_MODE       = true
const PAGE_SIZE        = 10
const debugLog = (...args: any[]) => { if (DEBUG_MODE) console.log('[DEBUG]', ...args) }

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const STATUS_FILTERS = [
    { key: 'all',              label: 'All'              },
    { key: 'confirmed',        label: 'Confirmed'        },
    { key: 'active',           label: 'Active'           },
    { key: 'pending',          label: 'Pending'          },
    { key: 'completed',        label: 'Completed'        },
    { key: 'awaiting_payment', label: 'Awaiting Payment' },
    { key: 'paid',             label: 'Paid'             },
    { key: 'cancelled',        label: 'Cancelled'        },
]

// ─── TYPES ────────────────────────────────────────────────────────────────────
type Camera = {
    id: number; name: string; type: 'gate' | 'zone'
    stream_url: string; status: string; gate_mode?: 'entrance' | 'exit'
}
type PlateDetection = {
    plate: string; time: string; date: string; timestamp: number; status: string
    confidence?: number; gate_mode?: 'entrance' | 'exit'
    total_price?: number; duration_minutes?: number
}
type LiveAIData = {
    total_cars: number; free_spots: number | string; occupied_spots: number | string
    infractions: number | string; last_plate: string | null; last_plate_time: string | null
    last_plate_status: string | null; last_update: number | null
    recent_plates: PlateDetection[]; detection_count: number
}
type Reservation = {
    id: number; user_name: string; user_email: string; vehicle_plate: string
    vehicle_brand: string; vehicle_model: string; start_time: string; end_time: string
    status: string; total_price: number; duration_minutes?: number
    actual_entry_at?: string; actual_exit_at?: string
    entry_plate?: string; exit_plate?: string; paid_at?: string
    created_at: string; user_avatar?: string | null
}
type Props = {
    parking: {
        id: number; name: string; description: string | null; address_label: string | null
        latitude: number; longitude: number; total_spots: number; available_spots: number
        detected_cars: number; price_per_hour: number; is_24h: boolean
        opening_time: string | null; closing_time: string | null; status: string
        photo_url: string | null; annotated_file_url: string | null; created_at: string
        city: string | null; cancel_time_limit?: number | null; cameras?: Camera[]
    }
    isPremium: boolean; isOwner: boolean; reservations: Reservation[]
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function isParkingOpenNow(p: { is_24h: boolean; opening_time: string | null; closing_time: string | null }) {
    if (p.is_24h) return true
    if (!p.opening_time || !p.closing_time) return false
    const t = new Date().toTimeString().slice(0, 5)
    return t >= p.opening_time && t < p.closing_time
}
function getOccupancyPercent(total: number, available: number) {
    if (total <= 0) return 0
    return Math.min(100, Math.round((Math.max(0, total - Math.max(0, available)) / total) * 100))
}
function formatDateShort(d: string) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
function formatTime(d: string) {
    if (!d) return '—'
    return new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}
function getStatusConfig(status: string) {
    switch (status) {
        case 'confirmed': case 'active':
            return { label: status === 'active' ? 'Active' : 'Confirmed', bg: 'bg-emerald-50 dark:bg-emerald-950', text: 'text-emerald-700 dark:text-emerald-300', ring: 'ring-emerald-200 dark:ring-emerald-800', icon: BadgeCheck }
        case 'pending':          return { label: 'Pending',          bg: 'bg-amber-50 dark:bg-amber-950',  text: 'text-amber-700 dark:text-amber-300',  ring: 'ring-amber-200 dark:ring-amber-800',  icon: Clock        }
        case 'completed':        return { label: 'Completed',        bg: 'bg-blue-50 dark:bg-blue-950',    text: 'text-blue-700 dark:text-blue-300',    ring: 'ring-blue-200 dark:ring-blue-800',    icon: BadgeCheck   }
        case 'awaiting_payment': return { label: 'Awaiting Payment', bg: 'bg-rose-50 dark:bg-rose-950',    text: 'text-rose-700 dark:text-rose-300',    ring: 'ring-rose-200 dark:ring-rose-800',    icon: CreditCard   }
        case 'paid':             return { label: 'Paid',             bg: 'bg-teal-50 dark:bg-teal-950',    text: 'text-teal-700 dark:text-teal-300',    ring: 'ring-teal-200 dark:ring-teal-800',    icon: CheckCircle2 }
        case 'cancelled':        return { label: 'Cancelled',        bg: 'bg-red-50 dark:bg-red-950',      text: 'text-red-700 dark:text-red-300',      ring: 'ring-red-200 dark:ring-red-800',      icon: X            }
        default:                 return { label: status,             bg: 'bg-gray-50 dark:bg-gray-900',    text: 'text-gray-600 dark:text-gray-400',    ring: 'ring-gray-200 dark:ring-gray-800',    icon: Clock        }
    }
}
function getPlateStatusConfig(status: string) {
    switch (status) {
        case 'authorized':       return { label: 'Autorisé',           color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle2,  dir: 'entrance' as const }
        case 'already_inside':   return { label: "Déjà à l'intérieur", color: 'text-orange-600',  bg: 'bg-orange-50',  border: 'border-orange-200',  icon: AlertTriangle, dir: 'entrance' as const }
        case 'no_reservation':   return { label: 'Sans réservation',   color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200',   icon: AlertTriangle, dir: 'entrance' as const }
        case 'awaiting_payment': return { label: 'Paiement requis',    color: 'text-rose-600',    bg: 'bg-rose-50',    border: 'border-rose-200',    icon: CreditCard,    dir: 'exit'     as const }
        case 'unknown':          return { label: 'Inconnu',            color: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-200',     icon: XCircle,       dir: undefined           }
        default:                 return { label: 'Détecté',            color: 'text-slate-600',   bg: 'bg-slate-50',   border: 'border-slate-200',   icon: HelpCircle,    dir: undefined           }
    }
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function ShowParking({ parking, isPremium, isOwner, reservations = [] }: Props) {
    const lat   = Number(parking.latitude)
    const lng   = Number(parking.longitude)
    const price = Number(parking.price_per_hour)

    // ── State ─────────────────────────────────────────────────────────────────
    const [activeTab,         setActiveTab]         = useState<'overview' | 'cameras' | 'reservations'>('overview')
    const [activeCameras,     setActiveCameras]     = useState<string[]>([])
    const [liveAIData,        setLiveAIData]        = useState<LiveAIData | null>(null)
    const [isFullscreen,      setIsFullscreen]      = useState(false)
    const [loadingCameras,    setLoadingCameras]    = useState<string[]>([])
    const [connectionError,   setConnectionError]   = useState<string | null>(null)
    const [lastDetectedPlate, setLastDetectedPlate] = useState<string | null>(null)
    const [isServerOnline,    setIsServerOnline]    = useState<boolean | null>(null)
    const [showDebugPanel,    setShowDebugPanel]    = useState(DEBUG_MODE)
    const [isSyncingState,    setIsSyncingState]    = useState(true)
    const [mobileCameraTab,   setMobileCameraTab]   = useState<'feeds' | 'tracker'>('feeds')
    const lastNotifiedPlateRef = useRef<string | null>(null)

    // ── Reservation filters ───────────────────────────────────────────────────
    const [searchQuery,   setSearchQuery]   = useState('')
    const [selectedDay,   setSelectedDay]   = useState('')
    const [selectedMonth, setSelectedMonth] = useState('')
    const [statusFilter,  setStatusFilter]  = useState('all')
    const [currentPage,   setCurrentPage]   = useState(1)
    const [expandedRow,   setExpandedRow]   = useState<number | null>(null)
    const [sortField,     setSortField]     = useState<'start_time' | 'total_price' | null>(null)
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

    // ── Sync cameras on mount ─────────────────────────────────────────────────
    useEffect(() => {
        const sync = async () => {
            setIsSyncingState(true)
            try {
                const res = await axios.get(`${FLASK_API_URL}/api/parking/${parking.id}/cameras/status`, { timeout: 3000 })
                if (res.data.success) {
                    const active = res.data.cameras.filter((c: any) => c.active).map((c: any) => c.type as string)
                    if (active.length > 0) { setActiveCameras(active); toast.info(`🔄 ${active.length} caméra(s) restaurée(s)`) }
                }
            } catch { debugLog('Sync: server unavailable') }
            finally   { setIsSyncingState(false) }
        }
        sync()
    }, [parking.id])

    // ── Cleanup ───────────────────────────────────────────────────────────────
    useEffect(() => {
        const snap = [...activeCameras]
        return () => {
            snap.forEach(ct => fetch(`${FLASK_API_URL}/api/parking/${parking.id}/camera/stop`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ camera_type: ct }), keepalive: true,
            }).catch(() => {}))
        }
    }, [activeCameras, parking.id])

    // ── Live values ───────────────────────────────────────────────────────────
    const liveDetectedCars   = liveAIData?.total_cars ?? parking.detected_cars
    const liveAvailableSpots = useMemo(() => {
        if (!liveAIData) return parking.available_spots
        if (typeof liveAIData.free_spots === 'number')  return Math.max(0, liveAIData.free_spots)
        if (typeof liveAIData.total_cars === 'number')  return Math.max(0, parking.total_spots - liveAIData.total_cars)
        return parking.available_spots
    }, [liveAIData, parking.total_spots, parking.available_spots])
    const liveOccupancy = getOccupancyPercent(parking.total_spots, liveAvailableSpots)
    const isLive        = activeCameras.length > 0 && liveAIData !== null

    // ── Sort ──────────────────────────────────────────────────────────────────
    const toggleSort = (field: 'start_time' | 'total_price') => {
        if (sortField === field) setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
        else { setSortField(field); setSortDirection('asc') }
        setCurrentPage(1)
    }
    const SortIcon = ({ field }: { field: 'start_time' | 'total_price' }) => {
        if (sortField !== field) return <ArrowUpDown className="inline h-3 w-3 ml-1 opacity-40"/>
        return sortDirection === 'asc' ? <ArrowUp className="inline h-3 w-3 ml-1 text-primary"/> : <ArrowDown className="inline h-3 w-3 ml-1 text-primary"/>
    }

    // ── Filter reservations ───────────────────────────────────────────────────
    const filteredReservations = useMemo(() => {
        let list = [...reservations]
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase()
            list = list.filter(r => r.user_name.toLowerCase().includes(q) || r.vehicle_plate.toLowerCase().includes(q) || r.user_email.toLowerCase().includes(q))
        }
        if (statusFilter !== 'all') list = list.filter(r => r.status === statusFilter)
        if (selectedDay)   list = list.filter(r => r.start_time?.startsWith(selectedDay))
        if (selectedMonth) list = list.filter(r => r.start_time?.startsWith(selectedMonth))
        if (sortField) {
            list.sort((a, b) => {
                const vA: any = sortField === 'start_time' ? a.start_time : Number(a.total_price)
                const vB: any = sortField === 'start_time' ? b.start_time : Number(b.total_price)
                if (vA < vB) return sortDirection === 'asc' ? -1 : 1
                if (vA > vB) return sortDirection === 'asc' ?  1 : -1
                return 0
            })
        }
        return list
    }, [reservations, searchQuery, statusFilter, selectedDay, selectedMonth, sortField, sortDirection])

    const totalFiltered         = filteredReservations.length
    const totalPages            = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE))
    const paginatedReservations = filteredReservations.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

    const reservationStats = useMemo(() => ({
        total:           reservations.length,
        active:          reservations.filter(r => ['active','confirmed'].includes(r.status)).length,
        awaitingPayment: reservations.filter(r => r.status === 'awaiting_payment').length,
        totalRevenue:    reservations.filter(r => ['paid','completed','active','confirmed'].includes(r.status)).reduce((s, r) => s + Number(r.total_price), 0),
    }), [reservations])

    // ── Health check ──────────────────────────────────────────────────────────
    useEffect(() => {
        const check = async () => {
            try { const r = await axios.get(`${FLASK_API_URL}/api/health`, { timeout: 3000 }); setIsServerOnline(r.data.status === 'healthy') }
            catch { setIsServerOnline(false) }
        }
        check(); const i = setInterval(check, 10000); return () => clearInterval(i)
    }, [])

    // ── Camera control ────────────────────────────────────────────────────────
    const startCamera = async (camera: Camera) => {
        setLoadingCameras(prev => [...prev, camera.type]); setConnectionError(null)
        try {
            await axios.post(`${FLASK_API_URL}/api/parking/${parking.id}/setup`, { mode: isPremium ? 'premium' : 'basic' })
            const payload: Record<string, any> = { camera_type: camera.type, stream_url: camera.stream_url, name: camera.name }
            if (camera.type === 'gate') payload.gate_mode = camera.gate_mode ?? 'entrance'
            const res = await axios.post(`${FLASK_API_URL}/api/parking/${parking.id}/camera/start`, payload)
            if (res.data.success) {
                setActiveCameras(prev => [...prev, camera.type])
                toast.success(`🟢 ${camera.name} démarrée`, { description: camera.type === 'gate' ? (camera.gate_mode === 'exit' ? 'Mode Sortie' : 'Mode Entrée') : 'Zone' })
            }
        } catch (error: any) {
            if (error.response?.data?.error?.includes('déjà active')) {
                if (!activeCameras.includes(camera.type)) setActiveCameras(prev => [...prev, camera.type])
                toast.info(`📡 ${camera.name} déjà active`)
            } else {
                setConnectionError(error.response?.data?.error || error.message)
                toast.error('❌ Erreur', { description: error.response?.data?.error || 'Connexion impossible' })
            }
        } finally { setLoadingCameras(prev => prev.filter(t => t !== camera.type)) }
    }

    const stopCamera = async (camera: Camera) => {
        setLoadingCameras(prev => [...prev, camera.type])
        try {
            const res = await axios.post(`${FLASK_API_URL}/api/parking/${parking.id}/camera/stop`, { camera_type: camera.type }, { timeout: 5000 })
            if (res.data.success) { setActiveCameras(prev => prev.filter(t => t !== camera.type)); toast.info(`🔴 ${camera.name} arrêtée`) }
        } catch { toast.error("Erreur lors de l'arrêt") }
        finally   { setLoadingCameras(prev => prev.filter(t => t !== camera.type)) }
    }

    const toggleCamera = (camera: Camera) => activeCameras.includes(camera.type) ? stopCamera(camera) : startCamera(camera)

    // ── Polling ───────────────────────────────────────────────────────────────
    useEffect(() => {
        if (activeCameras.length === 0) { setLiveAIData(null); return }
        const fetchLiveData = async () => {
            try {
                const res = await axios.get(`${FLASK_API_URL}/api/parking/${parking.id}/live_status`)
                if (res.data.status === 'online') {
                    const d = res.data.data as LiveAIData
                    if (!Array.isArray(d.recent_plates)) d.recent_plates = []
                    if (!d.last_plate && d.recent_plates.length > 0) {
                        const l = d.recent_plates[0]; d.last_plate = l.plate; d.last_plate_status = l.status; d.last_plate_time = l.time
                    }
                    if (d.last_plate && d.last_plate !== lastNotifiedPlateRef.current) {
                        lastNotifiedPlateRef.current = d.last_plate; setLastDetectedPlate(d.last_plate)
                        const sc = getPlateStatusConfig(d.last_plate_status || 'detected')
                        const lp = d.recent_plates?.[0]
                        const exitInfo = lp?.total_price != null && lp.total_price > 0 ? ` — ${lp.total_price} TND (${lp.duration_minutes || 0}min)` : ''
                        if (d.last_plate_status === 'unknown') {
                            toast.error(<div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-red-100"><Ban className="h-5 w-5 text-red-600"/></div><div><p className="font-bold font-mono">{d.last_plate}</p><p className="text-sm text-red-600">Plaque inconnue — accès refusé</p></div></div>, { duration: 6000 })
                        } else if (d.last_plate_status === 'no_reservation') {
                            toast.error(<div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-amber-100"><AlertTriangle className="h-5 w-5 text-amber-600"/></div><div><p className="font-bold font-mono">{d.last_plate}</p><p className="text-sm text-amber-600">Aucune réservation active</p></div></div>, { duration: 6000 })
                        } else if (d.last_plate_status === 'awaiting_payment') {
                            toast(<div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-rose-50"><CreditCard className="h-5 w-5 text-rose-600"/></div><div><p className="font-bold font-mono text-lg">{d.last_plate}</p><p className="text-sm text-rose-600">Paiement requis{exitInfo}</p></div></div>, { duration: 7000 })
                        } else {
                            toast(<div className="flex items-center gap-3"><div className={`p-2 rounded-lg ${sc.bg}`}>{sc.dir === 'exit' ? <DoorOpen className={`h-5 w-5 ${sc.color}`}/> : <CarFront className={`h-5 w-5 ${sc.color}`}/>}</div><div><p className="font-bold font-mono text-lg">{d.last_plate}</p><p className={`text-sm ${sc.color}`}>{sc.label}</p></div></div>, { duration: 5000 })
                        }
                    }
                    setLiveAIData(d); setConnectionError(null)
                }
            } catch (e) { debugLog('Polling error:', e) }
        }
        fetchLiveData(); const iv = setInterval(fetchLiveData, POLLING_INTERVAL); return () => clearInterval(iv)
    }, [activeCameras, parking.id])

    // ── Clear history ─────────────────────────────────────────────────────────
    const clearHistory = async () => {
        try {
            await axios.post(`${FLASK_API_URL}/api/parking/${parking.id}/clear_history`)
            setLiveAIData(prev => prev ? { ...prev, recent_plates: [], detection_count: 0, last_plate: null, last_plate_time: null, last_plate_status: null } : null)
            lastNotifiedPlateRef.current = null; setLastDetectedPlate(null); toast.success('🗑️ Historique effacé')
        } catch { toast.error('Erreur') }
    }

    // ── Fullscreen ────────────────────────────────────────────────────────────
    const toggleFullscreen = (ct: string) => {
        const el = document.getElementById(`camera-container-${ct}`)
        if (!document.fullscreenElement) { el?.requestFullscreen(); setIsFullscreen(true) }
        else { document.exitFullscreen(); setIsFullscreen(false) }
    }
    useEffect(() => {
        const h = () => setIsFullscreen(!!document.fullscreenElement)
        document.addEventListener('fullscreenchange', h); return () => document.removeEventListener('fullscreenchange', h)
    }, [])

    // ── Camera label ──────────────────────────────────────────────────────────
    const getCameraLabel = (camera: Camera) => {
        if (camera.type !== 'gate') return { label: '🅿️ Zone', color: 'bg-indigo-100 text-indigo-700' }
        return camera.gate_mode === 'exit'
            ? { label: '🚪 Sortie', color: 'bg-orange-100 text-orange-700' }
            : { label: '🚗 Entrée', color: 'bg-green-100 text-green-700'   }
    }

    // ── Render video ──────────────────────────────────────────────────────────
    const renderVideoFeed = (camera: Camera) => {
        const isActive  = activeCameras.includes(camera.type)
        const isLoading = loadingCameras.includes(camera.type)
        if (isSyncingState) return <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-900"><Loader2 className="h-10 w-10 animate-spin mb-2"/><span className="text-sm">Vérification...</span></div>
        if (isLoading)      return <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-900"><Loader2 className="h-10 w-10 animate-spin mb-2"/><span className="text-sm">Connexion...</span></div>
        if (!isActive)      return <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-900"><Video className="h-12 w-12 mb-2 opacity-30"/><span className="text-sm">Caméra désactivée</span><span className="text-[10px] text-slate-500 mt-1 px-4 text-center truncate max-w-full">{camera.stream_url}</span></div>
        const feedUrl = `${FLASK_API_URL}/api/parking/${parking.id}/camera/${camera.type}/stream`
        return (
            <>
                <img key={`${parking.id}-${camera.type}`} src={feedUrl} alt={camera.name} className="w-full h-full object-contain bg-black"
                    onError={(e) => { const t = e.target as HTMLImageElement; t.style.display='none'; const n = t.nextElementSibling as HTMLElement|null; if(n) n.classList.replace('hidden','flex') }}/>
                <div className="hidden absolute inset-0 flex-col items-center justify-center bg-slate-900 text-slate-400"><AlertCircle className="h-10 w-10 mb-2 opacity-50"/><p className="text-sm">Erreur flux</p></div>
                <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/70 z-10">
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"/><span className="text-[10px] font-bold text-white uppercase">Live</span>
                </div>
                <div className="absolute top-3 right-12 px-2 py-1 rounded-md bg-black/70 z-10">
                    {camera.type === 'gate'
                        ? <span className={`text-[10px] font-bold uppercase ${camera.gate_mode === 'exit' ? 'text-orange-400' : 'text-green-400'}`}>{camera.gate_mode === 'exit' ? '🚪 Sortie' : '🚗 Entrée'}</span>
                        : <span className="text-[10px] font-bold uppercase text-indigo-400">🅿️ Zone</span>
                    }
                </div>
            </>
        )
    }

    const renderPlateStatusBadge = (status: string) => {
        const cfg = getPlateStatusConfig(status); const Icon = cfg.icon
        return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${cfg.bg} ${cfg.color} border ${cfg.border}`}><Icon className="h-3 w-3"/>{cfg.label}</span>
    }

    // ── AI Panel (shared between desktop sidebar + mobile tab) ────────────────
    const renderAIPanel = () => {
        if (!liveAIData) return null
        return (
            <div className="rounded-2xl border bg-card shadow-lg overflow-hidden h-full">
                {/* Header */}
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 text-white">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2"><ScanLine className="h-5 w-5 text-blue-400"/><h3 className="font-bold text-lg">AI Tracker</h3></div>
                        <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"/><span className="text-xs text-green-400">{activeCameras.length} cam</span></div>
                    </div>
                    <p className="text-xs text-slate-400">Détections: {liveAIData.detection_count || 0}</p>
                </div>
                <div className="p-4 space-y-4 overflow-y-auto">
                    {/* Dernière plaque */}
                    <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1"><CarFront className="h-3.5 w-3.5"/> Dernière plaque</p>
                        {liveAIData.last_plate ? (
                            <div className="flex flex-col items-center">
                                <div className="relative">
                                    <div className="border-4 border-slate-800 rounded-lg bg-white text-slate-900 font-mono font-extrabold text-2xl px-4 py-2 tracking-widest shadow-lg overflow-hidden">
                                        <div className="absolute left-0 top-0 bottom-0 w-3 bg-blue-700"/>
                                        <span className="pl-2">{liveAIData.last_plate}</span>
                                    </div>
                                    {lastDetectedPlate === liveAIData.last_plate && <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full animate-ping"/>}
                                </div>
                                <div className="mt-2 flex flex-col items-center gap-1">
                                    {renderPlateStatusBadge(liveAIData.last_plate_status || 'detected')}
                                    <span className="text-xs text-muted-foreground">{liveAIData.last_plate_time}</span>
                                </div>
                                {/* Awaiting payment — info only */}
                                {(() => {
                                    const isAwaiting = liveAIData.last_plate_status === 'awaiting_payment' || liveAIData.recent_plates?.[0]?.status === 'awaiting_payment'
                                    if (!isAwaiting) return null
                                    const pd = liveAIData.recent_plates?.[0]
                                    return (
                                        <div className="mt-3 w-full rounded-xl border-2 border-rose-200 bg-rose-50 dark:bg-rose-950/40 p-3 space-y-2">
                                            <div className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-rose-600"/><span className="text-xs font-bold text-rose-700 dark:text-rose-300">Paiement en attente</span></div>
                                            {pd?.total_price != null && pd.total_price > 0 && (
                                                <div className="grid grid-cols-2 gap-1.5">
                                                    <div className="rounded-lg bg-rose-100 dark:bg-rose-900/50 p-2 text-center">
                                                        <p className="text-base font-bold text-rose-700 dark:text-rose-300">{pd.total_price}</p>
                                                        <p className="text-[10px] text-rose-600/70 flex items-center justify-center gap-0.5"><Receipt className="h-2.5 w-2.5"/> TND</p>
                                                    </div>
                                                    <div className="rounded-lg bg-rose-100 dark:bg-rose-900/50 p-2 text-center">
                                                        <p className="text-base font-bold text-rose-700 dark:text-rose-300">{pd.duration_minutes || 0}</p>
                                                        <p className="text-[10px] text-rose-600/70 flex items-center justify-center gap-0.5"><Timer className="h-2.5 w-2.5"/> min</p>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="rounded-lg bg-rose-100/60 dark:bg-rose-900/30 px-2.5 py-2 flex items-start gap-2">
                                                <Receipt className="h-3.5 w-3.5 text-rose-500 flex-shrink-0 mt-0.5"/>
                                                <p className="text-[10px] text-rose-700 dark:text-rose-300 leading-snug">Le driver paie depuis <strong>Mes Réservations</strong>. Barrière auto.</p>
                                            </div>
                                        </div>
                                    )
                                })()}
                                {/* Refusal alerts */}
                                {(liveAIData.last_plate_status === 'unknown' || liveAIData.last_plate_status === 'no_reservation') && (
                                    <div className="mt-2 w-full rounded-lg bg-red-50 border border-red-200 p-2">
                                        <p className="text-[11px] text-red-600 text-center font-medium">
                                            {liveAIData.last_plate_status === 'unknown' ? '⛔ Plaque non enregistrée' : '⚠️ Aucune réservation active'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="border-2 border-dashed rounded-lg p-4 text-center bg-muted/20">
                                <Loader2 className="h-5 w-5 animate-spin mx-auto mb-1 text-muted-foreground/50"/>
                                <p className="text-xs text-muted-foreground">En attente...</p>
                            </div>
                        )}
                    </div>

                    <div className="h-px bg-border"/>

                    {/* Quick stats */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center"><p className="text-xl font-bold text-blue-600">{liveDetectedCars}</p><p className="text-[10px] text-blue-700/70 uppercase">Voitures</p></div>
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center"><p className="text-xl font-bold text-emerald-600">{liveAvailableSpots}</p><p className="text-[10px] text-emerald-700/70 uppercase">Libres</p></div>
                    </div>

                    {/* Occupancy bar */}
                    <div>
                        <div className="flex justify-between text-[10px] mb-1"><span className="text-muted-foreground">Occupation</span><span className="font-bold">{liveOccupancy}%</span></div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div className={`h-full rounded-full transition-all duration-500 ${liveOccupancy >= 90 ? 'bg-red-500' : liveOccupancy >= 60 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${liveOccupancy}%` }}/>
                        </div>
                    </div>

                    <div className="h-px bg-border"/>

                    {/* Recent plates history */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-muted-foreground uppercase">Historique</p>
                            {(liveAIData.recent_plates?.length ?? 0) > 0 && <button onClick={clearHistory} className="text-[10px] text-muted-foreground hover:text-foreground"><Trash2 className="h-3 w-3"/></button>}
                        </div>
                        {(liveAIData.recent_plates?.length ?? 0) > 0 ? (
                            <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                {liveAIData.recent_plates.slice(0, 10).map((entry, idx) => {
                                    const cfg = getPlateStatusConfig(entry.status); const Icon = cfg.icon
                                    const isPay = entry.status === 'awaiting_payment'
                                    return (
                                        <div key={`${entry.plate}-${entry.timestamp}`} className={`flex items-center justify-between p-2 rounded-lg gap-2 ${idx === 0 ? 'bg-primary/5 border border-primary/20' : isPay ? 'bg-rose-50 border border-rose-100 dark:bg-rose-950/30' : 'bg-muted/30'}`}>
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className={`text-[9px] font-bold flex-shrink-0 ${entry.gate_mode === 'exit' ? 'text-orange-500' : 'text-green-500'}`}>{entry.gate_mode === 'exit' ? '↑OUT' : '↓IN'}</span>
                                                <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${cfg.color}`}/>
                                                <span className={`font-mono font-bold text-xs truncate ${isPay ? 'text-rose-700' : ''}`}>{entry.plate}</span>
                                            </div>
                                            <div className="flex flex-col items-end flex-shrink-0">
                                                <span className="text-[10px] text-muted-foreground">{entry.time}</span>
                                                {entry.total_price != null && entry.total_price > 0 && <span className="text-[9px] font-bold text-rose-600">{entry.total_price} TND</span>}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : <p className="text-xs text-muted-foreground text-center py-2">Aucune détection</p>}
                    </div>

                    <div className="text-center pt-1 border-t">
                        <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                            <RefreshCw className="h-3 w-3 animate-spin" style={{ animationDuration: '3s' }}/> Sync {POLLING_INTERVAL / 1000}s
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    // ═════════════════════════════════════════════════════════════════════════
    // RENDER
    // ═════════════════════════════════════════════════════════════════════════
    return (
        <AppLayout breadcrumbs={[
            { title: isOwner ? 'Mes Parkings' : 'Parkings', href: isOwner ? '/parkings' : '/parkings/available' },
            { title: parking.name, href: `/parkings/${parking.id}` },
        ]}>
            <Head title={parking.name}/>
            {/* CHANGEMENT ICI : Suppression de la div avec max-w-6xl pour l'onglet cameras */}
            <div className={activeTab === 'cameras' ? 'w-full px-4 py-6 sm:px-6 lg:px-8' : 'mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8'}>

                {/* ── TOP BAR ── */}
                <div className="mb-6 flex items-center justify-between">
                    <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => router.visit(isOwner ? '/parkings' : '/parkings/available')}>
                        <ArrowLeft className="h-4 w-4"/> Retour
                    </Button>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${isServerOnline === null ? 'bg-gray-100 text-gray-500' : isServerOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {isServerOnline === null ? <Loader2 className="h-3 w-3 animate-spin"/> : isServerOnline ? <Wifi className="h-3 w-3"/> : <WifiOff className="h-3 w-3"/>}
                            <span className="hidden sm:inline">{isServerOnline ? 'IA Online' : 'IA Offline'}</span>
                        </div>
                        {isSyncingState && <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700"><RefreshCw className="h-3 w-3 animate-spin"/><span className="hidden sm:inline">Sync...</span></div>}
                        {isLive && <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs bg-green-100 text-green-700 animate-pulse"><Zap className="h-3 w-3"/><span>LIVE</span></div>}
                        {activeCameras.length > 0 && <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700"><CameraIcon className="h-3 w-3"/><span>{activeCameras.length}</span></div>}
                        <Button variant="ghost" size="sm" onClick={() => setShowDebugPanel(!showDebugPanel)} className={showDebugPanel ? 'bg-amber-100 text-amber-700' : ''}><Bug className="h-4 w-4"/></Button>
                        {isOwner && <Button size="sm" onClick={() => router.visit(`/parkings/${parking.id}/edit`)}><Edit className="h-3.5 w-3.5 mr-1"/> Modifier</Button>}
                    </div>
                </div>

                {/* ── TABS ── */}
                {isOwner && (
                    <div className="mb-6 flex gap-1 border-b pb-px overflow-x-auto">
                        {([
                            { key: 'overview',     label: 'Overview',        icon: LayoutGrid    },
                            { key: 'cameras',      label: 'Live Monitoring', icon: Video         },
                            { key: 'reservations', label: 'Reservations',    icon: ClipboardList },
                        ] as const).map(({ key, label, icon: Icon }) => (
                            <button key={key} onClick={() => setActiveTab(key)}
                                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === key ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                                <Icon className="w-4 h-4"/>
                                <span className="hidden sm:inline">{label}</span>
                                <span className="sm:hidden">{key === 'overview' ? 'Info' : key === 'cameras' ? 'Live' : 'Rés.'}</span>
                                {key === 'cameras' && parking.cameras && <span className="bg-slate-200 text-slate-600 text-[10px] px-1.5 py-0.5 rounded-full">{parking.cameras.length}</span>}
                                {key === 'cameras' && activeCameras.length > 0 && <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full animate-pulse">LIVE</span>}
                                {key === 'reservations' && <span className="bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded-full">{reservations.length}</span>}
                                {key === 'reservations' && reservationStats.awaitingPayment > 0 && <span className="bg-rose-500 text-white text-[9px] px-1.5 py-0.5 rounded-full animate-pulse">{reservationStats.awaitingPayment}💳</span>}
                            </button>
                        ))}
                    </div>
                )}

                <div className="animate-in fade-in duration-300">

                    {/* ══════════════════════════════════════
                        TAB : OVERVIEW
                    ══════════════════════════════════════ */}
                    {(!isOwner || activeTab === 'overview') && (
                        <div className="space-y-6">
                            {/* Hero image */}
                            <div className="relative overflow-hidden rounded-2xl border bg-card shadow-sm">
                                <div className="relative aspect-[21/9] w-full overflow-hidden bg-muted">
                                    {isPremium && parking.annotated_file_url
                                        ? <><img src={parking.annotated_file_url} alt={parking.name} className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"/><div className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1.5 text-xs font-bold text-white shadow-lg"><Sparkles className="h-3.5 w-3.5"/> AI Annotated</div></>
                                        : parking.photo_url
                                            ? <img src={parking.photo_url} alt={parking.name} className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"/>
                                            : <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50"><CircleParking className="h-16 w-16 text-muted-foreground/30"/></div>
                                    }
                                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 to-transparent"/>
                                    <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
                                        <div className="flex items-end justify-between gap-4">
                                            <div>
                                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur-sm ${parking.status === 'active' ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30' : 'bg-red-500/20 text-red-300 ring-1 ring-red-500/30'}`}>
                                                        <span className={`h-1.5 w-1.5 rounded-full ${parking.status === 'active' ? 'animate-pulse bg-emerald-400' : 'bg-red-400'}`}/>{parking.status === 'active' ? 'Active' : 'Maintenance'}
                                                    </span>
                                                    {isLive && <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur-sm bg-green-500/20 text-green-300 ring-1 ring-green-500/30 animate-pulse"><Zap className="h-3 w-3"/> Live</span>}
                                                </div>
                                                <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-white">{parking.name}</h1>
                                                {parking.address_label && <p className="mt-1 flex items-center gap-1.5 text-sm text-white/70"><MapPin className="h-3.5 w-3.5 shrink-0"/>{parking.address_label}</p>}
                                            </div>
                                            <div className="shrink-0 rounded-xl bg-white/10 px-4 py-3 text-center backdrop-blur-md ring-1 ring-white/20">
                                                <p className="text-2xl font-extrabold text-white">{isNaN(price) ? '0.00' : price.toFixed(2)}</p>
                                                <p className="text-[11px] font-medium uppercase tracking-wider text-white/60">TND / h</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Stats grid */}
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                {[
                                    { icon: CircleParking, val: parking.total_spots,    label: 'Total Spots',   bg: 'bg-slate-100 dark:bg-slate-800',              tc: 'text-slate-600 dark:text-slate-400'               },
                                    { icon: Car,           val: liveDetectedCars,        label: 'Voitures',      bg: 'bg-blue-50 dark:bg-blue-950',                 tc: 'text-blue-600 dark:text-blue-400',    live: true  },
                                    { icon: BadgeCheck,    val: liveAvailableSpots,      label: 'Disponibles',   bg: liveAvailableSpots > 0 ? 'bg-emerald-50 dark:bg-emerald-950' : 'bg-red-50 dark:bg-red-950', tc: liveAvailableSpots > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400', live: true },
                                    { icon: Shield,        val: `${liveOccupancy}%`,     label: 'Occupation',    bg: 'bg-violet-50 dark:bg-violet-950',             tc: 'text-violet-600 dark:text-violet-400', live: true  },
                                ].map(({ icon: Icon, val, label, bg, tc, live }, i) => (
                                    <div key={i} className="rounded-xl border bg-card p-4 shadow-sm relative overflow-hidden">
                                        <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-lg ${bg} relative`}>
                                            <Icon className={`h-4 w-4 ${tc}`}/>
                                            {live && isLive && <span className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full animate-ping"/>}
                                        </div>
                                        <p className={`text-2xl font-bold tracking-tight ${tc}`}>{val}</p>
                                        <div className="flex items-center gap-1"><p className="text-xs text-muted-foreground">{label}</p>{live && isLive && <Zap className="h-3 w-3 text-green-500"/>}</div>
                                        {live && isLive && <div className="absolute top-2 right-2"><span className="flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"/><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"/></span></div>}
                                    </div>
                                ))}
                            </div>

                            {/* Occupancy bar */}
                            <div className="rounded-xl border bg-card p-4 shadow-sm">
                                <div className="mb-2 flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-muted-foreground">Taux d'occupation</span>
                                        {isLive && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700"><Zap className="h-2.5 w-2.5"/> LIVE</span>}
                                    </div>
                                    <span className="font-semibold">{parking.total_spots - liveAvailableSpots} / {parking.total_spots}</span>
                                </div>
                                <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                                    <div className={`h-full rounded-full transition-all duration-1000 ease-out ${liveOccupancy >= 90 ? 'bg-gradient-to-r from-red-500 to-red-600' : liveOccupancy >= 60 ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'}`} style={{ width: `${liveOccupancy}%` }}/>
                                </div>
                                <p className={`mt-2 text-xs font-medium ${liveOccupancy >= 90 ? 'text-red-600' : liveOccupancy >= 60 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                    {liveOccupancy >= 90 ? '⚠️ Presque complet' : liveOccupancy >= 60 ? '🟡 Occupation modérée' : '✅ Places disponibles'}
                                </p>
                            </div>

                            {/* Schedule + Location */}
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="rounded-xl border bg-card p-5 shadow-sm">
                                    <div className="mb-3 flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950"><Clock className="h-4 w-4 text-blue-600 dark:text-blue-400"/></div><h3 className="font-semibold">Horaires</h3></div>
                                    {parking.is_24h
                                        ? <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500"/> Ouvert 24h/24 · 7j/7</div>
                                        : <div className="space-y-2">
                                            <div className="flex justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm"><span className="text-muted-foreground">Ouverture</span><span className="font-semibold">{parking.opening_time ?? '—'}</span></div>
                                            <div className="flex justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm"><span className="text-muted-foreground">Fermeture</span><span className="font-semibold">{parking.closing_time ?? '—'}</span></div>
                                          </div>
                                    }
                                </div>
                                <div className="rounded-xl border bg-card p-5 shadow-sm">
                                    <div className="mb-3 flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-950"><MapPin className="h-4 w-4 text-rose-600 dark:text-rose-400"/></div><h3 className="font-semibold">Localisation</h3></div>
                                    <div className="space-y-2">
                                        {parking.address_label && <p className="text-sm text-muted-foreground">{parking.address_label}</p>}
                                        {parking.city && <div className="flex justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm"><span className="text-muted-foreground">Ville</span><span className="font-semibold">{parking.city}</span></div>}
                                        <div className="flex justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm"><span className="text-muted-foreground">Coords</span><span className="font-mono text-xs font-semibold">{lat.toFixed(4)}, {lng.toFixed(4)}</span></div>
                                        <a href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700">
                                            <Navigation className="h-3.5 w-3.5"/> Itinéraire <ExternalLink className="h-3 w-3"/>
                                        </a>
                                    </div>
                                </div>
                            </div>

                            {parking.description && <div className="rounded-xl border bg-card p-5 shadow-sm"><h3 className="mb-2 font-semibold">À propos</h3><p className="text-sm leading-relaxed text-muted-foreground">{parking.description}</p></div>}

                            {parking.cancel_time_limit != null && (
                                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/50">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900"><Timer className="h-4 w-4 text-amber-600 dark:text-amber-400"/></div>
                                    <div><p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Annulation automatique</p><p className="mt-0.5 text-sm text-amber-700 dark:text-amber-300">Annulée si le driver n'arrive pas dans <strong>{parking.cancel_time_limit} minutes</strong>.</p></div>
                                </div>
                            )}

                            <div className="overflow-hidden rounded-xl border shadow-sm">
                                <div className="flex items-center gap-2 border-b bg-card px-4 py-3"><MapPin className="h-4 w-4 text-muted-foreground"/><span className="text-sm font-semibold">Carte</span></div>
                                <iframe src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng-0.005},${lat-0.005},${lng+0.005},${lat+0.005}&layer=mapnik&marker=${lat},${lng}`} width="100%" height="300" className="border-0" loading="lazy"/>
                            </div>
                        </div>
                    )}

                    {/* ══════════════════════════════════════
                        TAB : CAMERAS  (desktop + mobile)
                    ══════════════════════════════════════ */}
                    {isOwner && activeTab === 'cameras' && (
                        <div className="space-y-4">

                            {/* ── Title row ── */}
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h2 className="text-xl font-bold">Surveillance IA</h2>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        <span className="font-semibold text-green-600">Entrée</span> autorise ·
                                        <span className="font-semibold text-orange-600 ml-1">Sortie</span> calcule tarif ·
                                        <span className="font-semibold text-indigo-600 ml-1">Zone</span> surveillance
                                    </p>
                                </div>
                                {parking.cameras && parking.cameras.length > 0 && (
                                    <div className="flex gap-2 shrink-0">
                                        {activeCameras.length < (parking.cameras?.length ?? 0) && (
                                            <Button size="sm" variant="outline" disabled={!isServerOnline || isSyncingState}
                                                onClick={() => parking.cameras?.filter(c => !activeCameras.includes(c.type)).forEach(c => startCamera(c))}>
                                                <PlayCircle className="h-4 w-4 mr-1 hidden sm:inline"/> <span className="hidden sm:inline">Tout démarrer</span><span className="sm:hidden">▶ All</span>
                                            </Button>
                                        )}
                                        {activeCameras.length > 0 && (
                                            <Button size="sm" variant="destructive"
                                                onClick={() => parking.cameras?.filter(c => activeCameras.includes(c.type)).forEach(c => stopCamera(c))}>
                                                <StopCircle className="h-4 w-4 mr-1 hidden sm:inline"/> <span className="hidden sm:inline">Tout arrêter</span><span className="sm:hidden">■ Stop</span>
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* ── Awaiting payment banner ── */}
                            {(() => {
                                const hasAwaiting =
                                    liveAIData?.last_plate_status === 'awaiting_payment' ||
                                    (liveAIData?.recent_plates?.[0]?.status === 'awaiting_payment' &&
                                     liveAIData?.recent_plates?.[0]?.plate === liveAIData?.last_plate)
                                if (!hasAwaiting || !liveAIData?.last_plate) return null
                                const pd = liveAIData.recent_plates?.[0]
                                return (
                                    <div className="flex items-start gap-3 sm:gap-4 rounded-xl border-2 border-rose-300 bg-rose-50 dark:bg-rose-950/50 dark:border-rose-800 p-3 sm:p-4 shadow-md">
                                        <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-900">
                                            <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 text-rose-600 dark:text-rose-400"/>
                                        </div>
                                        <div className="flex-1 min-w-0 space-y-1">
                                            <p className="text-sm font-bold text-rose-800 dark:text-rose-200 flex items-center gap-2 flex-wrap">
                                                Sortie — paiement en attente
                                                <span className="font-mono bg-rose-200 dark:bg-rose-900 px-2 py-0.5 rounded text-rose-900 dark:text-rose-100 text-xs">{liveAIData.last_plate}</span>
                                            </p>
                                            {pd?.total_price != null && pd.total_price > 0 && (
                                                <p className="text-xs font-semibold text-rose-700 dark:text-rose-300">{pd.total_price} TND · {pd.duration_minutes || 0} min</p>
                                            )}
                                            <p className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                                                <Receipt className="h-3.5 w-3.5 flex-shrink-0"/>
                                                Barrière auto après paiement du driver depuis <strong className="ml-0.5 text-rose-700 dark:text-rose-300">Mes Réservations</strong>.
                                            </p>
                                        </div>
                                    </div>
                                )
                            })()}

                            {/* ── Connection error ── */}
                            {connectionError && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-3">
                                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0"/>
                                    <div><p className="font-medium text-red-800 text-sm">Erreur</p><p className="text-xs text-red-600">{connectionError}</p></div>
                                    <button onClick={() => setConnectionError(null)} className="ml-auto"><X className="h-4 w-4 text-red-400"/></button>
                                </div>
                            )}

                            {/* ══════════════════════════════════════════════
                                MOBILE : sub-tabs Feeds / Tracker
                            ══════════════════════════════════════════════ */}
                            {activeCameras.length > 0 && liveAIData && (
                                <div className="flex gap-2 lg:hidden border-b pb-px">
                                    {(['feeds', 'tracker'] as const).map(tab => (
                                        <button key={tab} onClick={() => setMobileCameraTab(tab)}
                                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${mobileCameraTab === tab ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground'}`}>
                                            {tab === 'feeds' ? <span className="flex items-center gap-1.5"><Video className="h-4 w-4"/> Caméras</span> : <span className="flex items-center gap-1.5"><ScanLine className="h-4 w-4"/> AI Tracker</span>}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* ══════════════════════════════════════════════
                                DESKTOP layout : flex row (feeds + sidebar)
                                MOBILE  layout : tabs (feeds OR tracker)
                            ══════════════════════════════════════════════ */}
                            <div className="flex flex-col lg:flex-row gap-4">

                                {/* ── Camera feeds ── */}
                                <div className={`flex-1 ${activeCameras.length > 0 && liveAIData ? (mobileCameraTab === 'tracker' ? 'hidden lg:block' : 'block') : 'block'}`}>
                                    {parking.cameras && parking.cameras.length > 0 ? (
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            {parking.cameras.map((camera) => {
                                                const isCamActive = activeCameras.includes(camera.type)
                                                const isLoading   = loadingCameras.includes(camera.type)
                                                const camLabel    = getCameraLabel(camera)
                                                return (
                                                    <div key={camera.id} className="rounded-xl border bg-card shadow-sm overflow-hidden">
                                                        {/* Camera header */}
                                                        <div className="flex items-center justify-between p-3 border-b bg-muted/30">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <CameraIcon className="h-4 w-4 text-primary flex-shrink-0"/>
                                                                <h3 className="font-semibold text-sm truncate">{camera.name}</h3>
                                                                {isCamActive && <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse flex-shrink-0"/>}
                                                            </div>
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase flex-shrink-0 ${camLabel.color}`}>{camLabel.label}</span>
                                                        </div>
                                                        {/* Video area */}
                                                        <div id={`camera-container-${camera.type}`} className="group relative aspect-video bg-slate-950 overflow-hidden">
                                                            {renderVideoFeed(camera)}
                                                            {isCamActive && (
                                                                <button onClick={() => toggleFullscreen(camera.type)} className="absolute top-3 right-3 p-1.5 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                                                    {isFullscreen ? <Minimize className="h-4 w-4"/> : <Maximize className="h-4 w-4"/>}
                                                                </button>
                                                            )}
                                                        </div>
                                                        {/* Camera footer */}
                                                        <div className="p-3 bg-muted/20 space-y-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] text-muted-foreground shrink-0">URL:</span>
                                                                <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded truncate flex-1">{camera.stream_url}</span>
                                                            </div>
                                                            {camera.type === 'gate' && (
                                                                <p className={`text-[10px] font-semibold ${camera.gate_mode === 'exit' ? 'text-orange-600' : 'text-green-600'}`}>
                                                                    {camera.gate_mode === 'exit' ? '🚪 Sortie — calcul tarif' : '🚗 Entrée — vérif. réservation'}
                                                                </p>
                                                            )}
                                                            <Button variant={isCamActive ? 'destructive' : 'default'} size="sm" className="w-full"
                                                                disabled={isLoading || !isServerOnline || isSyncingState}
                                                                onClick={() => toggleCamera(camera)}>
                                                                {isLoading || isSyncingState
                                                                    ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin"/>{isSyncingState ? 'Sync...' : 'Connexion...'}</>
                                                                    : isCamActive
                                                                        ? <><StopCircle className="h-4 w-4 mr-1.5"/>Arrêter</>
                                                                        : <><PlayCircle className="h-4 w-4 mr-1.5"/>Démarrer</>
                                                                }
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-2xl bg-muted/20">
                                            <Video className="h-16 w-16 text-muted-foreground/30 mb-4"/>
                                            <h3 className="text-lg font-semibold mb-2">Aucune caméra configurée</h3>
                                            <Button onClick={() => router.visit(`/parkings/${parking.id}/edit`)}><Edit className="w-4 h-4 mr-2"/> Configurer</Button>
                                        </div>
                                    )}
                                </div>

                                {/* ── AI Panel — desktop sidebar / mobile tab ── */}
                                {activeCameras.length > 0 && liveAIData && (
                                    <div className={`w-full lg:w-80 lg:flex-shrink-0 ${mobileCameraTab === 'tracker' ? 'block lg:block' : 'hidden lg:block'}`}>
                                        {/* Desktop: sticky; mobile: normal flow */}
                                        <div className="lg:sticky lg:top-6">
                                            {renderAIPanel()}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ══════════════════════════════════════
                        TAB : RESERVATIONS
                    ══════════════════════════════════════ */}
                    {isOwner && activeTab === 'reservations' && (
                        <div className="space-y-6 w-full">
                            <div>
                                <h2 className="text-2xl font-bold tracking-tight">Réservations</h2>
                                <p className="text-sm text-muted-foreground mt-1">Suivi de toutes les réservations de ce parking.</p>
                            </div>

                            {/* Awaiting payment info banner */}
                            {reservationStats.awaitingPayment > 0 && (
                                <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/40 dark:border-rose-900 p-4">
                                    <CreditCard className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5"/>
                                    <div>
                                        <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">
                                            {reservationStats.awaitingPayment} véhicule{reservationStats.awaitingPayment > 1 ? 's' : ''} en attente de paiement
                                        </p>
                                        <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5 flex items-center gap-1">
                                            <Receipt className="h-3 w-3 flex-shrink-0"/>
                                            Ces drivers paient depuis <strong className="ml-0.5">Mes Réservations</strong>. Barrière auto après confirmation.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Stats cards */}
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                {[
                                    { icon: ClipboardList, val: reservationStats.total,                          color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950', label: 'Total'        },
                                    { icon: TrendingUp,    val: reservationStats.active,                         color: 'text-emerald-600 dark:text-emerald-400',bg: 'bg-emerald-50 dark:bg-emerald-950',label: 'Actives'      },
                                    { icon: CreditCard,    val: reservationStats.awaitingPayment,                color: 'text-rose-600 dark:text-rose-400',     bg: 'bg-rose-50 dark:bg-rose-950',      label: 'Att. paiement'},
                                    { icon: DollarSign,    val: `${reservationStats.totalRevenue.toFixed(2)}`,   color: 'text-green-600 dark:text-green-400',   bg: 'bg-green-50 dark:bg-green-950',    label: 'Revenus TND'  },
                                ].map(({ icon: Icon, val, color, bg, label }) => (
                                    <div key={label} className="rounded-xl border bg-card p-4 shadow-sm flex items-center gap-3">
                                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg}`}><Icon className={`h-5 w-5 ${color}`}/></div>
                                        <div><p className={`text-xl font-bold ${color}`}>{val}</p><p className="text-[11px] text-muted-foreground">{label}</p></div>
                                    </div>
                                ))}
                            </div>

                            {/* Filters */}
                            <div className="rounded-xl border bg-card p-4 shadow-sm">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="relative flex-1 sm:max-w-xs">
                                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
                                        <input type="text" placeholder="Nom, plaque, email..."
                                            value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                                            className="h-9 w-full rounded-lg border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"/>
                                        {searchQuery && <button onClick={() => { setSearchQuery(''); setCurrentPage(1) }} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="h-3.5 w-3.5 text-muted-foreground"/></button>}
                                    </div>
                                    <div className="flex flex-wrap gap-2 items-center">
                                        <div className="flex items-center gap-2">
                                            <label className="text-xs text-muted-foreground whitespace-nowrap">Jour</label>
                                            <input type="date" value={selectedDay} onChange={(e) => { setSelectedDay(e.target.value); setSelectedMonth(''); setCurrentPage(1) }} className="h-8 rounded-md border bg-background px-2 text-xs"/>
                                            {selectedDay && <button onClick={() => { setSelectedDay(''); setCurrentPage(1) }}><X className="h-3 w-3 text-muted-foreground"/></button>}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <label className="text-xs text-muted-foreground whitespace-nowrap">Mois</label>
                                            <input type="month" value={selectedMonth} onChange={(e) => { setSelectedMonth(e.target.value); setSelectedDay(''); setCurrentPage(1) }} className="h-8 rounded-md border bg-background px-2 text-xs"/>
                                            {selectedMonth && <button onClick={() => { setSelectedMonth(''); setCurrentPage(1) }}><X className="h-3 w-3 text-muted-foreground"/></button>}
                                        </div>
                                        <span className="text-xs text-muted-foreground ml-auto"><ListFilter className="inline h-3.5 w-3.5 mr-1"/>{totalFiltered}/{reservations.length}</span>
                                    </div>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                    {STATUS_FILTERS.map((sf) => {
                                        const count = sf.key === 'all' ? reservations.length : reservations.filter(r => r.status === sf.key).length
                                        if (sf.key !== 'all' && count === 0) return null
                                        return (
                                            <button key={sf.key} onClick={() => { setStatusFilter(sf.key); setCurrentPage(1) }}
                                                className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${statusFilter === sf.key ? 'bg-primary text-primary-foreground border-primary' : 'bg-transparent text-muted-foreground hover:bg-muted border-border'}`}>
                                                {sf.label} <span className="opacity-60">({count})</span>
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
                                            <th className="px-4 py-3 font-medium text-muted-foreground">Véhicule</th>
                                            <th className="px-4 py-3 font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort('start_time')}>Horaire <SortIcon field="start_time"/></th>
                                            <th className="px-4 py-3 font-medium text-muted-foreground">Statut</th>
                                            <th className="px-4 py-3 font-medium text-muted-foreground text-right cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort('total_price')}>Prix <SortIcon field="total_price"/></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {paginatedReservations.length === 0
                                            ? <tr><td colSpan={5} className="py-12 text-center text-muted-foreground"><CalendarCheck className="h-8 w-8 opacity-30 mx-auto mb-2"/>Aucune réservation</td></tr>
                                            : paginatedReservations.map((r) => {
                                                const sc = getStatusConfig(r.status); const SI = sc.icon
                                                const isAwaiting = r.status === 'awaiting_payment'
                                                return (
                                                    <tr key={r.id} className={`transition-colors ${isAwaiting ? 'bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-50' : 'hover:bg-muted/30'}`}>
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-3">
                                                                {r.user_avatar ? <img src={r.user_avatar} alt={r.user_name} className="h-8 w-8 rounded-full object-cover border"/> : <div className="h-8 w-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-xs">{r.user_name.charAt(0).toUpperCase()}</div>}
                                                                <div><p className="font-medium text-sm">{r.user_name}</p><p className="text-xs text-muted-foreground">{r.user_email}</p></div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <p className="font-mono text-xs font-bold">{r.exit_plate ?? r.vehicle_plate}</p>
                                                            <p className="text-[11px] text-muted-foreground">{r.vehicle_brand} {r.vehicle_model}</p>
                                                            {r.duration_minutes != null && <p className="text-[10px] text-blue-600 mt-0.5">{r.duration_minutes} min</p>}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <p className="text-xs font-medium">{formatDateShort(r.start_time)}</p>
                                                            <p className="text-[11px] text-muted-foreground">{formatTime(r.start_time)} → {formatTime(r.end_time)}</p>
                                                            {r.actual_entry_at && <p className="text-[10px] text-green-600 mt-0.5">↓IN {formatTime(r.actual_entry_at)}</p>}
                                                            {r.actual_exit_at  && <p className="text-[10px] text-orange-600">↑OUT {formatTime(r.actual_exit_at)}</p>}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold ${sc.bg} ${sc.text}`}><SI className="h-3 w-3"/>{sc.label}</span>
                                                            {r.paid_at && <p className="text-[10px] text-teal-600 mt-0.5">Payé {formatTime(r.paid_at)}</p>}
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <p className="font-medium tabular-nums">{Number(r.total_price).toFixed(2)} TND</p>
                                                            {isAwaiting && (
                                                                <span className="text-[10px] text-rose-500 mt-1 flex items-center gap-0.5 ml-auto italic">
                                                                    <Receipt className="h-3 w-3 flex-shrink-0"/>En attente driver
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                )
                                            })
                                        }
                                    </tbody>
                                </table>
                                {totalFiltered > PAGE_SIZE && (
                                    <div className="flex justify-between items-center px-4 py-3 border-t text-xs text-muted-foreground">
                                        <span>Page {currentPage}/{totalPages} · {totalFiltered} rés.</span>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p-1)}>Préc.</Button>
                                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                const page = Math.max(1, Math.min(currentPage - 2, totalPages - 4)) + i
                                                return <Button key={page} variant={page === currentPage ? 'default' : 'outline'} size="sm" className="w-8 px-0" onClick={() => setCurrentPage(page)}>{page}</Button>
                                            })}
                                            <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p+1)}>Suiv.</Button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Mobile cards */}
                            <div className="space-y-3 sm:hidden">
                                {paginatedReservations.length === 0
                                    ? <div className="flex flex-col items-center gap-2 rounded-xl border bg-card p-8 text-muted-foreground shadow-sm"><CalendarCheck className="h-10 w-10 opacity-30"/><p className="font-medium">Aucune réservation</p></div>
                                    : paginatedReservations.map((r) => {
                                        const sc = getStatusConfig(r.status); const SI = sc.icon
                                        const isExpanded = expandedRow === r.id
                                        const isAwaiting = r.status === 'awaiting_payment'
                                        return (
                                            <div key={r.id} className={`overflow-hidden rounded-xl border shadow-sm ${isAwaiting ? 'border-rose-200 bg-rose-50/30 dark:bg-rose-950/20' : 'bg-card'}`}>
                                                <button className="flex w-full items-center justify-between p-4 text-left" onClick={() => setExpandedRow(isExpanded ? null : r.id)}>
                                                    <div className="flex items-center gap-3">
                                                        {r.user_avatar ? <img src={r.user_avatar} alt={r.user_name} className="h-10 w-10 rounded-full object-cover"/> : <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold">{r.user_name.charAt(0).toUpperCase()}</div>}
                                                        <div className="min-w-0">
                                                            <p className="truncate font-semibold">{r.user_name}</p>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${sc.bg} ${sc.text} ${sc.ring}`}><SI className="h-2.5 w-2.5"/>{sc.label}</span>
                                                                <span className="text-xs text-muted-foreground tabular-nums">{Number(r.total_price).toFixed(2)} TND</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {isExpanded ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground"/> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground"/>}
                                                </button>
                                                {isExpanded && (
                                                    <div className="border-t bg-muted/20 px-4 py-3 space-y-2">
                                                        <div className="flex items-center gap-2 text-sm"><Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0"/><span className="text-muted-foreground truncate">{r.user_email}</span></div>
                                                        <div className="flex items-center gap-2 text-sm"><Car className="h-3.5 w-3.5 text-muted-foreground shrink-0"/><span className="font-mono text-xs font-bold">{r.exit_plate ?? r.vehicle_plate}</span><span className="text-xs text-muted-foreground">{r.vehicle_brand} {r.vehicle_model}</span></div>
                                                        <div className="flex items-center gap-2 text-sm"><Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0"/><span className="text-xs">{formatDateShort(r.start_time)}</span><span className="text-muted-foreground text-xs">{formatTime(r.start_time)} → {formatTime(r.end_time)}</span></div>
                                                        {r.duration_minutes != null && <div className="flex items-center gap-2"><Timer className="h-3.5 w-3.5 text-blue-500"/><span className="text-sm text-blue-600 font-medium">{r.duration_minutes} min · {Number(r.total_price).toFixed(2)} TND</span></div>}
                                                        {r.actual_entry_at && <p className="text-xs text-green-600">↓IN {formatTime(r.actual_entry_at)}</p>}
                                                        {r.actual_exit_at  && <p className="text-xs text-orange-600">↑OUT {formatTime(r.actual_exit_at)}</p>}
                                                        {/* Awaiting payment info — no button */}
                                                        {isAwaiting && (
                                                            <div className="rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 px-3 py-2 flex items-start gap-2">
                                                                <Receipt className="h-4 w-4 text-rose-500 flex-shrink-0 mt-0.5"/>
                                                                <p className="text-xs text-rose-700 dark:text-rose-300 leading-snug">
                                                                    En attente paiement depuis <strong>Mes Réservations</strong>. Barrière auto.
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })
                                }
                                {totalFiltered > PAGE_SIZE && (
                                    <div className="flex justify-between items-center pt-2 text-xs text-muted-foreground">
                                        <span>Page {currentPage}/{totalPages}</span>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p-1)}>Préc.</Button>
                                            <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p+1)}>Suiv.</Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── DEBUG PANEL ── */}
                {showDebugPanel && (
                    <div className="fixed bottom-4 right-4 bg-black/90 text-white p-4 rounded-lg text-xs font-mono max-w-xs z-50 shadow-xl">
                        <div className="flex items-center justify-between mb-3">
                            <span className="font-bold text-green-400">🔧 DEBUG</span>
                            <button onClick={() => setShowDebugPanel(false)}><X className="h-4 w-4 text-gray-400 hover:text-white"/></button>
                        </div>
                        <div className="space-y-1">
                            <div className="flex justify-between"><span className="text-gray-400">Parking:</span><span className="text-yellow-400">{parking.id}</span></div>
                            <div className="flex justify-between"><span className="text-gray-400">Server:</span><span className={isServerOnline ? 'text-green-400' : 'text-red-400'}>{isServerOnline ? 'ONLINE' : 'OFFLINE'}</span></div>
                            <div className="flex justify-between"><span className="text-gray-400">Cameras:</span><span className="text-yellow-400">{activeCameras.join(', ') || 'None'}</span></div>
                            <div className="flex justify-between"><span className="text-gray-400">Last plate:</span><span className="text-cyan-400">{liveAIData?.last_plate || '-'}</span></div>
                            <div className="flex justify-between"><span className="text-gray-400">Status:</span><span className="text-purple-400">{liveAIData?.last_plate_status || '-'}</span></div>
                            <div className="flex justify-between"><span className="text-gray-400">Awaiting:</span><span className="text-rose-400">{reservationStats.awaitingPayment}</span></div>
                            <div className="flex justify-between"><span className="text-gray-400">Cars:</span><span className="text-cyan-400">{liveDetectedCars}</span></div>
                            <div className="flex justify-between"><span className="text-gray-400">Free:</span><span className="text-emerald-400">{liveAvailableSpots}</span></div>
                            <div className="flex justify-between"><span className="text-gray-400">Occ.:</span><span className="text-violet-400">{liveOccupancy}%</span></div>
                            <div className="flex justify-between"><span className="text-gray-400">Mobile tab:</span><span className="text-blue-400">{mobileCameraTab}</span></div>
                        </div>
                    </div>
                )}

                <div className="h-8"/>
            </div>
        </AppLayout>
    )
}