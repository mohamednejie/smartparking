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
    // 🔥 On récupère isPremiumActive envoyé par le contrôleur
    const { isPremiumActive } = usePage().props as any;
    
    // On utilise cette valeur pour l'affichage
    const isPremium = isPremiumActive;

    const dropinContainer = useRef<HTMLDivElement>(null);
    const paymentSectionRef = useRef<HTMLDivElement>(null);
    const instanceRef = useRef<any>(null);
    
    const [loadingToken, setLoadingToken] = useState(true);
    const [processingPayment, setProcessingPayment] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    
    const [selectedPlan, setSelectedPlan] = useState<'minute' | 'monthly' | 'yearly' | null>(null);

    const prices = {
        minute: { amount: '1.00', label: '/min', name: 'Test Plan (1 Min)' },
        monthly: { amount: '19.99', label: '/month', name: 'Monthly Plan' },
        yearly: { amount: '199.99', label: '/year', name: 'Yearly Plan' }
    };

    useEffect(() => {
        if (isPremium || !selectedPlan) return;

        let isMounted = true;

        const initializeBraintree = async () => {
            setLoadingToken(true);
            try {
                const { data } = await axios.get('/braintree/token');
                
                if (!isMounted || !dropinContainer.current) return;

                if (instanceRef.current) {
                    try {
                        await instanceRef.current.teardown();
                    } catch (e) {
                        console.warn("Braintree teardown error", e);
                    }
                }

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

        return () => {
            isMounted = false;
        };
    }, [isPremium, selectedPlan]);

    const handlePayment = async () => {
        if (!instanceRef.current || !selectedPlan) return;

        setProcessingPayment(true);
        const toastId = toast.loading('Processing secure payment...');

        try {
            const { nonce } = await instanceRef.current.requestPaymentMethod();

            const response = await axios.post('/braintree/checkout', {
                nonce,
                plan: selectedPlan
            });

            if (response.data.success) {
                toast.success('Upgrade successful! Welcome to Premium.', { id: toastId });
                // Rechargement complet pour mettre à jour les props Inertia
                window.location.href = '/parkings'; 
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

                    {isPremium ? (
                        <Card className="max-w-md mx-auto border-2 border-emerald-500/20 bg-white dark:bg-slate-900 text-center p-8 shadow-xl">
                            <div className="flex justify-center mb-6">
                                <div className="h-20 w-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                                    <PartyPopper className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
                                </div>
                            </div>
                            <h2 className="text-2xl font-bold mb-2">You are Premium!</h2>
                            <p className="text-slate-600 dark:text-slate-400 mb-8">
                                Thank you for your subscription. You have access to all features.
                            </p>
                            <Button asChild className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700">
                                <Link href="/dashboard">Go to Dashboard</Link>
                            </Button>
                        </Card>
                    ) : (
                        <>
                            <div className="grid md:grid-cols-3 gap-6 mb-16 max-w-5xl mx-auto">
                                
                                {/* TEST PLAN */}
                                <Card 
                                    className={`relative overflow-hidden transition-all duration-300 cursor-pointer hover:shadow-xl hover:-translate-y-1 ${selectedPlan === 'minute' ? 'ring-2 ring-amber-500 shadow-lg scale-[1.02]' : 'border-slate-200 hover:border-amber-300'}`}
                                    onClick={() => setSelectedPlan('minute')}
                                >
                                    <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">DEMO</div>
                                    <div className="p-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div><h3 className="text-lg font-semibold">1 Minute</h3><p className="text-xs text-slate-500">Quick test</p></div>
                                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${selectedPlan === 'minute' ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-600'}`}><FlaskConical className="h-5 w-5" /></div>
                                        </div>
                                        <div className="flex items-baseline gap-1 mb-6"><span className="text-3xl font-bold">$1.00</span><span className="text-slate-500 font-medium text-sm">/min</span></div>
                                        <Button className={`w-full h-9 text-sm pointer-events-none ${selectedPlan === 'minute' ? 'bg-amber-600' : 'bg-slate-100 text-slate-900'}`}>{selectedPlan === 'minute' ? 'Selected' : 'Select Test'}</Button>
                                    </div>
                                </Card>

                                {/* MONTHLY PLAN */}
                                <Card 
                                    className={`relative overflow-hidden transition-all duration-300 cursor-pointer hover:shadow-xl hover:-translate-y-1 ${selectedPlan === 'monthly' ? 'ring-2 ring-blue-600 shadow-lg scale-[1.02]' : 'border-slate-200 hover:border-blue-300'}`}
                                    onClick={() => setSelectedPlan('monthly')}
                                >
                                    <div className="p-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div><h3 className="text-lg font-semibold">Monthly</h3><p className="text-xs text-slate-500">Flexible</p></div>
                                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${selectedPlan === 'monthly' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'}`}><Calendar className="h-5 w-5" /></div>
                                        </div>
                                        <div className="flex items-baseline gap-1 mb-6"><span className="text-3xl font-bold">$19.99</span><span className="text-slate-500 font-medium text-sm">/mo</span></div>
                                        <Button className={`w-full h-9 text-sm pointer-events-none ${selectedPlan === 'monthly' ? 'bg-blue-600' : 'bg-slate-100 text-slate-900'}`}>{selectedPlan === 'monthly' ? 'Selected' : 'Select Monthly'}</Button>
                                    </div>
                                </Card>

                                {/* YEARLY PLAN */}
                                <Card 
                                    className={`relative overflow-hidden transition-all duration-300 cursor-pointer hover:shadow-xl hover:-translate-y-1 ${selectedPlan === 'yearly' ? 'ring-2 ring-indigo-600 shadow-lg scale-[1.02]' : 'border-slate-200 hover:border-indigo-300'}`}
                                    onClick={() => setSelectedPlan('yearly')}
                                >
                                    <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">-17%</div>
                                    <div className="p-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div><h3 className="text-lg font-semibold">Yearly</h3><p className="text-xs text-slate-500">Best value</p></div>
                                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${selectedPlan === 'yearly' ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-600'}`}><CalendarDays className="h-5 w-5" /></div>
                                        </div>
                                        <div className="flex items-baseline gap-1 mb-6"><span className="text-3xl font-bold">$199.99</span><span className="text-slate-500 font-medium text-sm">/yr</span></div>
                                        <Button className={`w-full h-9 text-sm pointer-events-none ${selectedPlan === 'yearly' ? 'bg-indigo-600' : 'bg-slate-100 text-slate-900'}`}>{selectedPlan === 'yearly' ? 'Selected' : 'Select Yearly'}</Button>
                                    </div>
                                </Card>
                            </div>

                            {selectedPlan && (
                                <div key={selectedPlan} ref={paymentSectionRef} className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 pb-16">
                                    <Card className="border-0 shadow-2xl overflow-hidden ring-1 ring-slate-900/5">
                                        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white flex items-center justify-between">
                                            <div>
                                                <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Checkout</p>
                                                <h3 className="text-xl font-bold flex items-center gap-2">
                                                    {prices[selectedPlan].name}
                                                    <Badge className="bg-white/10 text-white border-0 hover:bg-white/20 ml-2 text-base px-2">${prices[selectedPlan].amount}</Badge>
                                                </h3>
                                            </div>
                                            <Lock className="h-6 w-6 text-slate-400" />
                                        </div>
                                        <CardContent className="p-6 bg-white dark:bg-slate-900 min-h-[250px]">
                                            {loadingToken && <div className="flex flex-col items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>}
                                            <div ref={dropinContainer} className={loadingToken ? 'hidden' : ''}></div>
                                        </CardContent>
                                        <Separator />
                                        <CardFooter className="p-6 bg-slate-50 dark:bg-slate-950 flex flex-col gap-4">
                                            <Button className="w-full h-14 text-base font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg" onClick={handlePayment} disabled={!isInitialized || processingPayment}>
                                                {processingPayment ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Pay ${prices[selectedPlan].amount} & Upgrade <ArrowRight className="ml-2 h-4 w-4" /></>}
                                            </Button>
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