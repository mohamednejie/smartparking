'use client';

import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import dropin from 'braintree-web-drop-in';
import { toast } from 'sonner';
import { Loader2, Lock, CreditCard, X, Timer, Receipt, AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

type ReservationDetails = {
    id: number;
    total_price: number;
    duration_minutes: number | null;
    vehicle: {
        license_plate: string;
    };
    parking: {
        name: string;
    };
};

type PaymentModalProps = {
    isOpen: boolean;
    onClose: () => void;
    reservation: ReservationDetails;
    onSuccess: () => void;
};

export default function PaymentModal({ isOpen, onClose, reservation, onSuccess }: PaymentModalProps) {
    const dropinContainer = useRef<HTMLDivElement>(null);
    const instanceRef = useRef<any>(null);
    const isInitializingRef = useRef(false);

    const [loadingToken, setLoadingToken] = useState(true);
    const [processingPayment, setProcessingPayment] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [initError, setInitError] = useState<string | null>(null);

    // ✅ Reset state on open/close to ensure clean start every time
    useEffect(() => {
        if (!isOpen) {
            setIsInitialized(false);
            setInitError(null);
            setLoadingToken(true);
            setProcessingPayment(false);
            // Don't remove data here so we can keep the nonce if reopened quickly, 
            // but teardown ensures no ghost elements remain
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        let isMounted = true;

        const initializeBraintree = async () => {
            // Prevent race conditions / duplicate initiations
            if (isInitializingRef.current || instanceRef.current) {
                return;
            }
            
            isInitializingRef.current = true;
            setLoadingToken(true);
            setInitError(null);

            try {
                // 🔐 Fetch Token with timeout
                const response = await axios.get('/braintree/token', {
                    timeout: 10000,
                });
                
                if (!isMounted || !dropinContainer.current) return;

                // Safe teardown if switching between states
                if (instanceRef.current) {
                    try {
                        await instanceRef.current.teardown();
                    } catch (e) {
                        console.warn('Teardown warning:', e);
                    }
                    instanceRef.current = null;
                }

                const gateway = await dropin.create({
                    authorization: response.data.token,
                    container: dropinContainer.current,
                    paypal: false,
                    card: {
                        overrides: {
                            styles: {
                                input: {
                                    fontSize: '15px',
                                    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
                                    color: '#0f172a',
                                },
                            },
                            fields: {
                                number: { placeholder: '4111 1111 1111 1111' },
                                cvv: { placeholder: '123' },
                                expirationDate: { placeholder: 'MM/YY' },
                            },
                        },
                    },
                });

                if (isMounted) {
                    instanceRef.current = gateway;
                    setIsInitialized(true);
                }
            } catch (error: any) {
                console.error('Braintree init error:', error);
                const message = error.response?.data?.message || 'Failed to load payment gateway';
                
                if (isMounted) {
                    setInitError(message);
                    setLoadingToken(false);
                    // Only show toast once, not every render
                }
            } finally {
                isInitializingRef.current = false;
                if (isMounted && !initError) setLoadingToken(false);
            }
        };

        initializeBraintree();

        return () => {
            isMounted = false;
            if (instanceRef.current) {
                instanceRef.current.teardown().catch(() => {});
            }
        };
    }, [isOpen]);

    const handlePayment = async () => {
        if (!instanceRef.current || processingPayment || !isInitialized) return;

        setProcessingPayment(true);
        const toastId = toast.loading('Processing payment securely...');

        try {
            const { nonce } = await instanceRef.current.requestPaymentMethod();

            const response = await axios.post(
                '/braintree/checkout/reservation', 
                {
                    nonce,
                    reservation_id: reservation.id,
                },
                { timeout: 30000 }
            );

            if (response.data.success) {
                toast.success('✅ Payment successful! Barrier opened.', { id: toastId });
                onSuccess();
                
                // Delay close slightly to allow user to read success toast
                setTimeout(() => {
                    onClose();
                }, 600);
            } else {
                throw new Error(response.data.message || 'Payment rejected by server');
            }
        } catch (error: any) {
            console.error('Payment failed:', error);
            
            // Specific error handling for common cases
            if (error.message === 'No payment method is available.') {
                toast.error('Please fill in all card details correctly', { id: toastId });
            } else {
                const msg = error.response?.data?.message || error.message || 'Payment failed. Please try again.';
                toast.error(msg, { id: toastId });
            }
        } finally {
            setProcessingPayment(false);
        }
    };

    const handleRetry = () => {
        setInitError(null);
        window.location.reload(); // Or trigger initialization manually if you refactor hooks
    };

    const handleClose = () => {
        if (!processingPayment) {
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent 
                className="sm:max-w-[500px] p-0 max-h-[90vh] flex flex-col overflow-hidden"
                onPointerDownOutside={(e) => processingPayment && e.preventDefault()}
            >
                {/* --- Header (Fixed) --- */}
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white relative flex-shrink-0">
                    <button
                        onClick={handleClose}
                        disabled={processingPayment}
                        className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-full p-1 hover:bg-white/10"
                        aria-label="Close payment modal"
                    >
                        <X className="h-5 w-5" />
                    </button>
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <CreditCard className="h-5 w-5" />
                            Payment Required
                        </DialogTitle>
                        <DialogDescription className="text-slate-300 mt-2 text-sm font-medium">
                            {reservation.parking.name} • Plate: {reservation.vehicle.license_plate}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900">
                    
                    {/* Amount Info Block */}
                    <div className="px-6 py-4 bg-blue-50 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/50">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <p className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400 font-semibold">Total Due</p>
                            </div>
                            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                                {reservation.total_price.toFixed(2)}{' '}
                                <span className="text-lg font-medium text-slate-500">TND</span>
                            </p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                <Timer className="h-3.5 w-3.5 text-slate-400" />
                                <span>{reservation.duration_minutes || 0} min reserved</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 justify-end">
                                <Receipt className="h-3.5 w-3.5 text-slate-400" />
                                <span>Parking fee</span>
                            </div>
                        </div>
                    </div>

                    {/* Payment Form Container */}
                    <div className="p-6">
                        {loadingToken && !initError && (
                            <div className="flex flex-col items-center justify-center py-12 space-y-4 min-h-[200px]">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                                <p className="text-sm text-slate-500 animate-pulse">Loading secure payment...</p>
                            </div>
                        )}

                        {initError && (
                            <div className="flex flex-col items-center justify-center py-12 space-y-4 min-h-[200px]">
                                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                    <AlertCircle className="h-6 w-6 text-red-500" />
                                </div>
                                <div className="text-center space-y-2">
                                    <p className="font-semibold text-slate-800 dark:text-slate-200">Unable to load payment</p>
                                    <p className="text-sm text-slate-500 max-w-xs mx-auto">{initError}</p>
                                </div>
                                <Button variant="outline" onClick={handleRetry} className="mt-2">
                                    <RotateCcw className="h-4 w-4 mr-2" />
                                    Try Again
                                </Button>
                            </div>
                        )}

                        <div ref={dropinContainer} className={loadingToken || initError ? 'hidden' : ''} />
                    </div>
                </div>

                {/* Footer (Fixed) */}
                <Separator />
                <div className="p-6 bg-slate-50 dark:bg-slate-950 space-y-4 flex-shrink-0">
                    <Button
                        className="w-full h-12 text-base font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={handlePayment}
                        disabled={!isInitialized || processingPayment || !!initError}
                    >
                        {processingPayment ? (
                            <div className="flex items-center gap-2">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                <span>Processing...</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Lock className="h-4 w-4" />
                                <span>Pay {reservation.total_price.toFixed(2)} TND</span>
                            </div>
                        )}
                    </Button>

                    <p className="text-xs text-center text-slate-400 flex items-center justify-center gap-1">
                        <Lock className="h-3 w-3" />
                        Secure encryption provided by Braintree. No card data stored.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}