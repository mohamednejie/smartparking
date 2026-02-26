import { Link } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

interface Props {
    ownerCount: number;
    driverCount: number;
    parkingCount: number;
}

interface Stat {
    value: number;
    target: number;
    suffix: string;
    label: string;
}

// ──────────── Hook: Intersection Observer ────────────
function useInView(threshold = 0.2) {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) setVisible(true);
            },
            { threshold },
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, [threshold]);

    return { ref, visible };
}

// ──────────── Hook: Animated Counter ────────────
function useAnimatedStats(visible: boolean, initialStats: Stat[]): Stat[] {
    const [stats, setStats] = useState<Stat[]>(initialStats);
    const started = useRef(false);

    useEffect(() => {
        if (!visible || started.current) return;
        started.current = true;
        const duration = 2000;
        const steps = 60;

        initialStats.forEach((stat, idx) => {
            const increment = stat.target / steps;
            let current = 0;
            const interval = setInterval(() => {
                current += increment;
                if (current >= stat.target) {
                    current = stat.target;
                    clearInterval(interval);
                }
                setStats((prev) => {
                    const copy = [...prev];
                    copy[idx] = { ...copy[idx], value: Math.floor(current) };
                    return copy;
                });
            }, duration / steps);
        });
    }, [visible]);

    return stats;
}

