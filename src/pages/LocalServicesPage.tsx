
import React, { useState, useEffect } from 'react';
import { getServiceProviders, registerServiceProvider, addServiceReview } from '../services/api';
import { ServiceProvider, ServiceCategory, ServiceReview } from '../types';
import ServiceProviderCard from '../components/services/ServiceProviderCard';
import Spinner from '../components/ui/Spinner';
import Modal from '../components/ui/Modal';
import { BriefcaseIcon, WrenchIcon, PlugIcon, DropletIcon, TruckIcon, SearchIcon, BadgeCheckIcon, FileTextIcon, MessageSquareIcon, HammerIcon } from '../constants';
import { useToast } from '../contexts/ToastContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

const PainterIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 12H16c-.7 0-1.3-.6-1.3-1.3V4.3c0-.7.6-1.3 1.3-1.3h5.5c.7 0 1.3.6 1.3 1.3V10.7c0 .7-.6 1.3-1.3 1.3z"/><path d="M12 21H3a1 1 0 0 1-1-1v-5.5c0-.7.6-1.3 1.3-1.3h5.4c.7 0 1.3.6 1.3 1.3V19a1 1 0 0 1-1 1z"/><path d="M14.7 12.5v2.8c0 .8.6 1.4 1.4 1.4h2.4"/><path d="M12 2v2"/><path d="M12 8v2"/><path d="M8 12H6"/><path d="M2 12H0"/></svg>
);
const SofaIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v5"/><path d="M2 16h20"/><path d="M3 12a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2H3z"/></svg>
);
const LeafIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8z"/><path d="M12 22V12"/></svg>
);
const ShirtIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/></svg>
);
const SprayCanIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 10h1.5a.5.5 0 0 0 .5-.5V8a2 2 0 0 0-2-2h-1.5"/><path d="m14 6-1-1.5a.5.5 0 0 0-.8 0L11.5 6"/><path d="M15.5 12.5a.5.5 0 0 1-.5.5h-5a.5.5 0 0 1-.5-.5v-2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 .5.5Z"/><path d="M6 13h12v7a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z"/><path d="M14 10V6.5"/><path d="M10 10V6.5"/></svg>
);
const BugIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h-4a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v4"/><path d="m19 12-4.5 4.5"/><path d="m14.5 16.5 4.5 4.5"/><path d="M12 10h.01"/><path d="M16 4l-3 3"/><path d="m8 4 3 3"/><path d="m4 8 3-3"/><path d="m4 12 3 3"/></svg>
);
const WifiIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.55a8 8 0 0 1 14 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a4 4 0 0 1 6.95 0"/><line x1="12" x2="12.01" y1="20" y2="20"/></svg>
);
const BoxIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
);

const CATEGORIES: { label: string, value: ServiceCategory | 'All', icon: React.ReactNode }[] = [
    { label: 'All', value: 'All', icon: <BriefcaseIcon className="w-4 h-4" /> },
    { label: 'Electrician', value: 'Electrician', icon: <PlugIcon className="w-4 h-4" /> },
    { label: 'Plumber', value: 'Plumber', icon: <DropletIcon className="w-4 h-4" /> },
    { label: 'Carpenter', value: 'Carpenter', icon: <HammerIcon className="w-4 h-4" /> },
    { label: 'Painter', value: 'Painter', icon: <PainterIcon className="w-4 h-4" /> },
    { label: 'Interior Designer', value: 'Interior Designer', icon: <SofaIcon className="w-4 h-4" /> },
    { label: 'Gardener', value: 'Gardener', icon: <LeafIcon className="w-4 h-4" /> },
    { label: 'Laundry', value: 'Laundry', icon: <ShirtIcon className="w-4 h-4" /> },
    { label: 'Cleaning', value: 'Cleaning', icon: <SprayCanIcon className="w-4 h-4" /> },
    { label: 'Security', value: 'Security', icon: <BadgeCheckIcon className="w-4 h-4" /> },
    { label: 'Pest Control', value: 'Pest Control', icon: <BugIcon className="w-4 h-4" /> },
    { label: 'Appliances', value: 'Appliance Repair', icon: <WrenchIcon className="w-4 h-4" /> },
    { label: 'Broadband', value: 'Broadband', icon: <WifiIcon className="w-4 h-4" /> },
    { label: 'Packers & Movers', value: 'Packers & Movers', icon: <TruckIcon className="w-4 h-4" /> },
    { label: 'Wholesale', value: 'Wholesale', icon: <BoxIcon className="w-4 h-4" /> },
    { label: 'General', value: 'General', icon: <BriefcaseIcon className="w-4 h-4" /> },
];

