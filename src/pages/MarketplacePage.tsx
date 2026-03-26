import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowRight,
    BedDouble,
    Building2,
    ExternalLink,
    Filter,
    IndianRupee,
    MapPin,
    Package,
    Search,
    Share2,
    ShoppingBag,
    Sparkles,
    Store,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import { useAuth } from '../contexts/AuthContext';
import { createProductMarketplaceListing, getMarketplaceListings, getProductMarketplaceListings } from '../services/api';
import { Listing, ListingType, ProductCondition, ProductListing } from '../types';
import { copyText, openPhoneDialer, openWhatsAppChat, shareListingDetails } from '../utils/sharing';

type MarketplaceFilter = 'all' | 'rent' | 'sale' | 'products';

const currency = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
});

const filterMeta: Array<{ id: MarketplaceFilter; label: string; hint: string }> = [
    { id: 'all', label: 'All', hint: 'Rent, buy, and sell in one place' },
    { id: 'rent', label: 'Rent Homes', hint: 'Tenants can find a new house quickly' },
    { id: 'sale', label: 'Buy Property', hint: 'Explore homes and investments for sale' },
    { id: 'products', label: 'Products', hint: 'Residents can sell useful items too' },
];

const conditionLabels: Record<ProductCondition, string> = {
    new: 'New',
    like_new: 'Like New',
    used: 'Used',
};

const getListingLabel = (type: ListingType) => (type === 'rent' ? 'For Rent' : 'For Sale');

const getPropertyImage = (listing: Listing) => listing.images?.[0] || listing.image_url || '';