// ══════════════════════ COMPONENT ══════════════════════
export default function Welcome({ ownerCount, driverCount ,parkingCount}: Props) {
    const [currentTestimonial, setCurrentTestimonial] = useState(0);
    const [mobileMenu, setMobileMenu] = useState(false);
    // 🔥 État pour basculer entre la vue Driver et Owner
    const [activeTab, setActiveTab] = useState<'driver' | 'owner'>('driver');

    const statsSection = useInView();
    const aboutSection = useInView();
    const servicesSection = useInView();
    const howItWorksSection = useInView();
    const forDriversSection = useInView();
    const forOwnersSection = useInView();
    const pricingSection = useInView();
    const faqSection = useInView();
    const ctaSection = useInView();

    const stats = useAnimatedStats(statsSection.visible, [
        { value: 0, target: driverCount, suffix: '', label: 'Active Drivers' },
        { value: 0, target: ownerCount, suffix: '', label: 'Parking Owners' },
        { value: 0, target: parkingCount, suffix: '', label: 'Number of Parkings' },
        { value: 0, target: 24, suffix: '/7', label: 'Availability' },
    ]);

    // 🔥 Témoignages pour les deux types d'utilisateurs
    const testimonials = [
        {
            name: 'James Carter',
            role: 'Parking Owner, NYC',
            text: 'Parking Vision Pro transformed my operations. The AI detection alone saved us thousands in unauthorized parking.',
            rating: 5,
            type: 'owner',
        },
        {
            name: 'Emily Rodriguez',
            role: 'Daily Commuter, LA',
            text: 'Finding parking used to be a nightmare. Now I book a spot in seconds and know exactly where to go!',
            rating: 5,
            type: 'driver',
        },
        {
            name: 'David Chen',
            role: 'Property Developer',
            text: 'Upgraded to Premium for the annotation feature. The ROI was visible within the first two weeks.',
            rating: 5,
            type: 'owner',
        },
        {
            name: 'Sarah Mitchell',
            role: 'Uber Driver, Chicago',
            text: 'As a rideshare driver, I need parking fast. This app shows me real-time availability — it\'s a game changer.',
            rating: 5,
            type: 'driver',
        },
    ];

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="min-h-screen bg-gray-950 text-white overflow-hidden">
            {/* ════════════ NAVBAR ════════════ */}
            <nav className="fixed top-0 w-full z-50 bg-gray-950/80 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative w-11 h-11 bg-gradient-to-br from-emerald-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse border-2 border-gray-950" />
                        </div>
                        <div>
                            <span className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                                Parking Vision Pro
                            </span>
                            <div className="text-[10px] text-gray-500 tracking-widest uppercase -mt-0.5">Find & Manage Parking</div>
                        </div>
                    </div>

                    <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
                        <a href="#about" className="hover:text-white transition-colors duration-300">About</a>
                        <a href="#for-drivers" className="hover:text-white transition-colors duration-300">For Drivers</a>
                        <a href="#for-owners" className="hover:text-white transition-colors duration-300">For Owners</a>
                        <a href="#how-it-works" className="hover:text-white transition-colors duration-300">How It Works</a>
                        <a href="#pricing" className="hover:text-white transition-colors duration-300">Pricing</a>
                        <a href="#faq" className="hover:text-white transition-colors duration-300">FAQ</a>
                    </div>

                    <div className="hidden md:flex items-center gap-3">
                        <Link href="/login" className="px-5 py-2.5 text-sm text-gray-300 hover:text-white transition-colors">
                            Sign In
                        </Link>
                        <Link href="/register" className="px-5 py-2.5 text-sm bg-gradient-to-r from-emerald-600 to-cyan-600 rounded-xl hover:from-emerald-500 hover:to-cyan-500 transition-all duration-300 shadow-lg shadow-emerald-500/25 font-semibold">
                            Get Started Free
                        </Link>
                    </div>

                    {/* Mobile menu button */}
                    <button onClick={() => setMobileMenu(!mobileMenu)} className="md:hidden text-gray-400 hover:text-white">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {mobileMenu ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            )}
                        </svg>
                    </button>
                </div>

                {/* Mobile menu */}
                {mobileMenu && (
                    <div className="md:hidden bg-gray-900/95 backdrop-blur-xl border-t border-white/5 px-6 py-6 space-y-4">
                        {['About', 'For Drivers', 'For Owners', 'How It Works', 'Pricing', 'FAQ'].map((item) => (
                            <a 
                                key={item} 
                                href={`#${item.toLowerCase().replace(' ', '-')}`} 
                                onClick={() => setMobileMenu(false)} 
                                className="block text-gray-400 hover:text-white transition-colors"
                            >
                                {item}
                            </a>
                        ))}
                        <div className="pt-4 border-t border-white/5 flex gap-3">
                            <Link href="/login" className="flex-1 py-3 text-center border border-white/20 rounded-xl text-sm">Sign In</Link>
                            <Link href="/register" className="flex-1 py-3 text-center bg-gradient-to-r from-emerald-600 to-cyan-600 rounded-xl text-sm font-semibold">Get Started</Link>
                        </div>
                    </div>
                )}
            </nav>

            {/* ════════════ HERO ════════════ */}
            <section className="relative min-h-screen flex items-center justify-center pt-20">
                <div className="absolute inset-0">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl animate-pulse [animation-delay:2s]" />
                    <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl" />
                </div>

                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />

                <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
                    {/* 🔥 Badge avec les deux compteurs */}
                    <div className="inline-flex items-center gap-4 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm mb-8 animate-fade-in-down">
                        <div className="flex items-center gap-2 text-cyan-400">
                            <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                            {driverCount} drivers
                        </div>
                        <div className="w-px h-4 bg-white/20" />
                        <div className="flex items-center gap-2 text-emerald-400">
                            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                            {ownerCount} owners
                        </div>
                    </div>

                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold leading-tight mb-8 animate-fade-in-up">
                        <span className="block">Smart Parking</span>
                        <span className="block bg-gradient-to-r from-emerald-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
                            For Everyone
                        </span>
                    </h1>

                    <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto mb-12 animate-fade-in-up [animation-delay:300ms]">
                        <span className="text-cyan-400 font-semibold">Drivers:</span> Find and book parking spots instantly.{' '}
                        <span className="text-emerald-400 font-semibold">Owners:</span> Monetize your spaces with AI-powered management.
                    </p>

                    {/* 🔥 Double CTA pour Driver et Owner */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up [animation-delay:600ms]">
                        <Link 
                            href="/register" 
                            className="group px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-2xl text-lg font-semibold hover:from-cyan-500 hover:to-blue-500 transition-all duration-300 shadow-2xl shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-105 flex items-center gap-3"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                            I'm a Driver
                            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </Link>
                        <Link 
                            href="/register" 
                            className="group px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl text-lg font-semibold hover:from-emerald-500 hover:to-teal-500 transition-all duration-300 shadow-2xl shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-105 flex items-center gap-3"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            I'm an Owner
                            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </Link>
                    </div>

                    {/* 🔥 Visual Tabs pour montrer les deux interfaces */}
                    <div className="mt-20 relative animate-fade-in-up [animation-delay:900ms]">
                        {/* Toggle Tabs */}
                        <div className="flex justify-center mb-6">
                            <div className="inline-flex bg-gray-800/50 rounded-full p-1 border border-white/10">
                                <button
                                    onClick={() => setActiveTab('driver')}
                                    className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                                        activeTab === 'driver'
                                            ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg'
                                            : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    🚗 Driver View
                                </button>
                                <button
                                    onClick={() => setActiveTab('owner')}
                                    className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                                        activeTab === 'owner'
                                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg'
                                            : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    🅿️ Owner View
                                </button>
                            </div>
                        </div>

                        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent z-10 pointer-events-none" />
                        <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-3xl p-2 backdrop-blur-sm">
                            <div className="bg-gray-900 rounded-2xl p-6">
                                {/* Window controls */}
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-3 h-3 rounded-full bg-red-500" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                    <div className="w-3 h-3 rounded-full bg-green-500" />
                                    <span className="text-xs text-gray-500 ml-2">
                                        {activeTab === 'driver' ? 'Find Parking — Driver App' : 'Parking Vision Pro — Owner Dashboard'}
                                    </span>
                                    <div className="ml-auto flex items-center gap-1.5">
                                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                        <span className="text-xs text-green-400">LIVE</span>
                                    </div>
                                </div>

                                {/* 🔥 DRIVER VIEW */}
                                {activeTab === 'driver' && (
                                    <div className="grid grid-cols-12 gap-4 transition-all duration-500">
                                        {/* Map area */}
                                        <div className="col-span-8 bg-gray-800/50 rounded-xl p-4 border border-white/5 min-h-[280px] relative overflow-hidden">
                                            {/* Fake map */}
                                            <div className="absolute inset-4 bg-gradient-to-br from-cyan-900/20 to-blue-900/20 rounded-lg">
                                                {/* Road lines */}
                                                <div className="absolute top-1/2 left-0 right-0 h-8 bg-gray-700/50 -translate-y-1/2" />
                                                <div className="absolute top-0 bottom-0 left-1/3 w-6 bg-gray-700/50" />
                                                
                                                {/* Parking markers */}
                                                <div className="absolute top-8 left-12 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-xs font-bold animate-bounce">
                                                    $5
                                                </div>
                                                <div className="absolute top-20 right-16 w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center text-xs font-bold">
                                                    $8
                                                </div>
                                                <div className="absolute bottom-12 left-1/2 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-xs font-bold">
                                                    $3
                                                </div>
                                                <div className="absolute bottom-20 right-8 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-xs font-bold text-black">
                                                    $6
                                                </div>
                                                
                                                {/* User location */}
                                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                                    <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg" />
                                                    <div className="absolute inset-0 w-4 h-4 bg-blue-500 rounded-full animate-ping" />
                                                </div>
                                            </div>

                                            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
                                                <span className="text-[10px] text-gray-500 font-mono">📍 Near your location</span>
                                                <span className="text-[10px] text-cyan-400 font-mono">4 spots available</span>
                                            </div>
                                        </div>

                                        {/* Parking list */}
                                        <div className="col-span-4 space-y-3">
                                            <div className="bg-gray-800/50 rounded-xl p-4 border border-cyan-500/30">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-semibold text-white">Downtown Lot A</span>
                                                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">Open</span>
                                                </div>
                                                <div className="text-2xl font-bold text-cyan-400">$5/hr</div>
                                                <div className="text-[10px] text-gray-500 mt-1">0.3 miles away • 12 spots</div>
                                                <button className="w-full mt-3 py-2 bg-cyan-600 rounded-lg text-xs font-semibold hover:bg-cyan-500 transition-colors">
                                                    Book Now
                                                </button>
                                            </div>
                                            <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-semibold text-white">Main Street Garage</span>
                                                    <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">5 left</span>
                                                </div>
                                                <div className="text-2xl font-bold text-white">$8/hr</div>
                                                <div className="text-[10px] text-gray-500 mt-1">0.5 miles away • Covered</div>
                                            </div>
                                            <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-semibold text-white">City Center</span>
                                                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">Open</span>
                                                </div>
                                                <div className="text-2xl font-bold text-white">$3/hr</div>
                                                <div className="text-[10px] text-gray-500 mt-1">0.8 miles away • 24 spots</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 🔥 OWNER VIEW */}
                                {activeTab === 'owner' && (
                                    <div className="grid grid-cols-12 gap-4 transition-all duration-500">
                                        {/* Camera feed mockup */}
                                        <div className="col-span-8 bg-gray-800/50 rounded-xl p-4 border border-white/5 min-h-[280px] relative overflow-hidden">
                                            <div className="absolute inset-4 border-2 border-dashed border-emerald-500/20 rounded-lg" />

                                            {/* Detected cars */}
                                            <div className="absolute top-8 left-8 w-24 h-16 border-2 border-emerald-400 rounded-lg flex items-end justify-center">
                                                <span className="bg-emerald-500 text-[10px] px-1.5 py-0.5 rounded-t font-mono font-bold">CAR-01</span>
                                            </div>
                                            <div className="absolute top-12 right-12 w-20 h-14 border-2 border-cyan-400 rounded-lg flex items-end justify-center">
                                                <span className="bg-cyan-500 text-[10px] px-1.5 py-0.5 rounded-t font-mono font-bold">CAR-02</span>
                                            </div>
                                            <div className="absolute bottom-16 left-1/3 w-22 h-15 border-2 border-yellow-400 rounded-lg flex items-end justify-center">
                                                <span className="bg-yellow-500 text-black text-[10px] px-1.5 py-0.5 rounded-t font-mono font-bold">CAR-03</span>
                                            </div>

                                            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
                                                <span className="text-[10px] text-gray-500 font-mono">CAMERA-01 | ZONE-A</span>
                                                <span className="text-[10px] text-emerald-400 font-mono">3 vehicles detected</span>
                                            </div>
                                        </div>

                                        {/* Stats panel */}
                                        <div className="col-span-4 space-y-3">
                                            <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
                                                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Occupancy</div>
                                                <div className="text-2xl font-bold text-emerald-400">73%</div>
                                                <div className="w-full bg-gray-700 rounded-full h-1.5 mt-2">
                                                    <div className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-1.5 rounded-full" style={{ width: '73%' }} />
                                                </div>
                                            </div>
                                            <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
                                                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Today's Revenue</div>
                                                <div className="text-2xl font-bold text-green-400">$2,340</div>
                                                <div className="text-[10px] text-green-400 mt-1">↑ 18% vs yesterday</div>
                                            </div>
                                            <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
                                                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">ANPR Reads</div>
                                                <div className="text-2xl font-bold text-cyan-400">847</div>
                                                <div className="text-[10px] text-cyan-400 mt-1">↑ 12% today</div>
                                            </div>
                                            <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
                                                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Alerts</div>
                                                <div className="flex items-center gap-2">
                                                    <div className="text-2xl font-bold text-orange-400">2</div>
                                                    <span className="text-[10px] text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded-full">Active</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ════════════ STATS ════════════ */}
            <section ref={statsSection.ref} className="relative py-20 border-y border-white/5">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {stats.map((stat, i) => (
                            <div
                                key={i}
                                className="text-center transition-all duration-700"
                                style={{
                                    transitionDelay: `${i * 150}ms`,
                                    opacity: statsSection.visible ? 1 : 0,
                                    transform: statsSection.visible ? 'translateY(0)' : 'translateY(2rem)',
                                }}
                            >
                                <div className={`text-4xl md:text-5xl font-bold bg-gradient-to-r ${
                                    i === 0 ? 'from-cyan-400 to-blue-400' : 'from-emerald-400 to-cyan-400'
                                } bg-clip-text text-transparent`}>
                                    {stat.value}{stat.suffix}
                                </div>
                                <div className="text-gray-500 mt-2 text-sm">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ════════════ ABOUT ════════════ */}
            <section id="about" ref={aboutSection.ref} className="py-32 relative">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid md:grid-cols-2 gap-16 items-center">
                        <div
                            className="transition-all duration-1000"
                            style={{
                                opacity: aboutSection.visible ? 1 : 0,
                                transform: aboutSection.visible ? 'translateX(0)' : 'translateX(-3rem)',
                            }}
                        >
                            <div className="text-sm font-semibold text-emerald-400 tracking-widest uppercase mb-4">About Us</div>
                            <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                                One Platform for{' '}
                                <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                                    Drivers & Owners
                                </span>
                            </h2>
                            <p className="text-gray-400 text-lg leading-relaxed mb-6">
                                <strong className="text-cyan-400">For Drivers:</strong> Stop circling blocks. Find available parking instantly, 
                                compare prices, and book your spot before you even arrive.
                            </p>
                            <p className="text-gray-400 text-lg leading-relaxed mb-6">
                                <strong className="text-emerald-400">For Owners:</strong> Transform your parking lots with AI-powered detection, 
                                ANPR plate recognition, and automated payment collection.
                            </p>
                            <p className="text-gray-400 text-lg leading-relaxed mb-8">
                                We connect people who need parking with people who have parking. Simple, efficient, profitable.
                            </p>
                            <div className="flex items-center gap-6">
                                <div className="flex -space-x-3">
                                    {['🚗', '🅿️', '📱', '💳'].map((emoji, i) => (
                                        <div key={i} className="w-10 h-10 rounded-full border-2 border-gray-950 bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-lg">
                                            {emoji}
                                        </div>
                                    ))}
                                </div>
                                <span className="text-gray-500 text-sm">
                                    <strong className="text-cyan-400">{driverCount}</strong> drivers • <strong className="text-emerald-400">{ownerCount}</strong> owners
                                </span>
                            </div>
                        </div>

                        <div
                            className="transition-all duration-1000"
                            style={{
                                transitionDelay: '300ms',
                                opacity: aboutSection.visible ? 1 : 0,
                                transform: aboutSection.visible ? 'translateX(0)' : 'translateX(3rem)',
                            }}
                        >
                            <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/20 to-emerald-600/20 rounded-3xl blur-3xl" />
                                <div className="relative bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-3xl p-8 space-y-6">
                                    {[
                                        { icon: '🚗', title: 'For Drivers', desc: 'Real-time availability, instant booking, secure payments. Park smarter, not harder.', color: 'text-cyan-400' },
                                        { icon: '🅿️', title: 'For Owners', desc: 'AI detection, ANPR, automated billing. Maximize revenue, minimize hassle.', color: 'text-emerald-400' },
                                        { icon: '🤝', title: 'Connected Ecosystem', desc: 'Drivers find spaces, owners fill spots. Everyone wins.', color: 'text-violet-400' },
                                    ].map((item) => (
                                        <div key={item.title} className="flex gap-4 p-4 rounded-2xl hover:bg-white/5 transition-colors duration-300">
                                            <div className="text-3xl">{item.icon}</div>
                                            <div>
                                                <h3 className={`font-semibold mb-1 ${item.color}`}>{item.title}</h3>
                                                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ════════════ FOR DRIVERS ════════════ */}
            <section id="for-drivers" ref={forDriversSection.ref} className="py-32 relative bg-gradient-to-b from-transparent via-cyan-950/10 to-transparent">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center transition-all duration-700" style={{ opacity: forDriversSection.visible ? 1 : 0, transform: forDriversSection.visible ? 'translateY(0)' : 'translateY(2rem)' }}>
                        <div className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-400 tracking-widest uppercase mb-4">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                            For Drivers
                        </div>
                        <h2 className="text-4xl md:text-5xl font-bold mb-6">
                            Find Parking in{' '}
                            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">Seconds</span>
                        </h2>
                        <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-16">
                            No more circling blocks. See real-time availability, compare prices, and book instantly.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            {
                                icon: '📍',
                                title: 'Real-Time Map',
                                desc: 'See all available parking spots near you with live updates and pricing.',
                            },
                            {
                                icon: '⚡',
                                title: 'Instant Booking',
                                desc: 'Reserve your spot in seconds. No phone calls, no hassle.',
                            },
                            {
                                icon: '💳',
                                title: 'Easy Payment',
                                desc: 'Pay securely via app. No cash needed, no ticket machines.',
                            },
                            {
                                icon: '🔔',
                                title: 'Smart Alerts',
                                desc: 'Get notified before your time expires. Extend remotely if needed.',
                            },
                        ].map((feature, i) => (
                            <div
                                key={feature.title}
                                className="group relative p-6 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-cyan-500/30 transition-all duration-500 hover:-translate-y-2"
                                style={{
                                    transitionDelay: `${i * 150 + 300}ms`,
                                    opacity: forDriversSection.visible ? 1 : 0,
                                    transform: forDriversSection.visible ? 'translateY(0)' : 'translateY(2rem)',
                                }}
                            >
                                <div className="text-4xl mb-4">{feature.icon}</div>
                                <h3 className="text-lg font-bold text-white mb-3">{feature.title}</h3>
                                <p className="text-gray-500 text-sm leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-12 text-center">
                        <Link 
                            href="/register" 
                            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-2xl text-lg font-semibold hover:from-cyan-500 hover:to-blue-500 transition-all duration-300 shadow-lg shadow-cyan-500/25"
                        >
                            Start Finding Parking
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </Link>
                    </div>
                </div>
            </section>

            {/* ════════════ FOR OWNERS ════════════ */}
            <section id="for-owners" ref={forOwnersSection.ref} className="py-32 relative bg-gradient-to-b from-transparent via-emerald-950/10 to-transparent">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center transition-all duration-700" style={{ opacity: forOwnersSection.visible ? 1 : 0, transform: forOwnersSection.visible ? 'translateY(0)' : 'translateY(2rem)' }}>
                        <div className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-400 tracking-widest uppercase mb-4">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            For Owners
                        </div>
                        <h2 className="text-4xl md:text-5xl font-bold mb-6">
                            Monetize Your Parking with{' '}
                            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">AI Power</span>
                        </h2>
                        <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-16">
                            Real-time vehicle detection, automatic plate recognition, and seamless payments. All in one platform.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            {
                                icon: (
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                ),
                                title: 'AI Car Detection',
                                desc: 'Real-time vehicle detection using computer vision. Know exactly who is in your lot.',
                                badge: 'All Plans',
                            },
                            {
                                icon: (
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                    </svg>
                                ),
                                title: 'ANPR Recognition',
                                desc: 'Automatic license plate reading. Log every entry and exit automatically.',
                                badge: 'All Plans',
                            },
                            {
                                icon: (
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                    </svg>
                                ),
                                title: 'Auto Payments',
                                desc: 'Integrated payment system. Drivers pay online, you get paid automatically.',
                                badge: 'All Plans',
                            },
                            {
                                icon: (
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                    </svg>
                                ),
                                title: 'Smart Annotation',
                                desc: 'Advanced bounding boxes with labels and vehicle classification.',
                                badge: 'Premium',
                            },
                        ].map((service, i) => (
                            <div
                                key={service.title}
                                className="group relative p-6 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-emerald-500/30 transition-all duration-500 hover:-translate-y-2"
                                style={{
                                    transitionDelay: `${i * 150 + 300}ms`,
                                    opacity: forOwnersSection.visible ? 1 : 0,
                                    transform: forOwnersSection.visible ? 'translateY(0)' : 'translateY(2rem)',
                                }}
                            >
                                <div className={`absolute top-4 right-4 text-[10px] px-2 py-0.5 rounded-full font-semibold ${service.badge === 'Premium' ? 'bg-amber-400/10 text-amber-400' : 'bg-emerald-400/10 text-emerald-400'}`}>
                                    {service.badge}
                                </div>
                                <div className="text-emerald-400 mb-4">{service.icon}</div>
                                <h3 className="text-lg font-bold text-white mb-3">{service.title}</h3>
                                <p className="text-gray-500 text-sm leading-relaxed">{service.desc}</p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-12 text-center">
                        <Link 
                            href="/register" 
                            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl text-lg font-semibold hover:from-emerald-500 hover:to-teal-500 transition-all duration-300 shadow-lg shadow-emerald-500/25"
                        >
                            List Your Parking
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </Link>
                    </div>
                </div>
            </section>

            {/* ════════════ HOW IT WORKS ════════════ */}
            <section id="how-it-works" ref={howItWorksSection.ref} className="py-32 relative">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center transition-all duration-700" style={{ opacity: howItWorksSection.visible ? 1 : 0, transform: howItWorksSection.visible ? 'translateY(0)' : 'translateY(2rem)' }}>
                        <div className="text-sm font-semibold text-violet-400 tracking-widest uppercase mb-4">How It Works</div>
                        <h2 className="text-4xl md:text-5xl font-bold mb-16">
                            Simple for{' '}
                            <span className="text-cyan-400">Drivers</span>{' '}
                            &{' '}
                            <span className="text-emerald-400">Owners</span>
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-2 gap-12">
                        {/* Driver Steps */}
                        <div 
                            className="transition-all duration-700"
                            style={{
                                transitionDelay: '200ms',
                                opacity: howItWorksSection.visible ? 1 : 0,
                                transform: howItWorksSection.visible ? 'translateX(0)' : 'translateX(-2rem)',
                            }}
                        >
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                                    🚗
                                </div>
                                <h3 className="text-2xl font-bold text-cyan-400">For Drivers</h3>
                            </div>
                            <div className="space-y-6">
                                {[
                                    { step: '1', title: 'Search', desc: 'Open the app and see available spots near you' },
                                    { step: '2', title: 'Compare', desc: 'Check prices, ratings, and distance' },
                                    { step: '3', title: 'Book', desc: 'Reserve your spot with one tap' },
                                    { step: '4', title: 'Park', desc: 'Follow directions and park stress-free' },
                                ].map((item, i) => (
                                    <div key={i} className="flex gap-4">
                                        <div className="w-10 h-10 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold flex-shrink-0">
                                            {item.step}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-white">{item.title}</h4>
                                            <p className="text-gray-500 text-sm">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Owner Steps */}
                        <div 
                            className="transition-all duration-700"
                            style={{
                                transitionDelay: '400ms',
                                opacity: howItWorksSection.visible ? 1 : 0,
                                transform: howItWorksSection.visible ? 'translateX(0)' : 'translateX(2rem)',
                            }}
                        >
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                                    🅿️
                                </div>
                                <h3 className="text-2xl font-bold text-emerald-400">For Owners</h3>
                            </div>
                            <div className="space-y-6">
                                {[
                                    { step: '1', title: 'Register', desc: 'Sign up and upload a photo of your parking' },
                                    { step: '2', title: 'AI Verification', desc: 'Our AI verifies your parking is valid' },
                                    { step: '3', title: 'Set Pricing', desc: 'Define your rates and availability' },
                                    { step: '4', title: 'Earn Money', desc: 'Drivers book, you get paid automatically' },
                                ].map((item, i) => (
                                    <div key={i} className="flex gap-4">
                                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold flex-shrink-0">
                                            {item.step}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-white">{item.title}</h4>
                                            <p className="text-gray-500 text-sm">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ════════════ PRICING (Owners) ════════════ */}
            <section id="pricing" ref={pricingSection.ref} className="py-32 relative">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center transition-all duration-700" style={{ opacity: pricingSection.visible ? 1 : 0, transform: pricingSection.visible ? 'translateY(0)' : 'translateY(2rem)' }}>
                        <div className="text-sm font-semibold text-violet-400 tracking-widest uppercase mb-4">Pricing</div>
                        <h2 className="text-4xl md:text-5xl font-bold mb-6">
                            Free for Drivers.{' '}
                            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Flexible for Owners.</span>
                        </h2>
                        <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-16">
                            Drivers use the app for free. Owners choose a plan that fits their needs.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        {/* DRIVER - FREE */}
                        <div
                            className="relative p-8 bg-gradient-to-br from-cyan-600/10 to-blue-600/10 border border-cyan-500/30 rounded-3xl transition-all duration-700 hover:-translate-y-2"
                            style={{
                                transitionDelay: '200ms',
                                opacity: pricingSection.visible ? 1 : 0,
                                transform: pricingSection.visible ? 'translateY(0)' : 'translateY(3rem)',
                            }}
                        >
                            <div className="text-4xl mb-4">🚗</div>
                            <div className="text-sm text-cyan-400 uppercase tracking-widest mb-2">Driver</div>
                            <div className="flex items-baseline gap-2 mb-2">
                                <span className="text-5xl font-bold text-white">Free</span>
                            </div>
                            <p className="text-gray-400 mb-8">Always free. Find and book parking easily.</p>

                            <Link href="/register" className="block w-full py-4 text-center bg-gradient-to-r from-cyan-600 to-blue-600 rounded-2xl text-white font-semibold hover:from-cyan-500 hover:to-blue-500 transition-all duration-300 mb-8">
                                Sign Up Free
                            </Link>

                            <div className="space-y-3">
                                {[
                                    'Search available spots',
                                    'Real-time availability',
                                    'Instant booking',
                                    'Secure payments',
                                    'Navigation to spot',
                                    'Booking history',
                                ].map((f) => (
                                    <div key={f} className="flex items-center gap-3 text-sm">
                                        <svg className="w-5 h-5 text-cyan-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span className="text-gray-400">{f}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* OWNER BASIC */}
                        <div
                            className="relative p-8 bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-3xl transition-all duration-700 hover:-translate-y-2"
                            style={{
                                transitionDelay: '400ms',
                                opacity: pricingSection.visible ? 1 : 0,
                                transform: pricingSection.visible ? 'translateY(0)' : 'translateY(3rem)',
                            }}
                        >
                            <div className="text-4xl mb-4">🅿️</div>
                            <div className="text-sm text-emerald-400 uppercase tracking-widest mb-2">Owner Basic</div>
                            <div className="flex items-baseline gap-2 mb-2">
                                <span className="text-5xl font-bold text-white">$0</span>
                                <span className="text-gray-500">/month</span>
                            </div>
                            <p className="text-gray-400 mb-8">Detection without annotation. Up to 3 locations.</p>

                            <Link href="/register" className="block w-full py-4 text-center border border-white/20 rounded-2xl text-white font-semibold hover:bg-white/5 transition-all duration-300 mb-8">
                                Get Started
                            </Link>

                            <div className="space-y-3">
                                {[
                                    'AI car detection',
                                    'ANPR plate recognition',
                                    'Up to 3 locations',
                                    'Online payments',
                                    'Basic dashboard',
                                    'Email support',
                                ].map((f) => (
                                    <div key={f} className="flex items-center gap-3 text-sm">
                                        <svg className="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span className="text-gray-400">{f}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* OWNER PREMIUM */}
                        <div
                            className="relative p-8 bg-gradient-to-br from-violet-600/10 to-cyan-600/10 border border-violet-500/30 rounded-3xl transition-all duration-700 hover:-translate-y-2"
                            style={{
                                transitionDelay: '600ms',
                                opacity: pricingSection.visible ? 1 : 0,
                                transform: pricingSection.visible ? 'translateY(0)' : 'translateY(3rem)',
                            }}
                        >
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-full text-xs font-semibold">
                                ⚡ Popular
                            </div>
                            <div className="text-4xl mb-4">👑</div>
                            <div className="text-sm text-violet-400 uppercase tracking-widest mb-2">Owner Premium</div>
                            <div className="flex items-baseline gap-2 mb-2">
                                <span className="text-5xl font-bold text-white">$49</span>
                                <span className="text-gray-500">/month</span>
                            </div>
                            <p className="text-gray-400 mb-8">Full AI power. Unlimited locations.</p>

                            <Link href="/register" className="block w-full py-4 text-center bg-gradient-to-r from-violet-600 to-cyan-600 rounded-2xl text-white font-semibold hover:from-violet-500 hover:to-cyan-500 transition-all duration-300 shadow-lg shadow-violet-500/25 mb-8">
                                Start Free Trial
                            </Link>

                            <div className="space-y-3">
                                {[
                                    'Everything in Basic',
                                    'Smart annotation',
                                    'Unlimited locations',
                                    'Vehicle classification',
                                    'Advanced analytics',
                                    '24/7 priority support',
                                ].map((f) => (
                                    <div key={f} className="flex items-center gap-3 text-sm">
                                        <svg className="w-5 h-5 text-violet-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span className="text-gray-300">{f}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ════════════ TESTIMONIALS ════════════ */}
            <section className="py-32 relative">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-950/10 to-transparent" />
                <div className="max-w-4xl mx-auto px-6 text-center relative">
                    <div className="text-sm font-semibold text-yellow-400 tracking-widest uppercase mb-4">Testimonials</div>
                    <h2 className="text-4xl md:text-5xl font-bold mb-16">
                        Loved by{' '}
                        <span className="text-cyan-400">Drivers</span>{' '}
                        &{' '}
                        <span className="text-emerald-400">Owners</span>
                    </h2>

                    <div className="relative h-56">
                        {testimonials.map((t, i) => (
                            <div
                                key={i}
                                className="absolute inset-0 flex flex-col items-center justify-center transition-all duration-600"
                                style={{
                                    opacity: currentTestimonial === i ? 1 : 0,
                                    transform: currentTestimonial === i ? 'translateY(0)' : 'translateY(20px)',
                                    pointerEvents: currentTestimonial === i ? 'auto' : 'none',
                                }}
                            >
                                {/* Badge Driver/Owner */}
                                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4 ${
                                    t.type === 'driver' 
                                        ? 'bg-cyan-500/20 text-cyan-400' 
                                        : 'bg-emerald-500/20 text-emerald-400'
                                }`}>
                                    {t.type === 'driver' ? '🚗 Driver' : '🅿️ Owner'}
                                </div>
                                <div className="flex gap-1 mb-4">
                                    {[...Array(t.rating)].map((_, j) => (
                                        <svg key={j} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                    ))}
                                </div>
                                <p className="text-2xl text-gray-300 italic leading-relaxed mb-8">"{t.text}"</p>
                                <div>
                                    <div className="font-semibold text-white">{t.name}</div>
                                    <div className="text-gray-500 text-sm">{t.role}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-center gap-2 mt-8">
                        {testimonials.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrentTestimonial(i)}
                                className={`h-2 rounded-full transition-all duration-300 ${currentTestimonial === i ? 'bg-yellow-400 w-8' : 'bg-gray-700 w-2'}`}
                            />
                        ))}
                    </div>
                </div>
            </section>

            {/* ════════════ FAQ ════════════ */}
            <section id="faq" ref={faqSection.ref} className="py-32 relative">
                <div className="max-w-3xl mx-auto px-6">
                    <div className="text-center transition-all duration-700" style={{ opacity: faqSection.visible ? 1 : 0, transform: faqSection.visible ? 'translateY(0)' : 'translateY(2rem)' }}>
                        <div className="text-sm font-semibold text-emerald-400 tracking-widest uppercase mb-4">FAQ</div>
                        <h2 className="text-4xl md:text-5xl font-bold mb-16">
                            Frequently Asked{' '}
                            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Questions</span>
                        </h2>
                    </div>

                    <div className="space-y-4">
                        {[
                            {
                                q: 'Is the app really free for drivers?',
                                a: 'Yes! Drivers can search, book, and pay for parking completely free. We make money from parking owners, not from drivers.',
                            },
                            {
                                q: 'How does AI parking verification work for owners?',
                                a: 'When you register as an owner, you upload a photo of your parking lot. Our AI analyzes the image to verify it\'s a legitimate parking space. This helps maintain quality and trust on our platform.',
                            },
                            {
                                q: 'What\'s the difference between Basic and Premium for owners?',
                                a: 'Basic includes car detection and ANPR for up to 3 locations. Premium adds smart annotation (bounding boxes, vehicle classification), unlimited locations, and advanced analytics.',
                            },
                            {
                                q: 'How do payments work?',
                                a: 'Drivers pay securely through the app when they book. Owners receive their earnings automatically via their connected payment account. We handle all the processing.',
                            },
                            {
                                q: 'Can I upgrade from Basic to Premium later?',
                                a: 'Absolutely! You can upgrade anytime from your dashboard. Your existing data and settings are preserved.',
                            },
                            {
                                q: 'What if the parking I booked is already taken?',
                                a: 'Our real-time detection ensures accurate availability. In the rare case of an issue, we offer full refunds and help you find an alternative spot.',
                            },
                        ].map((faq, i) => (
                            <FaqItem key={i} question={faq.q} answer={faq.a} visible={faqSection.visible} delay={i * 100 + 300} />
                        ))}
                    </div>
                </div>
            </section>

            {/* ════════════ CTA ════════════ */}
            <section ref={ctaSection.ref} className="py-32 relative">
                <div className="max-w-5xl mx-auto px-6">
                    <div
                        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-cyan-700 p-12 md:p-16 text-center transition-all duration-700"
                        style={{
                            opacity: ctaSection.visible ? 1 : 0,
                            transform: ctaSection.visible ? 'scale(1)' : 'scale(0.95)',
                        }}
                    >
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl" />

                        <div className="relative">
                            <h2 className="text-4xl md:text-5xl font-bold mb-6">
                                Ready to Get Started?
                            </h2>
                            <p className="text-emerald-100 text-lg mb-4 max-w-2xl mx-auto">
                                Join {driverCount + ownerCount}+ users already using Parking Vision Pro.
                            </p>
                            <p className="text-emerald-200/60 text-sm mb-10">
                                Free for drivers. Free tier available for owners.
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <Link href="/register" className="px-10 py-4 bg-white text-gray-900 font-bold rounded-2xl hover:bg-gray-100 transition-all duration-300 shadow-xl hover:scale-105 flex items-center gap-2">
                                    🚗 I'm a Driver
                                </Link>
                                <Link href="/register" className="px-10 py-4 border-2 border-white/30 rounded-2xl font-semibold hover:bg-white/10 transition-all duration-300 flex items-center gap-2">
                                    🅿️ I'm an Owner
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ════════════ FOOTER ════════════ */}
            <footer className="py-16 border-t border-white/5">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid md:grid-cols-4 gap-12 mb-12">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-cyan-600 rounded-xl flex items-center justify-center">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <span className="text-lg font-bold">Parking Vision Pro</span>
                            </div>
                            <p className="text-gray-500 text-sm leading-relaxed">
                                Smart parking for drivers. AI-powered management for owners.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-white mb-4">For Drivers</h4>
                            <ul className="space-y-2 text-sm text-gray-500">
                                <li><a href="#for-drivers" className="hover:text-white transition-colors">How It Works</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Find Parking</a></li>
                                <li><Link href="/register" className="hover:text-white transition-colors">Sign Up Free</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold text-white mb-4">For Owners</h4>
                            <ul className="space-y-2 text-sm text-gray-500">
                                <li><a href="#for-owners" className="hover:text-white transition-colors">Features</a></li>
                                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                                <li><Link href="/register" className="hover:text-white transition-colors">List Your Parking</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold text-white mb-4">Support</h4>
                            <ul className="space-y-2 text-sm text-gray-500">
                                <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
                                <li><a href="#about" className="hover:text-white transition-colors">About Us</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-gray-600 text-sm">
                        <p>© 2025 Parking Vision Pro. All rights reserved.</p>
                        <div className="flex items-center gap-4">
                            <span className="text-cyan-400">{driverCount} drivers</span>
                            <span className="text-gray-600">•</span>
                            <span className="text-emerald-400">{ownerCount} owners</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}

// ──────────── FAQ Accordion Item ────────────
function FaqItem({ question, answer, visible, delay }: { question: string; answer: string; visible: boolean; delay: number }) {
    const [open, setOpen] = useState(false);

    return (
        <div
            className="border border-white/5 rounded-2xl overflow-hidden transition-all duration-500 hover:border-emerald-500/20"
            style={{
                transitionDelay: `${delay}ms`,
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(1rem)',
            }}
        >
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-white/[0.02] transition-colors"
            >
                <span className="font-semibold text-white pr-4">{question}</span>
                <svg
                    className={`w-5 h-5 text-gray-500 flex-shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            <div className={`transition-all duration-300 overflow-hidden ${open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                <p className="px-6 pb-6 text-gray-400 leading-relaxed">{answer}</p>
            </div>
        </div>
    );
}