const ReviewModal: React.FC<{ isOpen: boolean, onClose: () => void, providerId: string, providerName: string, onSuccess: () => void }> = ({ isOpen, onClose, providerId, providerName, onSuccess }) => {
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const { success, error } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await addServiceReview(providerId, rating, comment, 'Anonymous Owner'); 
            success("Review submitted!");
            onSuccess();
            onClose();
        } catch(e) {
            error("Failed to submit review.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Review ${providerName}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium">Rating</label>
                    <select value={rating} onChange={e => setRating(Number(e.target.value))} className="w-full p-2 border rounded">
                        <option value={5}>5 Stars</option>
                        <option value={4}>4 Stars</option>
                        <option value={3}>3 Stars</option>
                        <option value={2}>2 Stars</option>
                        <option value={1}>1 Star</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium">Comment</label>
                    <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} className="w-full p-2 border rounded" required />
                </div>
                <div className="flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm bg-gray-200 rounded">Cancel</button>
                    <button type="submit" disabled={submitting} className="px-4 py-2 text-sm bg-blue-600 text-white rounded">{submitting ? 'Submitting...' : 'Submit'}</button>
                </div>
            </form>
        </Modal>
    );
}

const LocalServicesPage: React.FC = () => {
    const { t } = useLanguage();
    const { success, error: toastError } = useToast();
    const { profile } = useAuth();
    const [providers, setProviders] = useState<ServiceProvider[]>([]);
    const [loading, setLoading] = useState(true);
    const [category, setCategory] = useState<ServiceCategory | 'All' | string>('All');
    
    // Registration State
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
    const [regName, setRegName] = useState('');
    const [regPhone, setRegPhone] = useState('');
    const [regCategory, setRegCategory] = useState<ServiceCategory | 'Other'>('General');
    const [regCustomCategory, setRegCustomCategory] = useState('');
    const [regDesc, setRegDesc] = useState('');
    const [regLocation, setRegLocation] = useState('');
    const [registering, setRegistering] = useState(false);

    // Review Modal State
    const [reviewProvider, setReviewProvider] = useState<{id: string, name: string} | null>(null);

    const fetchProviders = async () => {
        setLoading(true);
        try {
            const data = await getServiceProviders(category);
            setProviders(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProviders();
    }, [category]);

    const handleWhatsApp = (provider: ServiceProvider) => {
        const message = `Hi ${provider.name}, I saw your profile on Nilayam. I need help with ${provider.category} services.`;
        window.open(`https://wa.me/91${provider.phone_number}?text=${encodeURIComponent(message)}`, '_blank');
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setRegistering(true);
        try {
            const finalCategory = regCategory === 'Other' ? regCustomCategory : regCategory;
            await registerServiceProvider({
                name: regName,
                phone_number: regPhone,
                category: finalCategory,
                description: regDesc,
                location: regLocation,
                availability: 'Available'
            });
            success("Registration successful! Your profile is pending verification.");
            setIsRegisterModalOpen(false);
            setRegName('');
            setRegPhone('');
            setRegDesc('');
            setRegLocation('');
            setRegCustomCategory('');
            setRegCategory('General');
        } catch (err) {
            toastError("Failed to register. Please try again.");
        } finally {
            setRegistering(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {reviewProvider && (
                <ReviewModal 
                    isOpen={!!reviewProvider} 
                    onClose={() => setReviewProvider(null)} 
                    providerId={reviewProvider.id} 
                    providerName={reviewProvider.name} 
                    onSuccess={fetchProviders}
                />
            )}

            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight flex items-center gap-3">
                        <BriefcaseIcon className="h-8 w-8 text-blue-600"/>
                        {t('nav.services')}
                    </h2>
                    <p className="text-neutral-500 dark:text-neutral-400 mt-1">Connect with trusted professionals or list your own services.</p>
                </div>
                <button 
                    onClick={() => setIsRegisterModalOpen(true)}
                    className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-6 py-2.5 rounded-full font-bold shadow-lg hover:scale-105 transition-transform flex items-center gap-2"
                >
                    Join as a Pro
                </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {CATEGORIES.map(cat => (
                    <button
                        key={cat.label}
                        onClick={() => setCategory(cat.value)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap border ${
                            category === cat.value 
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                            : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700'
                        }`}
                    >
                        {cat.icon}
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* Providers Grid */}
            {loading ? (
                <div className="h-64 flex items-center justify-center"><Spinner /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {providers.map(provider => (
                        <div key={provider.id}>
                            <ServiceProviderCard 
                                provider={provider} 
                                onContact={() => handleWhatsApp(provider)}
                                role={profile?.role}
                            />
                            {/* Catalogs & Reviews UI */}
                            <div className="mt-2 flex gap-2">
                                <button 
                                    onClick={() => setReviewProvider({id: provider.id, name: provider.name})}
                                    className="text-xs flex items-center gap-1 text-blue-600 hover:underline px-2"
                                >
                                    <MessageSquareIcon className="w-3 h-3" /> Write Review
                                </button>
                                {provider.catalogs && provider.catalogs.length > 0 && (
                                    <div className="flex gap-2 px-2">
                                        {provider.catalogs.map(cat => (
                                            <a key={cat.id} href={cat.url} target="_blank" rel="noopener noreferrer" className="text-xs flex items-center gap-1 text-green-600 hover:underline">
                                                <FileTextIcon className="w-3 h-3" /> {cat.name}
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {providers.length === 0 && (
                        <div className="col-span-full text-center py-12 text-neutral-500">
                            No service providers found in this category yet.
                        </div>
                    )}
                </div>
            )}

            {/* Registration Modal */}
            <Modal isOpen={isRegisterModalOpen} onClose={() => setIsRegisterModalOpen(false)} title="Register as Service Partner">
                <form onSubmit={handleRegister} className="space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg flex gap-3">
                        <BadgeCheckIcon className="w-6 h-6 text-blue-600 flex-shrink-0" />
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                            Join our network to receive job requests directly. Your profile will be visible to all residents after verification.
                        </p>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Full Name / Business Name</label>
                        <input type="text" value={regName} onChange={e => setRegName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all" required />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Phone Number</label>
                            <input type="tel" value={regPhone} onChange={e => setRegPhone(e.target.value)} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Category</label>
                            <select value={regCategory} onChange={e => setRegCategory(e.target.value as any)} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all">
                                {CATEGORIES.filter(c => c.value !== 'All').map(c => (
                                    <option key={c.label} value={c.value}>{c.label}</option>
                                ))}
                                <option value="Other">Other (Custom)</option>
                            </select>
                        </div>
                    </div>

                    {regCategory === 'Other' && (
                        <div className="animate-fade-in">
                            <label className="block text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">Specify Your Service</label>
                            <input 
                                type="text" 
                                value={regCustomCategory} 
                                onChange={e => setRegCustomCategory(e.target.value)} 
                                className="w-full px-3 py-2 border border-blue-300 dark:border-blue-600 rounded-lg bg-blue-50 dark:bg-blue-900/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all" 
                                required={regCategory === 'Other'} 
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Location / Service Area</label>
                        <input type="text" value={regLocation} onChange={e => setRegLocation(e.target.value)} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all" required />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Description / Experience</label>
                        <textarea value={regDesc} onChange={e => setRegDesc(e.target.value)} rows={3} placeholder="Describe your skills and services..." className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all" required />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <button type="button" onClick={() => setIsRegisterModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600">Cancel</button>
                        <button type="submit" disabled={registering} className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-md disabled:opacity-50 active:scale-95 transition-all">
                            {registering ? 'Submitting...' : 'Register Now'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default LocalServicesPage;
