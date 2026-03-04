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
    PartyPopper
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
    // Récupération de l'utilisateur pour vérifier le statut
    const { auth } = usePage().props as any;
    const isPremium = auth.user.mode_compte === 'PREMIUM';

    const dropinContainer = useRef<HTMLDivElement>(null);
    const instanceRef = useRef<any>(null);
    
    const [loadingToken, setLoadingToken] = useState(true);
    const [processingPayment, setProcessingPayment] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        // Si déjà premium, on ne charge pas Braintree
        if (isPremium) return;

        let isMounted = true;

        const initializeBraintree = async () => {
            try {
                const { data } = await axios.get('/braintree/token');
                
                if (!isMounted || !dropinContainer.current) return;

                instanceRef.current = await dropin.create({
                    authorization: data.token,
                    container: dropinContainer.current,
                    paypal: false,
                    paypalCredit: false,
                    venmo: false,
                    applePay: false,
                    googlePay: false,
                    card: {
                        // Suppression de la demande du nom du titulaire
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
            } catch (error) {
                toast.error("Failed to load payment system. Please refresh.");
            } finally {
                if (isMounted) setLoadingToken(false);
            }
        };

        initializeBraintree();

        return () => {
            isMounted = false;
            if (instanceRef.current) {
                instanceRef.current.teardown().catch(() => {});
                instanceRef.current = null;
            }
        };
    }, [isPremium]);

    const handlePayment = async () => {
        if (!instanceRef.current) return;

        setProcessingPayment(true);
        const toastId = toast.loading('Processing secure payment...');

        try {
            const { nonce } = await instanceRef.current.requestPaymentMethod();

            const response = await axios.post('/braintree/checkout', {
                nonce,
                amount: '19.99',
                plan: 'premium_monthly'
            });

            if (response.data.success) {
                toast.success('Upgrade successful! Welcome to Premium.', { id: toastId });
                window.location.href = '/dashboard'; 
            } else {
                throw new Error(response.data.message || 'Payment rejected');
            }

        } catch (error: any) {
            if (error.message !== 'No payment method is available.') {
                toast.error(error.response?.data?.message || 'Payment failed. Please check your card details.', { id: toastId });
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

            <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    
                    {/* Header Section */}
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm font-medium mb-6 animate-fade-in-up ${isPremium ? 'bg-emerald-100/50 text-emerald-700 border-emerald-200/60' : 'bg-amber-100/50 text-amber-700 border-amber-200/60'}`}>
                            <Crown className={`w-4 h-4 ${isPremium ? 'fill-emerald-500 text-emerald-600' : 'fill-amber-500 text-amber-600'}`} />
                            <span>{isPremium ? 'Active Premium Member' : 'Premium Owner Plan'}</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-6">
                            Scale your parking business <br className="hidden sm:block" />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600">without limits.</span>
                        </h1>
                        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
                            Upgrade now to unlock advanced AI features, unlimited parking slots, and start accepting online payments instantly.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
                        
                        {/* Left Column: Value Proposition */}
                        <div className="lg:col-span-7 space-y-8">
                            <div className="grid sm:grid-cols-2 gap-6">
                                {FEATURES.map((feature, idx) => (
                                    <div key={idx} className="group p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300">
                                        <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-4 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 transition-colors">
                                            <feature.icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                                            {feature.title}
                                        </h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                                            {feature.desc}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            <div className="p-6 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white shadow-xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl"></div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 bg-green-500/20 rounded-lg">
                                            <ShieldCheck className="h-6 w-6 text-green-400" />
                                        </div>
                                        <h3 className="font-semibold text-lg">Bank-Grade Security</h3>
                                    </div>
                                    <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                                        We use Braintree (a PayPal service) to process payments securely. 
                                        Your financial data never touches our servers and is encrypted using 
                                        industry-standard 256-bit SSL technology.
                                    </p>
                                    <div className="flex items-center gap-4 opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
                                        {/* Logos simulés */}
                                        <div className="h-6 w-10 bg-white/20 rounded" title="Visa"></div>
                                        <div className="h-6 w-10 bg-white/20 rounded" title="Mastercard"></div>
                                        <div className="h-6 w-10 bg-white/20 rounded" title="Amex"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Payment Form OR Success State */}
                        <div className="lg:col-span-5 sticky top-8">
                            {isPremium ? (
                                // 🟢 VIEW IF ALREADY PREMIUM
                                <Card className="border-2 border-emerald-500/20 shadow-2xl shadow-emerald-900/5 overflow-hidden ring-1 ring-emerald-900/5">
                                    <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-8 text-white relative overflow-hidden text-center">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                                        <div className="relative z-10 flex flex-col items-center">
                                            <div className="h-16 w-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-4">
                                                <PartyPopper className="h-8 w-8 text-white" />
                                            </div>
                                            <h2 className="text-2xl font-bold">You are Premium!</h2>
                                            <p className="text-emerald-100 mt-2">Your subscription is active.</p>
                                        </div>
                                    </div>
                                    <CardContent className="p-8 bg-white dark:bg-slate-900 text-center">
                                        <p className="text-slate-600 dark:text-slate-400 mb-6">
                                            Thank you for being a premium member. You have access to all advanced features including AI detection and unlimited parking management.
                                        </p>
                                        <Button asChild className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700">
                                            <Link href="/dashboard">
                                                Go to Dashboard
                                            </Link>
                                        </Button>
                                    </CardContent>
                                    <CardFooter className="bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 p-4 justify-center">
                                        <p className="text-xs text-slate-400 flex items-center gap-1.5">
                                            <ShieldCheck className="h-3 w-3" />
                                            Secure & Active Subscription
                                        </p>
                                    </CardFooter>
                                </Card>
                            ) : (
                                // 🔵 VIEW IF BASIC (PAYMENT FORM)
                                <Card className="border-0 shadow-2xl shadow-blue-900/10 overflow-hidden ring-1 ring-slate-900/5">
                                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                                        
                                        <div className="relative z-10">
                                            <p className="text-blue-100 text-sm font-medium uppercase tracking-wider mb-1">Monthly Plan</p>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-5xl font-bold">$19.99</span>
                                                <span className="text-blue-100 font-medium">/month</span>
                                            </div>
                                            <div className="mt-4 flex items-center gap-2 text-sm text-blue-50">
                                                <CheckCircle2 className="w-4 h-4" />
                                                <span>Cancel anytime. No hidden fees.</span>
                                            </div>
                                        </div>
                                    </div>

                                    <CardContent className="p-6 bg-white dark:bg-slate-900">
                                        {loadingToken && (
                                            <div className="flex flex-col items-center justify-center py-16 space-y-4">
                                                <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                                                <p className="text-sm text-slate-500 font-medium">Securing connection...</p>
                                            </div>
                                        )}

                                        <div 
                                            ref={dropinContainer} 
                                            className={loadingToken ? 'hidden' : 'min-h-[280px]'}
                                        ></div>
                                    </CardContent>

                                    <Separator className="bg-slate-100 dark:bg-slate-800" />

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
                                                    <span>Pay & Upgrade Now</span>
                                                </div>
                                            )}
                                        </Button>
                                        
                                        <p className="text-xs text-center text-slate-400">
                                            By confirming, you agree to our Terms of Service. 
                                            Transaction is secure and encrypted.
                                        </p>
                                    </CardFooter>
                                </Card>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}