const PropertyDetailsModal: React.FC<{
    listing: Listing | null;
    onClose: () => void;
}> = ({ listing, onClose }) => {
    if (!listing) return null;

    const image = getPropertyImage(listing);
    const shareProperty = async () => {
        await shareListingDetails({
            title: `${listing.building_name} • ${getListingLabel(listing.listing_type)}`,
            text: [
                `${listing.address}`,
                `${currency.format(listing.price)}${listing.listing_type === 'rent' ? ' / month' : ''}`,
                listing.description,
            ].filter(Boolean).join('\n'),
            url: listing.google_map_url,
        });
    };

    return (
        <Modal isOpen={!!listing} onClose={onClose} title={listing.building_name} maxWidth="3xl">
            <div className="space-y-6">
                {image ? (
                    <img src={image} alt={listing.building_name} className="h-64 w-full rounded-2xl object-cover" />
                ) : (
                    <div className="flex h-64 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                        <Building2 className="h-16 w-16" />
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">
                        {getListingLabel(listing.listing_type)}
                    </span>
                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                        {currency.format(listing.price)}
                        {listing.listing_type === 'rent' ? <span className="text-base font-semibold text-slate-500 dark:text-slate-400"> / month</span> : null}
                    </span>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                        <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Location</div>
                        <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{listing.address}</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                        <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Configuration</div>
                        <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                            {listing.bedrooms || 0} Bed • {listing.bathrooms || 0} Bath
                        </div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                        <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Area</div>
                        <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{listing.area_sqft || 'NA'} sq ft</div>
                    </div>
                </div>

                <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">{listing.description}</p>

                <div className="grid gap-3 md:grid-cols-4">
                    <button onClick={() => openWhatsAppChat(listing.contact_info, `Hi, I am interested in ${listing.building_name}.`)} className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-600">
                        WhatsApp Owner
                    </button>
                    <button onClick={() => openPhoneDialer(listing.contact_info)} className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900">
                        Call Owner
                    </button>
                    <button onClick={() => copyText(listing.contact_info)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                        Copy Contact
                    </button>
                    <button onClick={shareProperty} className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-100 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-200">
                        Share Listing
                    </button>
                </div>

                {listing.google_map_url ? (
                    <a
                        href={listing.google_map_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-300"
                    >
                        Open on Maps <ExternalLink className="h-4 w-4" />
                    </a>
                ) : null}
            </div>
        </Modal>
    );
};

const ProductDetailsModal: React.FC<{
    product: ProductListing | null;
    onClose: () => void;
}> = ({ product, onClose }) => {
    if (!product) return null;

    const shareProduct = async () => {
        await shareListingDetails({
            title: product.title,
            text: [
                `${currency.format(product.price)}`,
                product.category,
                conditionLabels[product.condition],
                product.description,
                product.location,
            ].filter(Boolean).join('\n'),
        });
    };

    return (
        <Modal isOpen={!!product} onClose={onClose} title={product.title} maxWidth="2xl">
            <div className="space-y-6">
                {product.images?.[0] ? (
                    <img src={product.images[0]} alt={product.title} className="h-64 w-full rounded-2xl object-cover" />
                ) : (
                    <div className="flex h-64 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 dark:bg-amber-500/10 dark:text-amber-300">
                        <Package className="h-16 w-16" />
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
                        {product.category}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                        {conditionLabels[product.condition]}
                    </span>
                    <span className="text-2xl font-black text-slate-900 dark:text-white">{currency.format(product.price)}</span>
                </div>

                <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">{product.description}</p>

                <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                        <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Seller</div>
                        <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{product.seller_name}</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                        <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Location</div>
                        <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{product.location || 'Nearby pickup / local delivery'}</div>
                    </div>
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                    <button onClick={() => openWhatsAppChat(product.contact_info, `Hi, I am interested in your product "${product.title}".`)} className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-600">
                        WhatsApp
                    </button>
                    <button onClick={() => openPhoneDialer(product.contact_info)} className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900">
                        Call
                    </button>
                    <button onClick={() => copyText(product.contact_info)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                        Copy Number
                    </button>
                    <button onClick={shareProduct} className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700 transition hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
                        Share Product
                    </button>
                </div>
            </div>
        </Modal>
    );
};

const MarketplacePage: React.FC = () => {
    const navigate = useNavigate();
    const { profile } = useAuth();
    const isTenant = profile?.role === 'tenant';
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [activeFilter, setActiveFilter] = useState<MarketplaceFilter>('all');
    const [propertyListings, setPropertyListings] = useState<Listing[]>([]);
    const [productListings, setProductListings] = useState<ProductListing[]>([]);
    const [selectedProperty, setSelectedProperty] = useState<Listing | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<ProductListing | null>(null);
    const [sellModalOpen, setSellModalOpen] = useState(false);
    const [form, setForm] = useState({
        title: '',
        description: '',
        category: '',
        price: '',
        contact_info: profile?.phone_number || '',
        location: '',
        condition: 'used' as ProductCondition,
        imageUrls: '',
    });

    const loadMarketplace = async () => {
        setLoading(true);
        setError(null);
        try {
            const [properties, products] = await Promise.all([
                getMarketplaceListings(),
                getProductMarketplaceListings(),
            ]);
            setPropertyListings(properties);
            setProductListings(products);
        } catch (err: any) {
            setError(err?.message || 'Failed to load marketplace.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadMarketplace();
    }, []);

    useEffect(() => {
        setForm(current => ({
            ...current,
            contact_info: current.contact_info || profile?.phone_number || '',
        }));
    }, [profile?.phone_number]);

    const filteredProperties = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();
        return propertyListings.filter(listing => {
            if (activeFilter === 'rent' && listing.listing_type !== 'rent') return false;
            if (activeFilter === 'sale' && listing.listing_type !== 'sale') return false;
            if (activeFilter === 'products') return false;
            if (!normalizedSearch) return true;

            return [
                listing.building_name,
                listing.address,
                listing.description,
                listing.house_number,
            ].some(value => value?.toLowerCase().includes(normalizedSearch));
        });
    }, [activeFilter, propertyListings, search]);

    const filteredProducts = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();
        if (activeFilter !== 'all' && activeFilter !== 'products') return [];
        return productListings.filter(product => {
            if (!normalizedSearch) return true;
            return [
                product.title,
                product.category,
                product.description,
                product.location,
                product.seller_name,
            ].some(value => value?.toLowerCase().includes(normalizedSearch));
        });
    }, [activeFilter, productListings, search]);

    const handleSellProduct = async (event: React.FormEvent) => {
        event.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            await createProductMarketplaceListing({
                title: form.title.trim(),
                description: form.description.trim(),
                category: form.category.trim(),
                price: Number(form.price),
                condition: form.condition,
                contact_info: form.contact_info.trim(),
                location: form.location.trim(),
                images: form.imageUrls.split('\n').map(item => item.trim()).filter(Boolean),
            });

            setSellModalOpen(false);
            setForm({
                title: '',
                description: '',
                category: '',
                price: '',
                contact_info: profile?.phone_number || '',
                location: '',
                condition: 'used',
                imageUrls: '',
            });
            await loadMarketplace();
        } catch (err: any) {
            setError(err?.message || 'Could not create your product listing.');
        } finally {
            setSubmitting(false);
        }
    };

    const totalVisible = filteredProperties.length + filteredProducts.length;

    return (
        <div className="space-y-6">
            <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_45%,#fff7ed_100%)] p-6 shadow-sm dark:border-slate-800 dark:bg-[linear-gradient(135deg,rgba(30,41,59,0.95)_0%,rgba(15,23,42,1)_55%,rgba(120,53,15,0.55)_100%)] md:p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-3xl space-y-4">
                        <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-blue-700 dark:border-blue-500/30 dark:bg-slate-900/60 dark:text-blue-200">
                            <Sparkles className="h-4 w-4" />
                            Marketplace For Everyone
                        </div>
                        <div className="space-y-3">
                            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white md:text-5xl">
                                Rent a home, buy a property, or sell products from one marketplace.
                            </h1>
                            <p className="max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300 md:text-base">
                                Tenants can search for their next house, buyers can explore sale listings, and every resident can post useful products for the community.
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <button
                            onClick={() => isTenant ? setSellModalOpen(true) : navigate('/properties')}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900"
                        >
                            {isTenant ? 'Sell Your Product' : 'List Property'} <ArrowRight className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setSellModalOpen(true)}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-300 bg-amber-100 px-5 py-3 text-sm font-bold text-amber-800 transition hover:bg-amber-200 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
                        >
                            {isTenant ? 'Post for Residents' : 'Sell Product'} <Store className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </section>

            <section className="space-y-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap gap-3">
                        {filterMeta.map(item => {
                            const isActive = item.id === activeFilter;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveFilter(item.id)}
                                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                                        isActive
                                            ? 'border-slate-900 bg-slate-900 text-white shadow-lg dark:border-white dark:bg-white dark:text-slate-900'
                                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    <div className="text-sm font-bold">{item.label}</div>
                                    <div className={`mt-1 text-xs ${isActive ? 'text-white/80 dark:text-slate-700' : 'text-slate-500 dark:text-slate-400'}`}>{item.hint}</div>
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900 lg:max-w-md">
                        <Search className="h-4 w-4 text-slate-400" />
                        <input
                            value={search}
                            onChange={event => setSearch(event.target.value)}
                            placeholder="Search by place, property, category, seller..."
                            className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
                        />
                        <Filter className="h-4 w-4 text-slate-300" />
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    <span>{filteredProperties.filter(item => item.listing_type === 'rent').length} rent</span>
                    <span>{filteredProperties.filter(item => item.listing_type === 'sale').length} sale</span>
                    <span>{filteredProducts.length} products</span>
                    <span>{totalVisible} visible</span>
                </div>
            </section>

            {error ? (
                <Card className="rounded-[1.75rem] border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                    {error}
                </Card>
            ) : null}

            {loading ? (
                <Spinner className="min-h-[320px]" />
            ) : (
                <section className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
                    {filteredProperties.map(listing => (
                        <Card key={`property-${listing.id}`} className="group rounded-[1.75rem] border border-slate-200 bg-white p-0 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <div className="overflow-hidden rounded-t-[1.75rem]">
                                {getPropertyImage(listing) ? (
                                    <img src={getPropertyImage(listing)} alt={listing.building_name} className="h-56 w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
                                ) : (
                                    <div className="flex h-56 items-center justify-center bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                                        <Building2 className="h-14 w-14" />
                                    </div>
                                )}
                            </div>
                            <div className="space-y-4 p-5">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="rounded-full bg-blue-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">
                                            {getListingLabel(listing.listing_type)}
                                        </div>
                                        <h3 className="mt-3 text-lg font-black text-slate-900 dark:text-white">{listing.building_name}</h3>
                                    </div>
                                    <button onClick={() => void shareListingDetails({ title: listing.building_name, text: `${listing.address}\n${currency.format(listing.price)}`, url: listing.google_map_url })} className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-800 dark:border-slate-700 dark:text-slate-300">
                                        <Share2 className="h-4 w-4" />
                                    </button>
                                </div>

                                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                    <MapPin className="h-4 w-4" />
                                    <span>{listing.address}</span>
                                </div>

                                <div className="flex flex-wrap gap-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                                    <span className="inline-flex items-center gap-1"><BedDouble className="h-4 w-4" />{listing.bedrooms || 0} bed</span>
                                    <span className="inline-flex items-center gap-1"><Building2 className="h-4 w-4" />{listing.area_sqft || 'NA'} sq ft</span>
                                </div>

                                <div className="flex items-end justify-between gap-4">
                                    <div>
                                        <div className="text-2xl font-black text-slate-900 dark:text-white">{currency.format(listing.price)}</div>
                                        {listing.listing_type === 'rent' ? <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Per Month</div> : null}
                                    </div>
                                    <button onClick={() => setSelectedProperty(listing)} className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900">
                                        View Details
                                    </button>
                                </div>
                            </div>
                        </Card>
                    ))}

                    {filteredProducts.map(product => (
                        <Card key={product.id} className="group rounded-[1.75rem] border border-slate-200 bg-white p-0 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <div className="overflow-hidden rounded-t-[1.75rem]">
                                {product.images?.[0] ? (
                                    <img src={product.images[0]} alt={product.title} className="h-56 w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
                                ) : (
                                    <div className="flex h-56 items-center justify-center bg-amber-50 text-amber-500 dark:bg-amber-500/10 dark:text-amber-300">
                                        <ShoppingBag className="h-14 w-14" />
                                    </div>
                                )}
                            </div>
                            <div className="space-y-4 p-5">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
                                            Product
                                        </div>
                                        <h3 className="mt-3 text-lg font-black text-slate-900 dark:text-white">{product.title}</h3>
                                    </div>
                                    <button onClick={() => void shareListingDetails({ title: product.title, text: `${product.category}\n${currency.format(product.price)}` })} className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-800 dark:border-slate-700 dark:text-slate-300">
                                        <Share2 className="h-4 w-4" />
                                    </button>
                                </div>

                                <div className="flex flex-wrap gap-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                                    <span>{product.category}</span>
                                    <span>{conditionLabels[product.condition]}</span>
                                    {product.location ? <span>{product.location}</span> : null}
                                </div>

                                <p className="line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{product.description}</p>

                                <div className="flex items-end justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-1 text-2xl font-black text-slate-900 dark:text-white">
                                            <IndianRupee className="h-5 w-5" />
                                            {currency.format(product.price).replace('₹', '').trim()}
                                        </div>
                                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                                            by {product.seller_name}
                                        </div>
                                    </div>
                                    <button onClick={() => setSelectedProduct(product)} className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900">
                                        View Details
                                    </button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </section>
            )}

            {!loading && totalVisible === 0 ? (
                <Card className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white/80 p-8 text-center dark:border-slate-700 dark:bg-slate-900/70">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                        <Search className="h-6 w-6" />
                    </div>
                    <h3 className="mt-4 text-xl font-black text-slate-900 dark:text-white">No listings match this filter yet.</h3>
                    <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-400">
                        Try another filter, clear the search, list a property, or post a product for the community.
                    </p>
                    <div className="mt-5 flex flex-wrap justify-center gap-3">
                        <button onClick={() => setActiveFilter('all')} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                            Show All
                        </button>
                        <button onClick={() => setSellModalOpen(true)} className="rounded-2xl bg-amber-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-amber-600">
                            Sell Product
                        </button>
                    </div>
                </Card>
            ) : null}

            <PropertyDetailsModal listing={selectedProperty} onClose={() => setSelectedProperty(null)} />
            <ProductDetailsModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />

            <Modal isOpen={sellModalOpen} onClose={() => setSellModalOpen(false)} title="Sell a Product" maxWidth="2xl">
                <form onSubmit={handleSellProduct} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="space-y-2">
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Product Name</span>
                            <input value={form.title} onChange={event => setForm(current => ({ ...current, title: event.target.value }))} required className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                        </label>
                        <label className="space-y-2">
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Category</span>
                            <input value={form.category} onChange={event => setForm(current => ({ ...current, category: event.target.value }))} required placeholder="Furniture, Appliances, Bikes..." className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                        </label>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                        <label className="space-y-2">
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Price</span>
                            <input type="number" min="0" value={form.price} onChange={event => setForm(current => ({ ...current, price: event.target.value }))} required className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                        </label>
                        <label className="space-y-2">
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Condition</span>
                            <select value={form.condition} onChange={event => setForm(current => ({ ...current, condition: event.target.value as ProductCondition }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                                <option value="new">New</option>
                                <option value="like_new">Like New</option>
                                <option value="used">Used</option>
                            </select>
                        </label>
                        <label className="space-y-2">
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Phone / WhatsApp</span>
                            <input value={form.contact_info} onChange={event => setForm(current => ({ ...current, contact_info: event.target.value }))} required className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                        </label>
                    </div>

                    <label className="space-y-2">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Location</span>
                        <input value={form.location} onChange={event => setForm(current => ({ ...current, location: event.target.value }))} placeholder="Area, landmark, pickup zone" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                    </label>

                    <label className="space-y-2">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Description</span>
                        <textarea value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} required rows={4} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                    </label>

                    <label className="space-y-2">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Image URLs</span>
                        <textarea value={form.imageUrls} onChange={event => setForm(current => ({ ...current, imageUrls: event.target.value }))} rows={3} placeholder="One image URL per line" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                    </label>

                    <div className="flex flex-wrap justify-end gap-3">
                        <button type="button" onClick={() => setSellModalOpen(false)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                            Cancel
                        </button>
                        <button type="submit" disabled={submitting} className="rounded-2xl bg-amber-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60">
                            Publish Product
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default MarketplacePage;
