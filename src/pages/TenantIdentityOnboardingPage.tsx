import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { completeTenantOnboarding } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { HomeIcon, SearchIcon, UsersIcon } from '@/constants';

const TenantIdentityOnboardingPage: React.FC = () => {
    const { profile, user, updateProfileState } = useAuth();
    const navigate = useNavigate();
    const { error: toastError, success: toastSuccess } = useToast();
    const [phoneNumber, setPhoneNumber] = useState(profile?.phone_number || '');
    const [aadhaarNumber, setAadhaarNumber] = useState(profile?.aadhaar_number || '');
    const [loading, setLoading] = useState(false);
    const [matched, setMatched] = useState<boolean | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const result = await completeTenantOnboarding({
                phoneNumber,
                aadhaarNumber
            });

            updateProfileState({
                id: profile?.id || user?.id || '',
                role: profile?.role || null,
                full_name: profile?.full_name || user?.email?.split('@')[0] || 'Tenant',
                avatar_url: profile?.avatar_url,
                phone_number: phoneNumber.replace(/\D/g, '').slice(-10),
                aadhaar_number: aadhaarNumber.replace(/\D/g, '').slice(0, 12),
                bio: profile?.bio,
                subscription_tier: profile?.subscription_tier,
                payment_methods: profile?.payment_methods,
                is_verified: profile?.is_verified,
                id_proof_url: profile?.id_proof_url,
            });

            const didMatch = Boolean(result.matchedHouseId);
            setMatched(didMatch);
            toastSuccess(didMatch ? 'Residence linked successfully.' : 'Profile saved. You can still explore Nilayam now.');
            navigate('/tenant-dashboard', { replace: true });
        } catch (err: any) {
            toastError(err?.message || 'Unable to complete tenant setup.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-neutral-50 px-4 py-8 dark:bg-neutral-950">
            <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
                <section className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 md:p-10">
                    <div className="mb-8">
                        <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-600 dark:text-emerald-400">Tenant Setup</p>
                        <h1 className="mt-3 text-3xl font-black tracking-tight text-neutral-900 dark:text-white md:text-4xl">
                            Let&apos;s connect your home details
                        </h1>
                        <p className="mt-3 max-w-2xl text-sm text-neutral-500 dark:text-neutral-400 md:text-base">
                            We use your Aadhaar number and mobile number to identify whether an owner has already attached you to a Nilayam property. If matched, your tenant dashboard will open with rent, maintenance, alerts, and agreement details.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300" htmlFor="tenant-email">Email Address</label>
                            <input
                                id="tenant-email"
                                type="email"
                                value={user?.email || ''}
                                disabled
                                placeholder="Your sign-in email is already linked"
                                className="mt-2 w-full rounded-2xl border border-neutral-200 bg-neutral-100 px-4 py-3 text-sm text-neutral-500 outline-none dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-400"
                            />
                            <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">Your sign-in email is already available in the app account.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300" htmlFor="tenant-phone">Mobile Number</label>
                            <input
                                id="tenant-phone"
                                type="tel"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                placeholder="10-digit mobile number"
                                className="mt-2 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300" htmlFor="tenant-aadhaar">Aadhaar Number</label>
                            <input
                                id="tenant-aadhaar"
                                type="text"
                                value={aadhaarNumber}
                                onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
                                placeholder="12-digit Aadhaar number"
                                className="mt-2 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || phoneNumber.length !== 10 || aadhaarNumber.length !== 12}
                            className="w-full rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loading ? 'Checking your residence...' : 'Continue to Tenant Dashboard'}
                        </button>
                    </form>
                </section>

                <aside className="space-y-6">
                    <div className="overflow-hidden rounded-[2rem] border border-neutral-200 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 p-8 text-white shadow-xl dark:border-neutral-800">
                        <div className="max-w-sm">
                            <p className="text-xs font-black uppercase tracking-[0.24em] text-white/80">What happens next</p>
                            <h2 className="mt-3 text-2xl font-black tracking-tight">We match your details instantly</h2>
                            <p className="mt-3 text-sm text-white/85">
                                Aadhaar is checked first, then mobile number. If an owner has already assigned you to a unit, your rent, maintenance, and agreement workspace appears automatically.
                            </p>
                        </div>
                        <div className="mt-8 rounded-[1.75rem] bg-white/10 p-5 backdrop-blur">
                            <div className="grid grid-cols-3 gap-3 text-center">
                                <div className="rounded-2xl bg-white/10 p-4">
                                    <UsersIcon className="mx-auto h-6 w-6" />
                                    <p className="mt-2 text-[11px] font-black uppercase tracking-widest">Identity</p>
                                </div>
                                <div className="rounded-2xl bg-white/10 p-4">
                                    <HomeIcon className="mx-auto h-6 w-6" />
                                    <p className="mt-2 text-[11px] font-black uppercase tracking-widest">Residence</p>
                                </div>
                                <div className="rounded-2xl bg-white/10 p-4">
                                    <SearchIcon className="mx-auto h-6 w-6" />
                                    <p className="mt-2 text-[11px] font-black uppercase tracking-widest">Alerts</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                        <h3 className="text-xl font-black tracking-tight text-neutral-900 dark:text-white">If you are not attached to a property yet</h3>
                        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                            Nilayam is still useful immediately. You can search homes, browse land and sale listings, or use your profession to get clients through local services.
                        </p>
                        <div className="mt-5 grid gap-3">
                            <Link to="/marketplace" className="rounded-2xl border border-neutral-200 px-4 py-3 text-sm font-bold text-neutral-900 transition hover:border-emerald-500 hover:bg-emerald-50 dark:border-neutral-700 dark:text-white dark:hover:bg-emerald-900/20">
                                Explore marketplace for homes, land, and properties
                            </Link>
                            <Link to="/services" className="rounded-2xl border border-neutral-200 px-4 py-3 text-sm font-bold text-neutral-900 transition hover:border-blue-500 hover:bg-blue-50 dark:border-neutral-700 dark:text-white dark:hover:bg-blue-900/20">
                                List yourself as a professional and get clients
                            </Link>
                        </div>
                        {matched === false && (
                            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-200">
                                No matching residence was found yet. You can still use marketplace and services while your owner adds or links your tenancy.
                            </div>
                        )}
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default TenantIdentityOnboardingPage;
