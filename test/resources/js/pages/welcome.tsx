import { Link } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

interface Props {
    ownerCount: number;
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
export default function Welcome({ ownerCount }: Props) {
    const [currentTestimonial, setCurrentTestimonial] = useState(0);
    const [mobileMenu, setMobileMenu] = useState(false);

    const statsSection = useInView();
    const aboutSection = useInView();
    const servicesSection = useInView();
    const challengesSection = useInView();
    const solutionSection = useInView();
    const pillarsSection = useInView();
    const pricingSection = useInView();
    const faqSection = useInView();
    const ctaSection = useInView();

    const stats = useAnimatedStats(statsSection.visible, [
        { value: 0, target: ownerCount, suffix: '', label: 'Parking Owners' },
        { value: 0, target: 99, suffix: '.9%', label: 'Detection Accuracy' },
        { value: 0, target: 24, suffix: '/7', label: 'Real-Time Monitoring' },
        { value: 0, target: 50, suffix: 'ms', label: 'Detection Speed' },
    ]);

    const testimonials = [
        {
            name: 'James Carter',
            role: 'Parking Owner, NYC',
            text: 'Parking Vision Pro transformed my operations. The ANPR detection alone saved us thousands in unauthorized parking.',
            rating: 5,
        },
        {
            name: 'Sarah Mitchell',
            role: 'Fleet Manager, LA',
            text: 'The real-time car detection is incredibly accurate. Managing multiple locations has never been this easy.',
            rating: 5,
        },
        {
            name: 'David Chen',
            role: 'Property Developer',
            text: 'Upgraded to Premium for the annotation feature. The ROI was visible within the first two weeks.',
            rating: 5,
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
                            <div className="text-[10px] text-gray-500 tracking-widest uppercase -mt-0.5">AI-Powered Detection</div>
                        </div>
                    </div>

                    <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
                        <a href="#about" className="hover:text-white transition-colors duration-300">About</a>
                        <a href="#services" className="hover:text-white transition-colors duration-300">Services</a>
                        <a href="#challenges" className="hover:text-white transition-colors duration-300">Challenges</a>
                        <a href="#pillars" className="hover:text-white transition-colors duration-300">Features</a>
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
                        {['About', 'Services', 'Challenges', 'Features', 'Pricing', 'FAQ'].map((item) => (
                            <a key={item} href={`#${item.toLowerCase()}`} onClick={() => setMobileMenu(false)} className="block text-gray-400 hover:text-white transition-colors">
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
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl animate-pulse-slow" />
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl animate-pulse-slow [animation-delay:2s]" />
                    <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl animate-float" />
                </div>

                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />

                <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm text-emerald-400 mb-8 animate-fade-in-down">
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        Trusted by {ownerCount} parking owner{ownerCount !== 1 ? 's' : ''} worldwide
                    </div>

                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold leading-tight mb-8 animate-fade-in-up">
                        <span className="block">AI-Powered</span>
                        <span className="block bg-gradient-to-r from-emerald-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
                            Car Detection
                        </span>
                        <span className="block text-4xl md:text-5xl lg:text-6xl mt-2 text-gray-300">& Smart Parking</span>
                    </h1>

                    <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto mb-12 animate-fade-in-up [animation-delay:300ms]">
                        Real-time vehicle detection, ANPR license plate recognition, and intelligent parking management.
                        Monitor, detect, and monetize your parking spaces with computer vision technology.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up [animation-delay:600ms]">
                        <Link href="/register" className="group px-8 py-4 bg-gradient-to-r from-emerald-600 to-cyan-600 rounded-2xl text-lg font-semibold hover:from-emerald-500 hover:to-cyan-500 transition-all duration-300 shadow-2xl shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-105">
                            Start Free — No Card Required
                            <svg className="inline-block w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </Link>
                        <a href="#services" className="px-8 py-4 border border-white/10 rounded-2xl text-lg text-gray-300 hover:bg-white/5 hover:border-white/20 transition-all duration-300">
                            Explore Features
                        </a>
                    </div>

                    {/* Hero visual — Detection mockup */}
                    <div className="mt-20 relative animate-fade-in-up [animation-delay:900ms]">
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent z-10 pointer-events-none" />
                        <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-3xl p-2 backdrop-blur-sm">
                            <div className="bg-gray-900 rounded-2xl p-6">
                                {/* Detection dashboard mockup */}
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-3 h-3 rounded-full bg-red-500" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                    <div className="w-3 h-3 rounded-full bg-green-500" />
                                    <span className="text-xs text-gray-500 ml-2">Parking Vision Pro — Live Detection</span>
                                    <div className="ml-auto flex items-center gap-1.5">
                                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                        <span className="text-xs text-green-400">LIVE</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-12 gap-4">
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
                                                <div className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: '73%' }} />
                                            </div>
                                        </div>
                                        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
                                            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">ANPR Reads</div>
                                            <div className="text-2xl font-bold text-cyan-400">847</div>
                                            <div className="text-[10px] text-cyan-400 mt-1">↑ 12% today</div>
                                        </div>
                                        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
                                            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Revenue</div>
                                            <div className="text-2xl font-bold text-green-400">$2,340</div>
                                            <div className="text-[10px] text-green-400 mt-1">Today's earnings</div>
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
                                <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
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
                                Revolutionizing Parking with{' '}
                                <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                                    Computer Vision
                                </span>
                            </h2>
                            <p className="text-gray-400 text-lg leading-relaxed mb-6">
                                Parking Vision Pro was built by engineers and parking industry experts who saw a massive gap:
                                parking lots worldwide still rely on manual monitoring, outdated sensors, and guesswork.
                            </p>
                            <p className="text-gray-400 text-lg leading-relaxed mb-6">
                                We leverage <strong className="text-white">AI-powered car detection</strong>,{' '}
                                <strong className="text-white">ANPR (Automatic Number Plate Recognition)</strong>, and{' '}
                                <strong className="text-white">real-time video analytics</strong> to give parking owners
                                unprecedented visibility and control.
                            </p>
                            <p className="text-gray-400 text-lg leading-relaxed mb-8">
                                Whether you own one lot or manage dozens, our platform scales with you — detecting every vehicle,
                                reading every plate, and optimizing every space.
                            </p>
                            <div className="flex items-center gap-6">
                                <div className="flex -space-x-3">
                                    {['J', 'S', 'D', 'M'].map((letter, i) => (
                                        <div key={i} className="w-10 h-10 rounded-full border-2 border-gray-950 bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-xs font-bold">
                                            {letter}
                                        </div>
                                    ))}
                                </div>
                                <span className="text-gray-500 text-sm">
                                    Trusted by <strong className="text-emerald-400">{ownerCount}</strong> parking owner{ownerCount !== 1 ? 's' : ''}
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
                                <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-cyan-600/20 rounded-3xl blur-3xl" />
                                <div className="relative bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-3xl p-8 space-y-6">
                                    {[
                                        { icon: '🎯', title: 'Our Mission', desc: 'Make AI-powered parking detection accessible to every parking owner, from small lots to enterprise facilities.' },
                                        { icon: '👁️', title: 'Our Vision', desc: 'A world where every parking space is monitored intelligently, every vehicle is identified, and every spot is monetized.' },
                                        { icon: '🔬', title: 'Our Technology', desc: 'Built on cutting-edge computer vision, deep learning models, and real-time video processing pipelines.' },
                                    ].map((item) => (
                                        <div key={item.title} className="flex gap-4 p-4 rounded-2xl hover:bg-white/5 transition-colors duration-300">
                                            <div className="text-3xl">{item.icon}</div>
                                            <div>
                                                <h3 className="font-semibold text-white mb-1">{item.title}</h3>
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

            {/* ════════════ SERVICES ════════════ */}
            <section id="services" ref={servicesSection.ref} className="py-32 relative bg-gradient-to-b from-transparent via-emerald-950/10 to-transparent">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center transition-all duration-700" style={{ opacity: servicesSection.visible ? 1 : 0, transform: servicesSection.visible ? 'translateY(0)' : 'translateY(2rem)' }}>
                        <div className="text-sm font-semibold text-emerald-400 tracking-widest uppercase mb-4">Our Services</div>
                        <h2 className="text-4xl md:text-5xl font-bold mb-6">
                            Everything You Need to{' '}
                            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Dominate Parking</span>
                        </h2>
                        <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-16">
                            From real-time detection to online payments, we provide a complete ecosystem for modern parking management.
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
                                title: 'Car Detection',
                                desc: 'AI-powered real-time vehicle detection using computer vision. Identify cars instantly in any lighting condition.',
                                color: 'emerald',
                                badge: 'All Plans',
                            },
                            {
                                icon: (
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                    </svg>
                                ),
                                title: 'ANPR Recognition',
                                desc: 'Automatic Number Plate Recognition reads and logs every license plate entering and exiting your facility.',
                                color: 'cyan',
                                badge: 'All Plans',
                            },
                            {
                                icon: (
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                    </svg>
                                ),
                                title: 'Online Payment',
                                desc: 'Integrated payment gateway for seamless parking fee collection. Accept cards, mobile payments, and more.',
                                color: 'violet',
                                badge: 'All Plans',
                            },
                            {
                                icon: (
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                    </svg>
                                ),
                                title: 'Smart Annotation',
                                desc: 'Advanced bounding box annotation with labels, zones, and detailed vehicle classification for deeper insights.',
                                color: 'amber',
                                badge: 'Premium',
                            },
                        ].map((service, i) => (
                            <div
                                key={service.title}
                                className={`group relative p-6 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-${service.color}-500/30 transition-all duration-500 hover:-translate-y-2`}
                                style={{
                                    transitionDelay: `${i * 150 + 300}ms`,
                                    opacity: servicesSection.visible ? 1 : 0,
                                    transform: servicesSection.visible ? 'translateY(0)' : 'translateY(2rem)',
                                }}
                            >
                                <div className={`absolute top-4 right-4 text-[10px] px-2 py-0.5 rounded-full font-semibold ${service.badge === 'Premium' ? 'bg-amber-400/10 text-amber-400' : 'bg-emerald-400/10 text-emerald-400'}`}>
                                    {service.badge}
                                </div>
                                <div className={`text-${service.color}-400 mb-4`}>{service.icon}</div>
                                <h3 className="text-lg font-bold text-white mb-3">{service.title}</h3>
                                <p className="text-gray-500 text-sm leading-relaxed">{service.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ════════════ CHALLENGES ════════════ */}
            <section id="challenges" ref={challengesSection.ref} className="py-32 relative bg-gradient-to-b from-transparent via-red-950/10 to-transparent">
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <div className="transition-all duration-700" style={{ opacity: challengesSection.visible ? 1 : 0, transform: challengesSection.visible ? 'translateY(0)' : 'translateY(2rem)' }}>
                        <div className="text-sm font-semibold text-red-400 tracking-widest uppercase mb-4">The Challenge</div>
                        <h2 className="text-4xl md:text-5xl font-bold mb-6">
                            Traditional Parking Is <span className="text-red-400">Broken</span>
                        </h2>
                        <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-16">
                            Without AI detection, parking owners face these costly problems every single day.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { icon: '🚫', title: 'Blind Spots', desc: 'No way to know real-time occupancy without physically checking each spot.' },
                            { icon: '🕵️', title: 'Unauthorized Parking', desc: 'Vehicles parking without paying, costing you thousands in lost revenue.' },
                            { icon: '📝', title: 'Manual Logging', desc: 'Staff manually recording plates is slow, error-prone, and expensive.' },
                            { icon: '💰', title: 'Payment Friction', desc: 'Cash-only or outdated payment systems driving customers away.' },
                        ].map((c, i) => (
                            <div
                                key={c.title}
                                className="group p-6 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-red-500/30 transition-all duration-500 hover:-translate-y-2"
                                style={{
                                    transitionDelay: `${i * 150 + 300}ms`,
                                    opacity: challengesSection.visible ? 1 : 0,
                                    transform: challengesSection.visible ? 'translateY(0)' : 'translateY(2rem)',
                                }}
                            >
                                <div className="text-4xl mb-4">{c.icon}</div>
                                <h3 className="text-lg font-semibold text-white mb-3">{c.title}</h3>
                                <p className="text-gray-500 text-sm leading-relaxed">{c.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ════════════ SOLUTION ════════════ */}
            <section ref={solutionSection.ref} className="py-32 relative">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center transition-all duration-700" style={{ opacity: solutionSection.visible ? 1 : 0, transform: solutionSection.visible ? 'translateY(0)' : 'translateY(2rem)' }}>
                        <div className="text-sm font-semibold text-green-400 tracking-widest uppercase mb-4">The Solution</div>
                        <h2 className="text-4xl md:text-5xl font-bold mb-6">
                            One Platform.{' '}
                            <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">AI Vision.</span>{' '}
                            Total Control.
                        </h2>
                        <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-16">
                            Parking Vision Pro replaces manual monitoring with intelligent, automated detection and management.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: '🤖',
                                title: 'AI Detection Engine',
                                desc: 'Our deep learning models detect vehicles with 99.9% accuracy in any weather, lighting, or angle.',
                                features: ['Real-time detection', 'Night vision capable', 'Multi-camera support'],
                            },
                            {
                                icon: '📋',
                                title: 'ANPR + Smart Logging',
                                desc: 'Every plate is read, logged, and matched automatically. No manual entry, no errors, no delays.',
                                features: ['Instant plate read', 'Entry/exit matching', 'Blacklist alerts'],
                            },
                            {
                                icon: '💳',
                                title: 'Seamless Payments',
                                desc: 'Integrated online payment system. Customers pay via app, web, or kiosk. You get paid instantly.',
                                features: ['Multiple gateways', 'Auto-billing', 'Revenue dashboard'],
                            },
                        ].map((s, i) => (
                            <div
                                key={s.title}
                                className="group relative p-8 bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-3xl hover:border-green-500/30 transition-all duration-500 hover:-translate-y-2"
                                style={{
                                    transitionDelay: `${i * 200 + 300}ms`,
                                    opacity: solutionSection.visible ? 1 : 0,
                                    transform: solutionSection.visible ? 'translateY(0)' : 'translateY(2rem)',
                                }}
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-2xl group-hover:bg-green-500/10 transition-colors" />
                                <div className="relative">
                                    <div className="text-4xl mb-6">{s.icon}</div>
                                    <h3 className="text-xl font-bold text-white mb-3">{s.title}</h3>
                                    <p className="text-gray-400 leading-relaxed mb-6">{s.desc}</p>
                                    <ul className="space-y-2">
                                        {s.features.map((f) => (
                                            <li key={f} className="flex items-center gap-2 text-sm text-gray-500">
                                                <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                {f}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ════════════ 3 PILLARS ════════════ */}
            <section id="pillars" ref={pillarsSection.ref} className="py-32 relative">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-950/10 to-transparent" />
                <div className="max-w-7xl mx-auto px-6 relative">
                    <div className="text-center transition-all duration-700" style={{ opacity: pillarsSection.visible ? 1 : 0, transform: pillarsSection.visible ? 'translateY(0)' : 'translateY(2rem)' }}>
                        <div className="text-sm font-semibold text-cyan-400 tracking-widest uppercase mb-4">System Architecture</div>
                        <h2 className="text-4xl md:text-5xl font-bold mb-6">
                            Three Pillars of{' '}
                            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                                Parking Vision Pro
                            </span>
                        </h2>
                        <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-20">
                            Our platform is built on three interconnected systems that work in harmony.
                        </p>
                    </div>

                    <div className="grid lg:grid-cols-3 gap-8 relative">
                        <div className="hidden lg:block absolute top-1/2 left-1/3 w-1/3 h-0.5 bg-gradient-to-r from-emerald-500/50 to-cyan-500/50" />
                        <div className="hidden lg:block absolute top-1/2 right-1/3 w-1/3 h-0.5 bg-gradient-to-r from-cyan-500/50 to-violet-500/50" />

                        {[
                            {
                                number: '01',
                                title: 'Vision Engine',
                                subtitle: 'Detection & Recognition',
                                desc: 'The AI core that processes video feeds in real-time. Detects vehicles, reads plates (ANPR), and classifies vehicle types with deep learning models.',
                                gradient: 'from-emerald-600 to-emerald-400',
                                border: 'hover:border-emerald-500/30',
                                items: ['Car detection (YOLO)', 'ANPR plate reading', 'Vehicle classification', 'Multi-camera fusion'],
                            },
                            {
                                number: '02',
                                title: 'Command Center',
                                subtitle: 'Dashboard & Analytics',
                                desc: 'Your centralized control panel. Monitor all cameras, view live detections, analyze trends, and manage your entire parking operation from one screen.',
                                gradient: 'from-cyan-600 to-cyan-400',
                                border: 'hover:border-cyan-500/30',
                                items: ['Real-time dashboard', 'Occupancy analytics', 'Alert management', 'Multi-location view'],
                            },
                            {
                                number: '03',
                                title: 'Revenue Engine',
                                subtitle: 'Payments & Monetization',
                                desc: 'Turn detections into revenue. Automated billing, online payment collection, pricing optimization, and comprehensive financial reporting.',
                                gradient: 'from-violet-600 to-violet-400',
                                border: 'hover:border-violet-500/30',
                                items: ['Online payments', 'Auto-billing', 'Dynamic pricing', 'Financial reports'],
                            },
                        ].map((p, i) => (
                            <div
                                key={p.number}
                                className="relative group"
                                style={{
                                    transitionDelay: `${i * 200 + 400}ms`,
                                    transition: 'all 0.8s ease',
                                    opacity: pillarsSection.visible ? 1 : 0,
                                    transform: pillarsSection.visible ? 'translateY(0)' : 'translateY(3rem)',
                                }}
                            >
                                <div className={`h-full p-8 bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-3xl transition-all duration-500 hover:-translate-y-3 ${p.border}`}>
                                    <div className={`inline-block text-sm font-bold px-3 py-1 rounded-full bg-gradient-to-r ${p.gradient} mb-6 text-white`}>
                                        {p.number}
                                    </div>
                                    <div className="text-xs text-gray-500 uppercase tracking-widest mb-2">{p.subtitle}</div>
                                    <h3 className="text-2xl font-bold text-white mb-4">{p.title}</h3>
                                    <p className="text-gray-400 leading-relaxed mb-6">{p.desc}</p>
                                    <div className="space-y-3">
                                        {p.items.map((item) => (
                                            <div key={item} className="flex items-center gap-3 text-sm">
                                                <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${p.gradient}`} />
                                                <span className="text-gray-500">{item}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ════════════ PRICING ════════════ */}
            <section id="pricing" ref={pricingSection.ref} className="py-32 relative">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center transition-all duration-700" style={{ opacity: pricingSection.visible ? 1 : 0, transform: pricingSection.visible ? 'translateY(0)' : 'translateY(2rem)' }}>
                        <div className="text-sm font-semibold text-violet-400 tracking-widest uppercase mb-4">Pricing</div>
                        <h2 className="text-4xl md:text-5xl font-bold mb-6">
                            Choose Your{' '}
                            <span className="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">Detection Plan</span>
                        </h2>
                        <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-16">
                            Start with Basic detection for free. Upgrade to Premium for advanced annotation and unlimited locations.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                        {/* ───── BASIC ───── */}
                        <div
                            className="relative p-8 bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-3xl transition-all duration-700 hover:-translate-y-2"
                            style={{
                                transitionDelay: '300ms',
                                opacity: pricingSection.visible ? 1 : 0,
                                transform: pricingSection.visible ? 'translateY(0)' : 'translateY(3rem)',
                            }}
                        >
                            <div className="text-sm text-gray-500 uppercase tracking-widest mb-2">Basic</div>
                            <div className="flex items-baseline gap-2 mb-2">
                                <span className="text-5xl font-bold text-white">$0</span>
                                <span className="text-gray-500">/month</span>
                            </div>
                            <p className="text-gray-400 mb-8">Car detection without annotation. Perfect for getting started.</p>

                            <Link href="/register" className="block w-full py-4 text-center border border-white/20 rounded-2xl text-white font-semibold hover:bg-white/5 transition-all duration-300 mb-8">
                                Start Free
                            </Link>

                            <div className="space-y-4">
                                <div className="text-xs text-gray-500 uppercase tracking-widest mb-4">What's included:</div>
                                {[
                                    { text: 'AI car detection (without annotation)', included: true },
                                    { text: 'Up to 3 parking locations', included: true },
                                    { text: 'ANPR plate recognition', included: true },
                                    { text: 'Online payment integration', included: true },
                                    { text: 'Basic dashboard', included: true },
                                    { text: 'Email support', included: true },
                                    { text: 'Monthly reports', included: true },
                                    { text: 'Mobile responsive', included: true },
                                ].map((f) => (
                                    <div key={f.text} className="flex items-center gap-3 text-sm">
                                        <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span className="text-gray-400">{f.text}</span>
                                    </div>
                                ))}

                                <div className="pt-2 border-t border-white/5 mt-4" />
                                {[
                                    'Smart annotation & bounding boxes',
                                    'Unlimited parking locations',
                                    'Advanced analytics & AI insights',
                                    'Priority 24/7 support',
                                    'Custom branding',
                                ].map((f) => (
                                    <div key={f} className="flex items-center gap-3 text-sm">
                                        <svg className="w-5 h-5 text-gray-700 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        <span className="text-gray-600">{f}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Visual: Basic detection */}
                            <div className="mt-8 p-4 bg-gray-800/30 rounded-xl border border-white/5">
                                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-3">Basic Detection Preview</div>
                                <div className="relative bg-gray-900 rounded-lg p-3 h-32 flex items-center justify-center">
                                    <div className="flex gap-4">
                                        <div className="w-14 h-10 bg-gray-700 rounded flex items-center justify-center">
                                            <span className="text-emerald-400 text-[10px] font-bold">🚗</span>
                                        </div>
                                        <div className="w-14 h-10 bg-gray-700 rounded flex items-center justify-center">
                                            <span className="text-emerald-400 text-[10px] font-bold">🚗</span>
                                        </div>
                                        <div className="w-14 h-10 bg-gray-700 rounded flex items-center justify-center">
                                            <span className="text-gray-600 text-[10px]">empty</span>
                                        </div>
                                    </div>
                                    <div className="absolute bottom-2 left-3 text-[9px] text-emerald-400 font-mono">2 cars detected</div>
                                    <div className="absolute bottom-2 right-3 text-[9px] text-gray-600 font-mono">no annotation</div>
                                </div>
                            </div>
                        </div>

                        {/* ───── PREMIUM ───── */}
                        <div
                            className="relative p-8 bg-gradient-to-br from-violet-600/10 to-cyan-600/10 border border-violet-500/30 rounded-3xl transition-all duration-700 hover:-translate-y-2"
                            style={{
                                transitionDelay: '500ms',
                                opacity: pricingSection.visible ? 1 : 0,
                                transform: pricingSection.visible ? 'translateY(0)' : 'translateY(3rem)',
                            }}
                        >
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-6 py-1.5 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-full text-sm font-semibold shadow-lg shadow-violet-500/25">
                                ⚡ Recommended
                            </div>

                            <div className="text-sm text-violet-400 uppercase tracking-widest mb-2">Premium</div>
                            <div className="flex items-baseline gap-2 mb-2">
                                <span className="text-5xl font-bold text-white">$49</span>
                                <span className="text-gray-500">/month</span>
                            </div>
                            <p className="text-gray-400 mb-8">Full detection with annotation. Unlimited locations. Maximum power.</p>

                            <Link href="/register" className="block w-full py-4 text-center bg-gradient-to-r from-violet-600 to-cyan-600 rounded-2xl text-white font-semibold hover:from-violet-500 hover:to-cyan-500 transition-all duration-300 shadow-lg shadow-violet-500/25 mb-8">
                                Start 14-Day Free Trial
                            </Link>

                            <div className="space-y-4">
                                <div className="text-xs text-gray-500 uppercase tracking-widest mb-4">Everything in Basic, plus:</div>
                                {[
                                    'AI detection WITH smart annotation',
                                    'Bounding boxes & vehicle labels',
                                    'Unlimited parking locations',
                                    'ANPR plate recognition (advanced)',
                                    'Online payment integration',
                                    'Advanced analytics & AI insights',
                                    'Real-time occupancy heatmaps',
                                    'Vehicle classification (type, color)',
                                    'Priority 24/7 support',
                                    'Custom branding & white-label',
                                    'API access & integrations',
                                    'Automated detailed reporting',
                                ].map((f) => (
                                    <div key={f} className="flex items-center gap-3 text-sm">
                                        <svg className="w-5 h-5 text-violet-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span className="text-gray-300">{f}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Visual: Premium detection with annotation */}
                            <div className="mt-8 p-4 bg-gray-800/30 rounded-xl border border-violet-500/20">
                                <div className="text-[10px] text-violet-400 uppercase tracking-wider mb-3">Premium Detection Preview</div>
                                <div className="relative bg-gray-900 rounded-lg p-3 h-32 flex items-center justify-center">
                                    <div className="flex gap-4">
                                        <div className="relative w-14 h-10 border-2 border-emerald-400 rounded">
                                            <span className="absolute -top-3 left-0 bg-emerald-500 text-[7px] px-1 rounded text-white font-bold">Sedan</span>
                                            <span className="absolute -bottom-3 left-0 bg-cyan-500 text-[7px] px-1 rounded text-white font-mono">AB-123</span>
                                            <span className="text-[10px] absolute inset-0 flex items-center justify-center">🚗</span>
                                        </div>
                                        <div className="relative w-14 h-10 border-2 border-cyan-400 rounded">
                                            <span className="absolute -top-3 left-0 bg-cyan-500 text-[7px] px-1 rounded text-white font-bold">SUV</span>
                                            <span className="absolute -bottom-3 left-0 bg-cyan-500 text-[7px] px-1 rounded text-white font-mono">CD-456</span>
                                            <span className="text-[10px] absolute inset-0 flex items-center justify-center">🚙</span>
                                        </div>
                                        <div className="w-14 h-10 border-2 border-dashed border-green-500/30 rounded flex items-center justify-center">
                                            <span className="text-green-400 text-[9px]">FREE</span>
                                        </div>
                                    </div>
                                    <div className="absolute bottom-2 left-3 text-[9px] text-violet-400 font-mono">2 annotated • 1 free</div>
                                    <div className="absolute bottom-2 right-3 text-[9px] text-emerald-400 font-mono">✓ annotated</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Comparison table */}
                    <div
                        className="mt-16 max-w-4xl mx-auto transition-all duration-700"
                        style={{ opacity: pricingSection.visible ? 1 : 0 }}
                    >
                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
                            <div className="grid grid-cols-3 text-sm">
                                <div className="p-4 font-semibold text-gray-400 border-b border-white/5">Feature</div>
                                <div className="p-4 font-semibold text-center text-gray-400 border-b border-white/5">Basic</div>
                                <div className="p-4 font-semibold text-center text-violet-400 border-b border-white/5">Premium</div>

                                {[
                                    { feature: 'Car Detection', basic: '✅', premium: '✅' },
                                    { feature: 'Annotation / Bounding Boxes', basic: '❌', premium: '✅' },
                                    { feature: 'ANPR Recognition', basic: '✅', premium: '✅ Advanced' },
                                    { feature: 'Online Payment', basic: '✅', premium: '✅' },
                                    { feature: 'Parking Locations', basic: 'Max 3', premium: 'Unlimited' },
                                    { feature: 'Vehicle Classification', basic: '❌', premium: '✅' },
                                    { feature: 'Occupancy Heatmaps', basic: '❌', premium: '✅' },
                                    { feature: 'API Access', basic: '❌', premium: '✅' },
                                    { feature: 'Support', basic: 'Email', premium: '24/7 Priority' },
                                    { feature: 'Custom Branding', basic: '❌', premium: '✅' },
                                ].map((row, i) => (
                                    <div key={row.feature} className="contents">
                                        <div className={`p-4 text-gray-400 ${i % 2 === 0 ? 'bg-white/[0.01]' : ''}`}>{row.feature}</div>
                                        <div className={`p-4 text-center text-gray-500 ${i % 2 === 0 ? 'bg-white/[0.01]' : ''}`}>{row.basic}</div>
                                        <div className={`p-4 text-center text-gray-300 ${i % 2 === 0 ? 'bg-white/[0.01]' : ''}`}>{row.premium}</div>
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
                        <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                            Parking Owners
                        </span>
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
                                q: 'What is the difference between Basic and Premium detection?',
                                a: 'Basic plan provides real-time car detection (counting vehicles and occupancy tracking) without visual annotation. Premium adds smart bounding box annotation with labels, vehicle classification, color detection, and detailed per-vehicle analytics.',
                            },
                            {
                                q: 'How many parking locations can I manage?',
                                a: 'The Basic plan supports up to 3 parking locations. The Premium plan offers unlimited locations, making it ideal for owners managing multiple facilities.',
                            },
                            {
                                q: 'Is ANPR included in both plans?',
                                a: 'Yes! Both Basic and Premium plans include ANPR (Automatic Number Plate Recognition). Premium provides advanced ANPR features like vehicle history, blacklist matching, and detailed plate analytics.',
                            },
                            {
                                q: 'How does the online payment system work?',
                                a: 'Both plans include integrated online payment. Customers can pay via credit card, mobile payment, or digital wallets. You receive funds directly to your account with real-time transaction tracking.',
                            },
                            {
                                q: 'Can I upgrade from Basic to Premium later?',
                                a: 'Absolutely! You can upgrade at any time from your dashboard. Your existing data, cameras, and settings are preserved. The Premium features activate immediately.',
                            },
                            {
                                q: 'What cameras are supported?',
                                a: 'Parking Vision Pro works with any IP camera, RTSP stream, or USB camera. We provide setup guides for popular brands including Hikvision, Dahua, Axis, and more.',
                            },
                        ].map((faq, i) => (
                            <FaqItem key={i} question={faq.q} answer={faq.a} visible={faqSection.visible} delay={i * 100 + 300} />
                        ))}
                    </div>
                </div>
            </section>

            {/* ════════════ CTA ════════════ */}
            <section ref={ctaSection.ref} className="py-32 relative">
                <div className="max-w-4xl mx-auto px-6">
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
                                Ready to See Every Vehicle in Real-Time?
                            </h2>
                            <p className="text-emerald-100 text-lg mb-4 max-w-2xl mx-auto">
                                Join {ownerCount} parking owner{ownerCount !== 1 ? 's' : ''} already using Parking Vision Pro.
                                Start detecting today — no credit card required.
                            </p>
                            <p className="text-emerald-200/60 text-sm mb-10">
                                Free plan includes car detection + ANPR + online payments for up to 3 locations.
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <Link href="/register" className="px-10 py-4 bg-white text-gray-900 font-bold rounded-2xl hover:bg-gray-100 transition-all duration-300 shadow-xl hover:scale-105">
                                    Start Free Trial →
                                </Link>
                                <Link href="/login" className="px-10 py-4 border-2 border-white/30 rounded-2xl font-semibold hover:bg-white/10 transition-all duration-300">
                                    Sign In
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
                                AI-powered car detection and smart parking management for modern parking owners.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-white mb-4">Product</h4>
                            <ul className="space-y-2 text-sm text-gray-500">
                                <li><a href="#services" className="hover:text-white transition-colors">Services</a></li>
                                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                                <li><a href="#pillars" className="hover:text-white transition-colors">Features</a></li>
                                <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
                               <li><a href="#about" className="hover:text-white transition-colors">About</a></li>

                            </ul>
                        </div>
                       
                        
                    </div>
                    <div className="pt-2 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-gray-600 text-sm">
                        <p className="text-gray-600 text-sm center">© 2025 Parking Vision Pro. All rights reserved.</p>
                        
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