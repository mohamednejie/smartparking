import { useEffect, useRef, useState } from 'react';
import { Head, usePage, Link } from '@inertiajs/react';
import axios from 'axios';
import dropin from 'braintree-web-drop-in';
import { toast } from 'sonner';
import {
    CreditCard,
    ShieldCheck,
    Zap,
    LayoutGrid,
    ScanLine,
    Loader2,
    Crown,
    CheckCircle2,
    Lock,
    PartyPopper,
    Calendar,
    CalendarDays,
    ArrowRight,
    FlaskConical
} from 'lucide-react';

import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const breadcrumbs = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Subscription', href: '/settings/subscription' },
];

const FEATURES = [
    {
        icon: LayoutGrid,
        title: 'Unlimited Parking Management',
        desc: 'Add and manage more than 3 parking lots without restrictions.',
    },
    {
        icon: ScanLine,
        title: 'AI-Powered Smart Detection',
        desc: 'Enable automated spot detection using our advanced AI models.',
    },
    {
        icon: CreditCard,
        title: 'Direct Online Payments',
        desc: 'Accept payments directly from drivers via the mobile app.',
    },
    {
        icon: Zap,
        title: 'Advanced Analytics Dashboard',
        desc: 'Unlock detailed insights on occupancy, revenue, and peak hours.',
    },
];

