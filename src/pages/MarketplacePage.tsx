
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import { CheckCircleIcon, BedIcon, BathIcon, SquareFootIcon, PhoneIcon, MessageCircleIcon, TagIcon, MapPinIcon } from '../constants';
import { Listing } from '../types';
import { getMarketplaceListings, sendMarketplaceOffer } from '../services/api';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import ImmersiveViewer from '../components/properties/ImmersiveViewer';
import { sharePropertyLocation } from '../utils/sharing';


const SearchBar: React.FC = () => (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-md border border-slate-200 dark:border-slate-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
                <label htmlFor="location" className="block text-sm font-medium text-slate-600 dark:text-slate-400">Location</label>
                <input type="text" id="location" placeholder="e.g., 'Mumbai'" className="mt-1 w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-blue-500 bg-white dark:bg-slate-700 text-blue-950 dark:text-slate-200" />
            </div>
            <div>
                <label htmlFor="prop-type" className="block text-sm font-medium text-slate-600 dark:text-slate-400">Property Type</label>
                <select id="prop-type" className="mt-1 w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-blue-500 bg-white dark:bg-slate-700 text-blue-950 dark:text-slate-200">
                    <option>Any</option>
                    <option>For Sale</option>
                    <option>For Rent</option>
                </select>
            </div>
            <div>
                <label htmlFor="price-range" className="block text-sm font-medium text-slate-600 dark:text-slate-400">Price Range</label>
                <input type="text" id="price-range" placeholder="e.g., '50L - 1Cr'" className="mt-1 w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-blue-500 bg-white dark:bg-slate-700 text-blue-950 dark:text-slate-200" />
            </div>
            <button className="bg-blue-800 dark:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-900 dark:hover:bg-blue-700 transition-colors w-full">
                Search
            </button>
        </div>
    </div>
);

