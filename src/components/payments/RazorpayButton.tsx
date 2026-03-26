import React, { useState } from 'react';
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
    const isAvailable = isRazorpayRuntimeAvailable();
    const invokePaymentAuthority = async (body: Record<string, unknown>) => {
        try {
            const { supabase } = await import('../../services/supabase');
            const { data, error } = await (supabase as any).functions.invoke('payment-authority', { body });
            if (error) throw error;
            return data;
        } catch (error: any) {
            throw new Error(error?.message || 'Secure payment authority is unavailable.')
        }
    };

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

            const orderPayload = await invokePaymentAuthority({
                action: 'prepare_payment_order',
                amount,
                currency: 'INR',
                paymentType,
                paymentId: paymentId && !paymentId.startsWith('rent_due_') ? paymentId : null,
                tenantId,
                houseId
            }) as {
                paymentId: string;
                ownerId?: string | null;
                buildingId?: string | null;
                linkedAccountId?: string | null;
                order: { id: string; amount: number; currency: string };
            };

            trackedPaymentId = orderPayload.paymentId;
            const pendingPaymentId = orderPayload.paymentId;
            const ownerId = orderPayload.ownerId || null;
            const buildingId = orderPayload.buildingId || null;
            const linkedAccountId = orderPayload.linkedAccountId || null;
            const orderData = orderPayload.order;

            const options = {
                key: (import.meta as any).env.VITE_RAZORPAY_KEY_ID || '',
                amount: orderData.amount,
                currency: orderData.currency,
                name: 'Nilayam Property Management',
                description: `${paymentType.toUpperCase()} Payment`,
                order_id: orderData.id,
                handler: async (response: any) => {
                    try {
                        const verificationPayload = {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            payment_id: pendingPaymentId,
                            owner_id: ownerId,
                            building_id: buildingId,
                            linked_account_id: linkedAccountId
                        };
                        const verifyResult = await invokePaymentAuthority({ action: 'verify_payment', ...verificationPayload }) as { success: boolean };

                        if (verifyResult.success) {
                            if (onSuccess) await onSuccess();
                            alert('Payment submitted successfully. Final settlement confirmation will update automatically.');
                        } else {
                            throw new Error('Payment signature verification failed.');
                        }
                    } catch (err: any) {
                        console.error('Verification error:', err);
                        await invokePaymentAuthority({
                            action: 'mark_payment_failed',
                            paymentId: pendingPaymentId,
                            owner_id: ownerId,
                            tenant_id: tenantId,
                            reason: err?.message || 'Verification failed after checkout'
                        });

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
                await invokePaymentAuthority({
                    action: 'mark_payment_failed',
                    paymentId: pendingPaymentId,
                    owner_id: ownerId,
                    tenant_id: tenantId,
                    reason: response.error.description || 'Payment failed during checkout',
                    gateway_payload: response.error || {}
                }).catch(() => undefined);

                setLoading(false);
                alert(response.error.description || 'Payment failed. Please try again.');
            });

            rzp.open();

        } catch (error) {
            console.error('Error initiating payment:', error);
            if (trackedPaymentId) {
                await invokePaymentAuthority({
                    action: 'mark_payment_failed',
                    paymentId: trackedPaymentId,
                    tenant_id: tenantId,
                    reason: error instanceof Error ? error.message : 'Failed to initialize payment gateway'
                }).catch(() => undefined);
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
