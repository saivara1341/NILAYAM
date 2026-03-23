
import React, { useState, useEffect, useRef } from 'react';
import Card from '../components/ui/Card';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { updateUserProfile, updatePaymentMethods, uploadIdProof } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { LANGUAGES } from '../constants/translations';
import ThemeToggle from '../components/ui/ThemeToggle';
import { LogOut } from 'lucide-react';
import { UserRole, PaymentMethods, BankDetails } from '../types';
import { ZapIcon, QrCodeIcon, BankIcon, CloudUploadIcon, PencilIcon } from '../constants';
import { RazorpayButton } from '../components/payments/RazorpayButton';
import { ProfileLoadingIllustration } from '../components/ui/StateIllustrations';
import { canUseRazorpayForOwner } from '../services/api';

const ProfilePage: React.FC = () => {
    const { profile, user, loading: authLoading, updateProfileState, signOut } = useAuth();
    const { language, setLanguage } = useLanguage();

    const [fullName, setFullName] = useState(profile?.full_name || '');
    const [phoneNumber, setPhoneNumber] = useState(profile?.phone_number || '');
    const [aadhaarNumber, setAadhaarNumber] = useState(profile?.aadhaar_number || '');
    const [bio, setBio] = useState(profile?.bio || '');
    const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Payment Settings State
    const [upiId, setUpiId] = useState(profile?.payment_methods?.upiId || '');
    const [enableRazorpay, setEnableRazorpay] = useState(Boolean(profile?.payment_methods?.enableRazorpay));
    const [mobileNumber, setMobileNumber] = useState(profile?.payment_methods?.mobileNumber || '');
    const [qrCodeUrl, setQrCodeUrl] = useState(profile?.payment_methods?.qrCodeUrl || '');
    const [paymentInstructions, setPaymentInstructions] = useState(profile?.payment_methods?.paymentInstructions || '');
    const [bankDetails, setBankDetails] = useState<BankDetails>(profile?.payment_methods?.bankDetails || {
        accountHolder: '', accountNumber: '', ifsc: '', bankName: ''
    });
    const [savingPayment, setSavingPayment] = useState(false);

    const avatarFileInputRef = useRef<HTMLInputElement>(null);
    const qrFileInputRef = useRef<HTMLInputElement>(null);
    const idProofInputRef = useRef<HTMLInputElement>(null);
    const [uploadingId, setUploadingId] = useState(false);

    useEffect(() => {
        setFullName(profile?.full_name || '');
        setPhoneNumber(profile?.phone_number || '');
        setAadhaarNumber(profile?.aadhaar_number || '');
        setBio(profile?.bio || '');
        setAvatarUrl(profile?.avatar_url || '');
        setEnableRazorpay(Boolean(profile?.payment_methods?.enableRazorpay));
        setUpiId(profile?.payment_methods?.upiId || '');
        setMobileNumber(profile?.payment_methods?.mobileNumber || '');
        setQrCodeUrl(profile?.payment_methods?.qrCodeUrl || '');
        setPaymentInstructions(profile?.payment_methods?.paymentInstructions || '');
        setBankDetails(profile?.payment_methods?.bankDetails || {
            accountHolder: '', accountNumber: '', ifsc: '', bankName: ''
        });
    }, [profile]);

    if (authLoading || !profile) {
        return (
            <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
                <div className="w-full max-w-lg rounded-[2rem] border border-slate-200 bg-white/90 p-8 text-center shadow-[0_24px_80px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900/90">
                    <ProfileLoadingIllustration />
                    <p className="mt-6 text-xs font-black uppercase tracking-[0.24em] text-blue-600 dark:text-blue-400">
                        Profile Sync
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                        Getting your workspace ready
                    </h2>
                    <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                        We&apos;re pulling your profile, payment setup, and verification details so everything appears in one place.
                    </p>
                </div>
            </div>
        );
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (url: string) => void) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setter(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleIdProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingId(true);
        setError(null);
        try {
            const url = await uploadIdProof(file);
            updateProfileState({ ...profile!, id_proof_url: url });
            setSuccess('ID Proof uploaded successfully! Verification is pending.');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setUploadingId(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
            const updatedProfile = await updateUserProfile({
                full_name: fullName.trim(),
                phone_number: phoneNumber.replace(/\D/g, '').slice(-10),
                aadhaar_number: aadhaarNumber.replace(/\D/g, '').slice(0, 12),
                bio: bio.trim(),
                avatar_url: avatarUrl
            });
            updateProfileState(updatedProfile);
            setSuccess('Profile updated successfully!');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePaymentUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingPayment(true);
        setError(null);
        setSuccess(null);
        try {
            const methods: PaymentMethods = {
                enableRazorpay,
                upiId: upiId.trim(),
                mobileNumber: mobileNumber.trim(),
                qrCodeUrl: qrCodeUrl.trim(),
                paymentInstructions: paymentInstructions.trim(),
                bankDetails: bankDetails
            };
            const updatedProfile = await updatePaymentMethods(methods);
            updateProfileState(updatedProfile);
            setSuccess('Payment settings saved!');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSavingPayment(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in max-w-3xl mx-auto pb-10">
            <h2 className="text-3xl font-bold text-blue-900 dark:text-slate-200">My Profile</h2>
            <Card>
                <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-6">
                    <div className="relative group cursor-pointer" onClick={() => avatarFileInputRef.current?.click()}>
                        <img
                            src={avatarUrl || `https://api.dicebear.com/8.x/initials/svg?seed=${profile.full_name || user?.email}`}
                            alt="User Avatar"
                            className="h-24 w-24 rounded-full object-cover bg-slate-200 border-4 border-white dark:border-slate-800 shadow-md transition-opacity group-hover:opacity-75"
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 rounded-full">
                            <PencilIcon className="w-6 h-6 text-white" />
                        </div>
                        <input
                            type="file"
                            ref={avatarFileInputRef}
                            onChange={(e) => handleFileUpload(e, setAvatarUrl)}
                            accept="image/*"
                            className="hidden"
                        />
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-2xl font-bold text-blue-900 dark:text-slate-200 flex items-center gap-2">
                                    {profile.full_name}
                                </h3>
                                <p className="text-slate-500 dark:text-slate-400">{user?.email}</p>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    <span className="text-sm font-semibold capitalize px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-full">
                                        {profile.role}
                                    </span>
                                    {profile.is_verified ? (
                                        <span className="text-sm font-semibold px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 rounded-full flex items-center gap-1">
                                            ✓ Verified
                                        </span>
                                    ) : (
                                        <span className="text-sm font-semibold px-3 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 rounded-full">
                                            Verification Pending
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <hr className="my-6 border-slate-200 dark:border-slate-700" />

                <form onSubmit={handleSubmit} className="space-y-5">
                    <h3 className="text-lg font-semibold text-blue-900 dark:text-slate-300">Personal Details</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label htmlFor="fullName" className="block text-sm font-medium text-slate-600 dark:text-slate-400">Full Name</label>
                            <input
                                type="text"
                                id="fullName"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-white dark:bg-slate-700 text-blue-950 dark:text-slate-200"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-600 dark:text-slate-400">Email Address</label>
                            <input
                                type="email"
                                id="email"
                                value={user?.email || ''}
                                disabled
                                className="mt-1 block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md shadow-sm bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                            />
                        </div>
                        <div>
                            <label htmlFor="phoneNumber" className="block text-sm font-medium text-slate-600 dark:text-slate-400">Mobile Number</label>
                            <input
                                type="tel"
                                id="phoneNumber"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                placeholder="9876543210"
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-white dark:bg-slate-700 text-blue-950 dark:text-slate-200"
                            />
                        </div>
                        <div>
                            <label htmlFor="aadhaarNumber" className="block text-sm font-medium text-slate-600 dark:text-slate-400">Aadhaar Number</label>
                            <input
                                type="text"
                                id="aadhaarNumber"
                                value={aadhaarNumber}
                                onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
                                placeholder="12-digit Aadhaar number"
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-white dark:bg-slate-700 text-blue-950 dark:text-slate-200"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="bio" className="block text-sm font-medium text-slate-600 dark:text-slate-400">
                            {profile.role === 'owner' ? 'Requirements / Bio' : 'About Me / Preferences'}
                        </label>
                        <textarea
                            id="bio"
                            rows={4}
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            placeholder={profile.role === 'owner' ? "Mention what you require from tenants..." : "Describe yourself..."}
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-white dark:bg-slate-700 text-blue-950 dark:text-slate-200"
                        />
                    </div>

                    {!profile.is_verified && (
                        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 p-4 rounded-xl space-y-3">
                            <div className="flex items-start gap-4">
                                <div className="p-2 bg-white dark:bg-amber-800/20 rounded-lg">
                                    <CloudUploadIcon className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-amber-900 dark:text-amber-200">Identity Verification Required</h4>
                                    <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">Please upload a photo of your Aadhaar Card, Driving License, or any Government ID to get verified.</p>
                                    
                                    <div className="mt-4 flex flex-wrap gap-3">
                                        <button
                                            type="button"
                                            disabled={uploadingId}
                                            onClick={() => idProofInputRef.current?.click()}
                                            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-bold shadow-sm transition-all disabled:opacity-50"
                                        >
                                            {uploadingId ? 'Uploading...' : profile.id_proof_url ? 'Update ID Proof' : 'Upload ID Proof'}
                                        </button>
                                        
                                        {profile.id_proof_url && (
                                            <a 
                                                href={profile.id_proof_url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="px-4 py-2 bg-white dark:bg-neutral-800 border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-300 rounded-lg text-sm font-bold shadow-sm hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all"
                                            >
                                                View Uploaded ID
                                            </a>
                                        )}
                                        
                                        <input 
                                            type="file" 
                                            ref={idProofInputRef} 
                                            onChange={handleIdProofUpload} 
                                            className="hidden" 
                                            accept="image/*,.pdf" 
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="text-right pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-primary hover:bg-primary-dark text-white px-6 py-2.5 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                        >
                            {loading ? 'Saving...' : 'Save Personal Details'}
                        </button>
                    </div>
                </form>

                <hr className="my-8 border-slate-200 dark:border-slate-700" />
                
                <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-blue-900 dark:text-slate-300">App Settings</h3>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-4 flex-1">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Language</label>
                                <select 
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value as any)}
                                    className="block w-full max-w-xs px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-white dark:bg-slate-700 text-blue-950 dark:text-slate-200"
                                >
                                    {LANGUAGES.map((lang) => (
                                        <option key={lang.code} value={lang.code}>{lang.nativeName} ({lang.code.toUpperCase()})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="block text-sm font-medium text-slate-600 dark:text-slate-400">Theme</span>
                                <ThemeToggle />
                            </div>
                        </div>
                        <div className="md:border-l md:border-slate-200 dark:md:border-slate-700 md:pl-6">
                            <button onClick={signOut} className="flex items-center gap-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-6 py-3 rounded-lg font-bold hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors w-full md:w-auto shadow-sm">
                                <LogOut className="w-5 h-5" /> Sign Out
                            </button>
                        </div>
                    </div>
                </div>

                {profile.role === 'owner' && (
                    <>
                        <hr className="my-8 border-slate-200 dark:border-slate-700" />
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-blue-900 dark:text-slate-300 mb-1 flex items-center gap-2">
                                    <ZapIcon className="w-5 h-5 text-indigo-500" /> Subscription Plan
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Manage your SaaS limits and upgrade for unlimited buildings.</p>
                            </div>
                            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-5 rounded-xl border border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
                                <div>
                                    <p className="font-bold text-indigo-900 dark:text-indigo-300 text-lg uppercase tracking-wide">
                                        Current Plan: {profile.subscription_tier || 'BASIC'}
                                    </p>
                                    <p className="text-sm text-indigo-700 dark:text-indigo-400 mt-1">
                                        {profile.subscription_tier === 'pro'
                                            ? 'You have unlimited building access.'
                                            : 'Limited to 2 buildings. Upgrade to add more.'}
                                    </p>
                                </div>
                                {profile.subscription_tier !== 'pro' && (
                                    <RazorpayButton
                                        amount={999}
                                        paymentType="subscription"
                                        tenantId={profile.id}
                                        buttonText="Upgrade to Pro"
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 font-bold shadow-lg"
                                        onSuccess={() => window.location.reload()}
                                    />
                                )}
                            </div>
                        </div>

                        <hr className="my-8 border-slate-200 dark:border-slate-700" />
                        <form onSubmit={handlePaymentUpdate} className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-blue-900 dark:text-slate-300 mb-1">Payment Settings</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Configure how tenants can pay you. You can enable Razorpay when a backend is connected, or use manual UPI, QR, bank transfer, and mobile verification.</p>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-6">
                                <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/40 bg-indigo-50 dark:bg-indigo-900/10 p-4">
                                    <label className="flex items-start gap-3">
                                        <input
                                            type="checkbox"
                                            checked={enableRazorpay}
                                            onChange={(e) => setEnableRazorpay(e.target.checked)}
                                            className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <div>
                                            <p className="text-sm font-bold text-indigo-900 dark:text-indigo-200">Enable Razorpay checkout</p>
                                            <p className="mt-1 text-sm text-indigo-700 dark:text-indigo-300">
                                                Turn this on only when your frontend key and backend payment API are deployed. {canUseRazorpayForOwner(profile?.payment_methods) ? 'Razorpay is currently available in this runtime.' : 'Right now the app will fall back to manual payment collection.'}
                                            </p>
                                        </div>
                                    </label>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label htmlFor="upiId" className="block text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                                            <QrCodeIcon className="w-4 h-4" /> UPI ID (VPA)
                                        </label>
                                        <input
                                            type="text"
                                            id="upiId"
                                            value={upiId}
                                            onChange={(e) => setUpiId(e.target.value)}
                                            placeholder="username@upi"
                                            className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-white dark:bg-slate-700 text-blue-950 dark:text-slate-200"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="ownerMobilePayment" className="block text-sm font-medium text-slate-600 dark:text-slate-400">
                                            Mobile Number for Payment Confirmation
                                        </label>
                                        <input
                                            type="tel"
                                            id="ownerMobilePayment"
                                            value={mobileNumber}
                                            onChange={(e) => setMobileNumber(e.target.value)}
                                            placeholder="+91 9876543210"
                                            className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-white dark:bg-slate-700 text-blue-950 dark:text-slate-200"
                                        />
                                    </div>
                                    <div className="flex flex-col">
                                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                                            <CloudUploadIcon className="w-4 h-4" /> UPI QR Code
                                        </label>
                                        <div className="flex items-center gap-4 mt-1">
                                            {qrCodeUrl && (
                                                <img src={qrCodeUrl} alt="QR Code Preview" className="w-16 h-16 rounded-lg object-cover border p-1 bg-white" />
                                            )}
                                            <button type="button" onClick={() => qrFileInputRef.current?.click()} className="flex-1 text-center px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                                                {qrCodeUrl ? 'Change QR Image' : 'Upload QR Image'}
                                            </button>
                                            <input type="file" ref={qrFileInputRef} onChange={(e) => handleFileUpload(e, setQrCodeUrl)} className="hidden" accept="image/*" />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                        <BankIcon className="w-4 h-4" /> Bank Account Details
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <input type="text" placeholder="Account Holder Name" value={bankDetails.accountHolder} onChange={(e) => setBankDetails({ ...bankDetails, accountHolder: e.target.value })} className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-blue-950 dark:text-slate-200 text-sm" />
                                        <input type="text" placeholder="Bank Name" value={bankDetails.bankName} onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })} className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-blue-950 dark:text-slate-200 text-sm" />
                                        <input type="text" placeholder="Account Number" value={bankDetails.accountNumber} onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })} className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-blue-950 dark:text-slate-200 text-sm" />
                                        <input type="text" placeholder="IFSC Code" value={bankDetails.ifsc} onChange={(e) => setBankDetails({ ...bankDetails, ifsc: e.target.value })} className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-blue-950 dark:text-slate-200 text-sm" />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="paymentInstructions" className="block text-sm font-medium text-slate-600 dark:text-slate-400">Instructions for Tenants</label>
                                    <textarea
                                        id="paymentInstructions"
                                        rows={3}
                                        value={paymentInstructions}
                                        onChange={(e) => setPaymentInstructions(e.target.value)}
                                        placeholder="Example: Pay to the UPI above, then upload the screenshot. I will verify the amount in my account and approve it."
                                        className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-white dark:bg-slate-700 text-blue-950 dark:text-slate-200"
                                    />
                                </div>
                            </div>

                            <div className="text-right">
                                <button type="submit" disabled={savingPayment} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md">
                                    {savingPayment ? 'Saving...' : 'Save Payment Settings'}
                                </button>
                            </div>
                        </form>
                    </>
                )}

                {error && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-md mt-4">{error}</p>}
                {success && <p className="text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-3 rounded-md mt-4">{success}</p>}
            </Card>
        </div>
    );
};

export default ProfilePage;