export default function UpgradeToPremium() {
    // Récupération de la variable isPremiumActive envoyée par le contrôleur
    const { isPremiumActive } = usePage().props as any;
    
    // Si l'utilisateur est Premium ET que son abonnement est valide
    const isPremium = isPremiumActive;

    const dropinContainer = useRef<HTMLDivElement>(null);
    const paymentSectionRef = useRef<HTMLDivElement>(null);
    const instanceRef = useRef<any>(null);
    
    const [loadingToken, setLoadingToken] = useState(true);
    const [processingPayment, setProcessingPayment] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    
    // Plan sélectionné (null au début)
    const [selectedPlan, setSelectedPlan] = useState<'minute' | 'monthly' | 'yearly' | null>(null);

    const prices = {
        minute: { amount: '1.00', label: '/min', name: 'Test Plan (1 Min)' },
        monthly: { amount: '19.99', label: '/month', name: 'Monthly Plan' },
        yearly: { amount: '199.99', label: '/year', name: 'Yearly Plan' }
    };

    // Initialisation Braintree à chaque changement de plan
    useEffect(() => {
        if (isPremium || !selectedPlan) return;

        let isMounted = true;

        const initializeBraintree = async () => {
            setLoadingToken(true);
            try {
                // 1. Récupérer le token client
                const { data } = await axios.get('/braintree/token');
                
                if (!isMounted || !dropinContainer.current) return;

                // 2. Nettoyer l'instance précédente si elle existe
                if (instanceRef.current) {
                    try {
                        await instanceRef.current.teardown();
                    } catch (e) {
                        console.warn("Braintree teardown warning", e);
                    }
                }

                // 3. Créer la nouvelle instance
                instanceRef.current = await dropin.create({
                    authorization: data.token,
                    container: dropinContainer.current,
                    paypal: false,
                    card: {
                        overrides: {
                            styles: {
                                input: {
                                    'font-size': '16px',
                                    'font-family': 'ui-sans-serif, system-ui, sans-serif',
                                    'color': '#1e293b'
                                }
                            }
                        }
                    },
                });

                setIsInitialized(true);
                
                // 4. Scroll automatique vers la section de paiement
                setTimeout(() => {
                    paymentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);

            } catch (error) {
                console.error(error);
                toast.error("Failed to load payment system. Please refresh.");
            } finally {
                if (isMounted) setLoadingToken(false);
            }
        };

        initializeBraintree();

        // Cleanup
        return () => {
            isMounted = false;
        };
    }, [isPremium, selectedPlan]);

    const handlePayment = async () => {
        if (!instanceRef.current || !selectedPlan) return;

        setProcessingPayment(true);
        const toastId = toast.loading('Processing secure payment...');

        try {
            // 1. Obtenir le nonce de paiement
            const { nonce } = await instanceRef.current.requestPaymentMethod();

            // 2. Envoyer au backend pour traitement
            const response = await axios.post('/braintree/checkout', {
                nonce,
                plan: selectedPlan
            });

            if (response.data.success) {
                toast.success('Upgrade successful! Welcome to Premium.', { id: toastId });
                // Rechargement complet pour mettre à jour les props Inertia et le statut user
                window.location.reload(); 
            } else {
                throw new Error(response.data.message || 'Payment rejected');
            }

        } catch (error: any) {
            if (error.message !== 'No payment method is available.') {
                toast.error(error.response?.data?.message || 'Payment failed.', { id: toastId });
            } else {
                toast.dismiss(toastId);
            }
        } finally {
            setProcessingPayment(false);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Upgrade to Premium" />

            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-6xl mx-auto">
                    
                    {/* Header */}
                    <div className="text-center max-w-3xl mx-auto mb-12">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm font-medium mb-6 animate-fade-in-up ${isPremium ? 'bg-emerald-100/50 text-emerald-700 border-emerald-200/60' : 'bg-blue-100/50 text-blue-700 border-blue-200/60'}`}>
                            <Crown className="w-4 h-4 fill-current" />
                            <span>{isPremium ? 'Active Premium Member' : 'Choose Your Plan'}</span>
                        </div>
                        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">
                            Simple Pricing, No Hidden Fees
                        </h1>
                        <p className="text-lg text-slate-600 dark:text-slate-400">
                            Unlock advanced features to grow your parking business.
                        </p>
                    </div>

                    {/* Contenu principal : soit message succès, soit grille de choix */}
                    {isPremium ? (
                        <div className="animate-in fade-in zoom-in duration-500">
                            
                            {/* Carte principale */}
                            <Card className="border-0 shadow-2xl overflow-hidden ring-1 ring-emerald-500/20 relative mb-8">
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent pointer-events-none" />
                                
                                <CardContent className="p-8 sm:p-12 text-center relative z-10">
                                    <div className="inline-flex h-24 w-24 bg-emerald-100 dark:bg-emerald-900/30 rounded-full items-center justify-center mb-6 shadow-inner ring-4 ring-white dark:ring-slate-900">
                                        <PartyPopper className="h-12 w-12 text-emerald-600 dark:text-emerald-400 animate-bounce" />
                                    </div>
                                    
                                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                                        You are Premium!
                                    </h2>
                                    <p className="text-slate-600 dark:text-slate-400 max-w-lg mx-auto mb-8">
                                        Thank you for your trust. Your account is fully unlocked. You can now manage unlimited parkings and access advanced analytics.
                                    </p>

                                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                                        <Button asChild className="h-12 px-8 text-base bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/30">
                                            <Link href="/dashboard">
                                                <LayoutGrid className="mr-2 h-5 w-5" />
                                                Go to Dashboard
                                            </Link>
                                        </Button>
                                        <Button asChild variant="outline" className="h-12 px-8 text-base border-emerald-200 hover:bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950">
                                            <Link href="/parkings/create">
                                                <Zap className="mr-2 h-5 w-5" />
                                                Create New Parking
                                            </Link>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Grille des fonctionnalités débloquées */}
                            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                {FEATURES.map((feature, idx) => (
                                    <Card key={idx} className="border-emerald-100 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/10">
                                        <CardContent className="p-6 flex flex-col items-center text-center">
                                            <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center mb-4 text-emerald-600">
                                                <feature.icon className="h-6 w-6" />
                                            </div>
                                            <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                                                {feature.title}
                                            </h3>
                                            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium uppercase tracking-wide mb-2">
                                                Unlocked
                                            </p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                                {feature.desc}
                                            </p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* PLANS GRID (3 COLONNES) */}
                            <div className="grid md:grid-cols-3 gap-6 mb-16 max-w-5xl mx-auto">
                                
                                {/* 1. TEST PLAN (1 MINUTE) */}
                                <Card 
                                    className={`relative overflow-hidden transition-all duration-300 cursor-pointer hover:shadow-xl hover:-translate-y-1 ${selectedPlan === 'minute' ? 'ring-2 ring-amber-500 shadow-lg scale-[1.02]' : 'border-slate-200 hover:border-amber-300'}`}
                                    onClick={() => setSelectedPlan('minute')}
                                >
                                    <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                                        DEMO
                                    </div>
                                    <div className="p-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">1 Minute</h3>
                                                <p className="text-xs text-slate-500">Quick test</p>
                                            </div>
                                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${selectedPlan === 'minute' ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-600'}`}>
                                                <FlaskConical className="h-5 w-5" />
                                            </div>
                                        </div>
                                        <div className="flex items-baseline gap-1 mb-6">
                                            <span className="text-3xl font-bold">$1.00</span>
                                            <span className="text-slate-500 font-medium text-sm">/min</span>
                                        </div>
                                        <Button 
                                            className={`w-full h-9 text-sm pointer-events-none ${selectedPlan === 'minute' ? 'bg-amber-600' : 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'}`}
                                        >
                                            {selectedPlan === 'minute' ? 'Selected' : 'Select Test'}
                                        </Button>
                                        <div className="mt-6 text-xs text-slate-500 flex items-center gap-2">
                                            <CheckCircle2 className="h-3 w-3 text-amber-500" />
                                            <span>Test instant upgrade</span>
                                        </div>
                                    </div>
                                </Card>

                                {/* 2. MONTHLY PLAN */}
                                <Card 
                                    className={`relative overflow-hidden transition-all duration-300 cursor-pointer hover:shadow-xl hover:-translate-y-1 ${selectedPlan === 'monthly' ? 'ring-2 ring-blue-600 shadow-lg scale-[1.02]' : 'border-slate-200 hover:border-blue-300'}`}
                                    onClick={() => setSelectedPlan('monthly')}
                                >
                                    <div className="p-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Monthly</h3>
                                                <p className="text-xs text-slate-500">Flexible</p>
                                            </div>
                                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${selectedPlan === 'monthly' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'}`}>
                                                <Calendar className="h-5 w-5" />
                                            </div>
                                        </div>
                                        <div className="flex items-baseline gap-1 mb-6">
                                            <span className="text-3xl font-bold">$19.99</span>
                                            <span className="text-slate-500 font-medium text-sm">/mo</span>
                                        </div>
                                        <Button 
                                            className={`w-full h-9 text-sm pointer-events-none ${selectedPlan === 'monthly' ? 'bg-blue-600' : 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'}`}
                                        >
                                            {selectedPlan === 'monthly' ? 'Selected' : 'Select Monthly'}
                                        </Button>
                                        <ul className="mt-6 space-y-2">
                                            {FEATURES.slice(0, 4).map((f, i) => (
                                                <li key={i} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                                    <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                                                    <span>{f.title}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </Card>

                                {/* 3. YEARLY PLAN */}
                                <Card 
                                    className={`relative overflow-hidden transition-all duration-300 cursor-pointer hover:shadow-xl hover:-translate-y-1 ${selectedPlan === 'yearly' ? 'ring-2 ring-indigo-600 shadow-lg scale-[1.02]' : 'border-slate-200 hover:border-indigo-300'}`}
                                    onClick={() => setSelectedPlan('yearly')}
                                >
                                    <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                                        -17%
                                    </div>
                                    <div className="p-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Yearly</h3>
                                                <p className="text-xs text-slate-500">Best value</p>
                                            </div>
                                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${selectedPlan === 'yearly' ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-600'}`}>
                                                <CalendarDays className="h-5 w-5" />
                                            </div>
                                        </div>
                                        <div className="flex items-baseline gap-1 mb-6">
                                            <span className="text-3xl font-bold">$199.99</span>
                                            <span className="text-slate-500 font-medium text-sm">/yr</span>
                                        </div>
                                        <Button 
                                            className={`w-full h-9 text-sm pointer-events-none ${selectedPlan === 'yearly' ? 'bg-indigo-600' : 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'}`}
                                        >
                                            {selectedPlan === 'yearly' ? 'Selected' : 'Select Yearly'}
                                        </Button>
                                        <ul className="mt-6 space-y-2">
                                            {FEATURES.map((f, i) => (
                                                <li key={i} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                                    <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                                                    <span className="truncate">{f.title}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </Card>
                            </div>

                            {/* SECTION DE PAIEMENT (S'affiche si un plan est choisi) */}
                            {selectedPlan && (
                                <div 
                                    key={selectedPlan} 
                                    ref={paymentSectionRef} 
                                    className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 pb-16"
                                >
                                    <Card className="border-0 shadow-2xl overflow-hidden ring-1 ring-slate-900/5">
                                        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white flex items-center justify-between">
                                            <div>
                                                <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Checkout</p>
                                                <h3 className="text-xl font-bold flex items-center gap-2">
                                                    {prices[selectedPlan].name}
                                                    <Badge className="bg-white/10 text-white border-0 hover:bg-white/20 ml-2 text-base px-2">
                                                        ${prices[selectedPlan].amount}
                                                    </Badge>
                                                </h3>
                                            </div>
                                            <Lock className="h-6 w-6 text-slate-400" />
                                        </div>

                                        <CardContent className="p-6 bg-white dark:bg-slate-900 min-h-[250px]">
                                            {loadingToken && (
                                                <div className="flex flex-col items-center justify-center py-12 space-y-4 h-full">
                                                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                                                    <p className="text-sm text-slate-500 font-medium">Connecting to secure gateway...</p>
                                                </div>
                                            )}
                                            <div ref={dropinContainer} className={loadingToken ? 'hidden' : ''}></div>
                                        </CardContent>

                                        <Separator />

                                        <CardFooter className="p-6 bg-slate-50 dark:bg-slate-950 flex flex-col gap-4">
                                            <Button 
                                                className="w-full h-14 text-base font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98]" 
                                                onClick={handlePayment}
                                                disabled={!isInitialized || processingPayment}
                                            >
                                                {processingPayment ? (
                                                    <div className="flex items-center gap-2">
                                                        <Loader2 className="h-5 w-5 animate-spin" />
                                                        <span>Processing Securely...</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <Lock className="h-4 w-4" />
                                                        <span>Pay ${prices[selectedPlan].amount} & Upgrade</span>
                                                    </div>
                                                )}
                                            </Button>
                                            
                                            <p className="text-xs text-center text-slate-400 flex items-center justify-center gap-2">
                                                <ShieldCheck className="h-3 w-3" />
                                                Encrypted by Braintree. We do not store your card details.
                                            </p>
                                        </CardFooter>
                                    </Card>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}