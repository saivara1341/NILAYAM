import React, { useState } from 'react';
import { supabase } from '../../services/supabase';
import { CreditCard, Loader2 } from 'lucide-react';
import { isRazorpayRuntimeAvailable } from '../../services/api';
import { useAuth } from '@/contexts/AuthContext';

interface RazorpayButtonProps {
    amount: number;
    paymentType: 'rent' | 'maintenance' | 'security_deposit' | 'subscription';
    houseId?: string;
    tenantId: string;
    paymentId?: string;
    onSuccess?: () => void | Promise<void>;
    buttonText?: string;
    className?: string;
    disabledReason?: string;
}

const loadRazorpayCheckout = async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false;
    if ((window as any).Razorpay) return true;

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-razorpay-checkout="true"]');
    if (existingScript) {
        await new Promise((resolve) => {
            if ((window as any).Razorpay) {
                resolve(true);
                return;
            }
            existingScript.addEventListener('load', () => resolve(true), { once: true });
            existingScript.addEventListener('error', () => resolve(false), { once: true });
        });
        return Boolean((window as any).Razorpay);
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.dataset.razorpayCheckout = 'true';

    const loaded = await new Promise<boolean>((resolve) => {
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });

    return loaded && Boolean((window as any).Razorpay);
};

export function RazorpayButton({
    amount,
    paymentType,
    houseId,
    tenantId,
    paymentId,
    onSuccess,
    buttonText = 'Pay Now',
    className = '',
    disabledReason
}: RazorpayButtonProps) {
    const [loading, setLoading] = useState(false);
    const { profile, user } = useAuth();
    const apiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL?.replace(/\/$/, '') || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? window.location.origin : '');
    const buildApiUrl = (path: string) => `${apiBaseUrl.endsWith('/api') ? apiBaseUrl : `${apiBaseUrl}/api`}${path}`;
    const isAvailable = isRazorpayRuntimeAvailable();

    const handlePayment = async () => {
        if (!isAvailable) {
            alert(disabledReason || 'Razorpay is not configured for this deployment yet.');
            return;
        }

        if (!tenantId || !Number.isFinite(amount) || amount <= 0) {
            alert('This payment is not ready yet. Please refresh and try again.');
            return;
        }

        setLoading(true);
        let trackedPaymentId: string | null = null;
        try {
            const razorpayLoaded = await loadRazorpayCheckout();
            if (!razorpayLoaded) {
                throw new Error('Razorpay checkout failed to load in this runtime.');
            }

            let pendingPaymentId = paymentId && !paymentId.startsWith('rent_due_') ? paymentId : null;

            if (pendingPaymentId) {
                const { error: updatePendingError } = await supabase
                    .from('payments')
                    .update({
                        tenant_id: tenantId,
                        house_id: houseId,
                        amount,
                        payment_type: paymentType,
                        status: 'pending',
                        paid_date: null
                    })
                    .eq('id', pendingPaymentId);

                if (updatePendingError) throw updatePendingError;
            } else {
                const { data: pendingPayment, error: dbError } = await supabase
                    .from('payments')
                    .insert({
                        tenant_id: tenantId,
                        house_id: houseId,
                        amount,
                        payment_type: paymentType,
                        status: 'pending',
                        due_date: new Date().toISOString()
                    })
                    .select('id')
                    .single();

                if (dbError) throw dbError;
                pendingPaymentId = pendingPayment.id;
            }

            trackedPaymentId = pendingPaymentId;

            const orderResponse = await fetch(buildApiUrl('/create-order'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount,
                    currency: 'INR',
                    receipt: `rcpt_${pendingPaymentId}`,
                    notes: {
                        tenantId,
                        houseId: houseId || '',
                        paymentType,
                        paymentId: pendingPaymentId
                    }
                })
            });

            if (!orderResponse.ok) {
                const errorPayload = await orderResponse.json().catch(() => null);
                throw new Error(errorPayload?.error || 'Failed to create Razorpay order securely');
            }

            const orderData = await orderResponse.json();

            await supabase
                .from('payments')
                .update({ razorpay_order_id: orderData.id })
                .eq('id', pendingPaymentId);

            const options = {
                key: (import.meta as any).env.VITE_RAZORPAY_KEY_ID || '',
                amount: orderData.amount,
                currency: orderData.currency,
                name: 'Nilayam Property Management',
                description: `${paymentType.toUpperCase()} Payment`,
                order_id: orderData.id,
                handler: async (response: any) => {
                    try {
                        const verifyResponse = await fetch(buildApiUrl('/verify-payment'), {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature
                            })
                        });

                        const verifyResult = await verifyResponse.json();

                        if (verifyResult.success) {
                            await supabase
                                .from('payments')
                                .update({
                                    status: 'completed',
                                    paid_date: new Date().toISOString(),
                                    razorpay_payment_id: response.razorpay_payment_id,
                                    razorpay_signature: response.razorpay_signature
                                })
                                .eq('id', pendingPaymentId);

                            if (onSuccess) await onSuccess();
                            alert('Payment successful!');
                        } else {
                            throw new Error('Payment signature verification failed.');
                        }
                    } catch (err: any) {
                        console.error('Verification error:', err);

                        await supabase
                            .from('payments')
                            .update({ status: 'failed' })
                            .eq('id', pendingPaymentId);

                        alert('Payment verification failed.');
                    } finally {
                        setLoading(false);
                    }
                },
                prefill: {
                    name: profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Nilayam User',
                    email: user?.email || '',
                    contact: profile?.phone_number || (user?.user_metadata?.phone_number as string | undefined) || ''
                },
                theme: {
                    color: '#1d4ed8'
                }
            };

            const rzp = new (window as any).Razorpay(options);

            rzp.on('payment.failed', async function (response: any) {
                console.error('Payment Modal Failed:', response.error.description);
                await supabase
                    .from('payments')
                    .update({ status: 'failed' })
                    .eq('id', pendingPaymentId);

                setLoading(false);
                alert(response.error.description || 'Payment failed. Please try again.');
            });

            rzp.open();

        } catch (error) {
            console.error('Error initiating payment:', error);
            if (trackedPaymentId) {
                await supabase
                    .from('payments')
                    .update({ status: 'failed' })
                    .eq('id', trackedPaymentId);
            }
            alert(error instanceof Error ? error.message : 'Failed to initialize payment gateway.');
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handlePayment}
            disabled={loading || !isAvailable}
            title={!isAvailable ? (disabledReason || 'Razorpay is not configured for this deployment.') : undefined}
            className={`btn btn-primary inline-flex items-center gap-2 ${className} ${loading ? 'opacity-75 cursor-not-allowed' : ''}`}
        >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
            {loading ? 'Processing...' : !isAvailable ? 'Razorpay Unavailable' : buttonText}
        </button>
    );
}