const ImageCarousel: React.FC<{ images: string[], alt: string, onClick: () => void }> = ({ images, alt, onClick }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const handlePrev = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    };

    const handleNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    };

    return (
        <div className="relative h-56 group overflow-hidden" onClick={onClick}>
            <img src={images[currentIndex]} alt={alt} className="w-full h-full object-cover bg-slate-200 transition-transform duration-700 group-hover:scale-105 cursor-pointer" />
            
            {images.length > 1 && (
                <>
                    <button 
                        onClick={handlePrev} 
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70 z-10"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
                    </button>
                    <button 
                        onClick={handleNext} 
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70 z-10"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                    </button>
                    
                    {/* Dots Indicator */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-1.5 z-10">
                        {images.map((_, idx) => (
                            <div 
                                key={idx} 
                                className={`w-1.5 h-1.5 rounded-full shadow-sm transition-all duration-300 ${currentIndex === idx ? 'bg-white scale-125 w-2' : 'bg-white/50'}`}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

const ListingCard: React.FC<{ listing: Listing; onClick: () => void }> = ({ listing, onClick }) => {
    const images = (listing.images && listing.images.length > 0) 
        ? listing.images 
        : [listing.image_url || `https://api.dicebear.com/8.x/icons/svg?seed=${listing.building_name}`];

    return (
        <Card className="hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col p-0 overflow-hidden h-full cursor-pointer group">
            <div className="relative">
                <ImageCarousel images={images} alt={`Property at ${listing.address}`} onClick={onClick} />
                <div className={`absolute top-2 right-2 flex items-center px-2 py-1 rounded-full text-xs font-semibold shadow-sm z-10
                    ${listing.listing_type === 'sale' ? 'bg-green-100 dark:bg-green-900/80 text-green-800 dark:text-green-300' : 'bg-blue-100 dark:bg-blue-900/80 text-blue-800 dark:text-blue-300'}`}>
                    For {listing.listing_type === 'sale' ? 'Sale' : 'Rent'}
                </div>
                 <div className="absolute bottom-2 left-2 flex items-center bg-black/60 backdrop-blur-md text-white px-2 py-1 rounded-full text-xs font-semibold shadow-sm z-10">
                    <CheckCircleIcon className="w-4 h-4 mr-1 text-green-400"/>
                    Verified Owner
                </div>
            </div>
            <div className="p-5 flex-grow flex flex-col">
                <div className="flex-grow">
                    <p className="text-2xl font-bold text-blue-800 dark:text-blue-300">
                        ₹{listing.price.toLocaleString('en-IN')}
                        {listing.listing_type === 'rent' && <span className="text-base font-normal text-slate-500 dark:text-slate-400">/month</span>}
                    </p>
                    <p className="mt-1 font-semibold text-blue-950 dark:text-slate-200 truncate">
                        {listing.listing_type === 'sale' ? listing.building_name : `Unit in ${listing.building_name}`}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                        <MapPinIcon className="w-3 h-3 flex-shrink-0" />
                        {listing.address}
                    </p>

                    <div className="mt-3 flex items-center space-x-4 text-sm text-slate-600 dark:text-slate-300">
                        {listing.bedrooms && <span className="flex items-center"><BedIcon className="w-4 h-4 mr-1"/> {listing.bedrooms} Beds</span>}
                        {listing.bathrooms && <span className="flex items-center"><BathIcon className="w-4 h-4 mr-1"/> {listing.bathrooms} Baths</span>}
                        {listing.area_sqft && <span className="flex items-center"><SquareFootIcon className="w-4 h-4 mr-1"/> {listing.area_sqft} sqft</span>}
                    </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <button onClick={onClick} className="text-sm font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 transition-colors">View Details</button>
                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                    </div>
                </div>
            </div>
        </Card>
    );
}

const ListingDetailsModal: React.FC<{ listing: Listing; onClose: () => void }> = ({ listing, onClose }) => {
    const [activeImage, setActiveImage] = useState(0);
    const [showContact, setShowContact] = useState(false);
    const [showOfferForm, setShowOfferForm] = useState(false);
    const [offerAmount, setOfferAmount] = useState('');
    const [offerMessage, setOfferMessage] = useState('');
    const [submittingOffer, setSubmittingOffer] = useState(false);
    const [offerSuccess, setOfferSuccess] = useState(false);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [immersiveConfig, setImmersiveConfig] = useState<{ isOpen: boolean; type: '3d' | '360'; url: string; title: string } | null>(null);

    const images = listing.images && listing.images.length > 0 
        ? listing.images 
        : [listing.image_url || `https://api.dicebear.com/8.x/icons/svg?seed=${listing.building_name}`];

    const handleMakeOffer = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmittingOffer(true);
        try {
            await sendMarketplaceOffer(listing.id, Number(offerAmount), offerMessage);
            setOfferSuccess(true);
            setTimeout(() => {
                setShowOfferForm(false);
                setOfferSuccess(false);
                setOfferAmount('');
            }, 3000);
        } catch (error) {
            alert("Failed to send offer. Please try again.");
        } finally {
            setSubmittingOffer(false);
        }
    };

    const handleWhatsApp = () => {
        const phoneMatch = listing.contact_info.match(/(\+?\d[\d\s-]{8,})/); 
        if (phoneMatch) {
            let phone = phoneMatch[0].replace(/\D/g, '');
            if (phone.length === 10) phone = '91' + phone;
            if (phone.length >= 10 && phone.length <= 15) {
                window.open(`https://wa.me/${phone}?text=Hi, I am interested in your property: ${listing.building_name}`, '_blank');
            } else {
                alert("Contact info found, but the phone number format seems invalid.");
            }
        } else {
            alert("Could not detect a valid phone number in the contact info.");
        }
    };

    const handleMap = () => {
        if (listing.coordinates) {
             window.open(`https://www.google.com/maps/search/?api=1&query=${listing.coordinates.lat},${listing.coordinates.lng}`, '_blank');
        } else {
            const query = encodeURIComponent(`${listing.building_name}, ${listing.address}`);
            window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
        }
    }

    const handleShare = async () => {
        await sharePropertyLocation({
            name: listing.building_name,
            address: listing.address,
            coordinates: listing.coordinates
        });
    };

    const nextImage = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setActiveImage((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    }
    const prevImage = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setActiveImage((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    }

    return (
        <>
            {lightboxOpen && (
                <div 
                    className="fixed inset-0 z-[70] bg-black/95 flex flex-col justify-center items-center"
                    onClick={() => setLightboxOpen(false)}
                >
                    <button className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full" onClick={() => setLightboxOpen(false)}>
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    <img src={images[activeImage]} alt="Fullscreen View" className="max-h-[85vh] max-w-[95vw] object-contain" onClick={(e) => e.stopPropagation()} />
                </div>
            )}

            <Modal isOpen={true} onClose={onClose} title="Property Details" maxWidth="4xl">
                <div className="flex flex-col lg:flex-row gap-6">
                    <div className="lg:w-3/5 space-y-4">
                        <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shadow-md relative group cursor-zoom-in" onClick={() => setLightboxOpen(true)}>
                            <img src={images[activeImage]} alt="Main View" className="w-full h-full object-cover" />
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                            <h3 className="font-bold text-lg mb-4 text-slate-900 dark:text-slate-100">About this property</h3>
                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{listing.description}</p>
                            {(listing.threed_model_url || listing.panorama_url) && (
                                <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                                    <h4 className="font-bold text-sm text-blue-900 dark:text-blue-400 uppercase tracking-wider mb-4">Experience it Virtually</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        {listing.threed_model_url && (
                                            <button onClick={() => setImmersiveConfig({ isOpen: true, type: '3d', url: listing.threed_model_url!, title: listing.building_name })} className="btn-secondary text-xs">View in 3D</button>
                                        )}
                                        {listing.panorama_url && (
                                            <button onClick={() => setImmersiveConfig({ isOpen: true, type: '360', url: listing.panorama_url!, title: listing.building_name })} className="btn-secondary text-xs">360° Walkthrough</button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="lg:w-2/5 space-y-6">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white truncate">{listing.building_name}</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm flex items-start gap-1 mt-1 break-words"><MapPinIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />{listing.address}</p>
                            <div className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 mt-4 mb-6">₹{listing.price.toLocaleString('en-IN')}{listing.listing_type === 'rent' && <span className="text-base font-normal text-slate-400 ml-1">/month</span>}</div>
                            <div className="space-y-3">
                                <button onClick={() => setShowOfferForm(true)} className="btn-primary w-full">Make an Offer</button>
                                <button onClick={() => setShowContact(true)} className="btn-secondary w-full">Contact Owner</button>
                            </div>
                        </div>
                    </div>
                </div>
                {immersiveConfig && (
                    <ImmersiveViewer
                        isOpen={immersiveConfig.isOpen}
                        onClose={() => setImmersiveConfig(prev => prev ? { ...prev, isOpen: false } : null)}
                        type={immersiveConfig.type}
                        url={immersiveConfig.url}
                        title={immersiveConfig.title}
                    />
                )}
            </Modal>
        </>
    );
};

const MarketplacePage: React.FC = () => {
    const [listings, setListings] = useState<Listing[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchListings = async () => {
            try {
                setLoading(true);
                const data = await getMarketplaceListings();
                setListings(data);
                setError(null);
            } catch (err: any) {
                setError(err.message || 'Failed to fetch listings.');
            } finally {
                setLoading(false);
            }
        };
        fetchListings();
    }, []);

    const renderContent = () => {
        if (loading) return <div className="text-center py-12"><Spinner /></div>;
        
        if (error) return (
            <div className="text-center py-12 p-8 rounded-3xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 shadow-xl shadow-red-500/5 transition-all animate-fade-in">
                <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <h3 className="text-2xl font-black text-red-900 dark:text-red-300 tracking-tight">Marketplace Unreachable</h3>
                <p className="text-red-700/70 dark:text-red-400/70 mt-3 max-w-sm mx-auto leading-relaxed">
                    We're having trouble connecting to the marketplace database. Please check your connection or try again in a moment.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                    <button 
                        onClick={() => window.location.reload()} 
                        className="px-8 py-3 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all shadow-xl shadow-red-600/30 active:scale-95"
                    >
                        Retry Connection
                    </button>
                    <button 
                        onClick={() => navigate('/')} 
                        className="px-8 py-3 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 rounded-2xl font-bold hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-all border border-neutral-200 dark:border-neutral-700 active:scale-95"
                    >
                        Go Home
                    </button>
                </div>
            </div>
        );
        
        if (listings.length === 0) return <div className="text-center py-12 text-slate-500 dark:text-slate-400">No listings currently available in the marketplace.</div>;
        
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {listings.map(listing => (
                    <ListingCard key={listing.id} listing={listing} onClick={() => setSelectedListing(listing)} />
                ))}
            </div>
        );
    };

    const handleListProperty = () => {
        navigate('/properties');
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {selectedListing && (
                <ListingDetailsModal 
                    listing={selectedListing} 
                    onClose={() => setSelectedListing(null)} 
                />
            )}

            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-blue-900 dark:text-slate-200">Marketplace</h2>
                    <p className="mt-1 text-slate-500 dark:text-slate-400">Buy and sell with confidence. Every listing is from a verified owner.</p>
                </div>
                <button 
                    onClick={handleListProperty}
                    className="bg-green-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-green-700 transition-colors shrink-0 shadow-lg shadow-green-600/20 flex items-center justify-center gap-2"
                >
                    <TagIcon className="w-5 h-5" />
                    List Your Property
                </button>
            </div>
            
            <SearchBar />

            {renderContent()}
        </div>
    );
};

export default MarketplacePage;