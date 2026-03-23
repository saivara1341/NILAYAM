import React, { useState } from 'react';
import { supabase } from '../../services/supabase';
import { CreditCard, Loader2 } from 'lucide-react';

interface RazorpayButtonProps {
    amount: number;
    paymentType: 'rent' | 'maintenance' | 'security_deposit' | 'subscription';
    houseId?: string;
    tenantId: string;
    onSuccess?: () => void;
    buttonText?: string;
    className?: string;
}

export function RazorpayButton({
    amount,
    paymentType,
    houseId,
    tenantId,
    onSuccess,
    buttonText = 'Pay Now',
    className = ''
}: RazorpayButtonProps) {
    const [loading, setLoading] = useState(false);

    const handlePayment = async () => {
        setLoading(true);
        try {
            // 1. Create a placeholder record in Supabase to track this attempt
            const { data: pendingPayment, error: dbError } = await supabase
                .from('payments')
                .insert({
                    tenant_id: tenantId,
                    house_id: houseId,
                    amount: amount,
                    payment_type: paymentType,
                    status: 'pending'
                })
                .select()
                .single();

            if (dbError) throw dbError;

            // 2. Create the Razorpay Order via our secure Express backend (Unified URL)
            const orderResponse = await fetch('/api/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount, // Backend multiplies by 100 for paise
                    currency: 'INR',
                    receipt: `rcpt_${pendingPayment.id}`,
                })
            });

            if (!orderResponse.ok) {
                throw new Error('Failed to create Razorpay Order securely');
            }

            const orderData = await orderResponse.json();

            // Update the pending payment with the Razorpay Order ID
            await supabase
                .from('payments')
                .update({ razorpay_order_id: orderData.id })
                .eq('id', pendingPayment.id);

            // 3. Initialize Razorpay Checkout
            const options = {
                key: (import.meta as any).env.VITE_RAZORPAY_KEY_ID || '',
                amount: orderData.amount,
                currency: orderData.currency,
                name: 'Nilayam Property Management',
                description: `${paymentType.toUpperCase()} Payment`,
                order_id: orderData.id,
                handler: async (response: any) => {
                    try {
                        // 4. Verify the payment signature on our secure backend
                        const verifyResponse = await fetch('/api/verify-payment', {
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
                            // 5. If successful, definitively mark the payment as completed in Supabase
                            await supabase
                                .from('payments')
                                .update({
                                    status: 'completed',
                                    razorpay_payment_id: response.razorpay_payment_id,
                                    razorpay_signature: response.razorpay_signature
                                })
                                .eq('id', pendingPayment.id);

                            if (onSuccess) onSuccess();
                            alert('Payment successful!');
                        } else {
                            throw new Error('Payment signature verification failed.');
                        }
                    } catch (err: any) {
                        console.error('Verification error:', err);

                        await supabase
                            .from('payments')
                            .update({ status: 'failed' })
                            .eq('id', pendingPayment.id);

                        alert('Payment verification failed.');
                    } finally {
                        setLoading(false);
                    }
                },
                prefill: {
                    name: "Tenant Name", // In a real app, populate from user profile
                    email: "tenant@example.com",
                    contact: "9999999999"
                },
                theme: {
                    color: "#1d4ed8" // Matches Nilayam primary color
                }
            };

            const rzp = new (window as any).Razorpay(options);

            rzp.on('payment.failed', async function (response: any) {
                console.error('Payment Modal Failed:', response.error.description);
                await supabase
                    .from('payments')
                    .update({ status: 'failed' })
                    .eq('id', pendingPayment.id);

                setLoading(false);
            });

            rzp.open();

        } catch (error) {
            console.error('Error initiating payment:', error);
            alert('Failed to initialize payment gateway.');
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handlePayment}
            disabled={loading}
            className={`btn btn-primary inline-flex items-center gap-2 ${className} ${loading ? 'opacity-75 cursor-not-allowed' : ''}`}
        >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
            {loading ? 'Processing...' : buttonText}
        </button>
    );
}
