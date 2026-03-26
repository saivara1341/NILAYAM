import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MapPin, Package, Share2 } from 'lucide-react';
import Card from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';
import { getProductMarketplaceListingById } from '../services/api';
import { ProductListing } from '../types';
import { buildAbsoluteShareUrl, copyText, openPhoneDialer, openWhatsAppChat, shareListingDetails } from '../utils/sharing';

const currency = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
});

const PublicProductListingPage: React.FC = () => {
    const { productId } = useParams();
    const [product, setProduct] = useState<ProductListing | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            if (!productId) {
                setError('Product listing id is missing.');
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);
            try {
                const data = await getProductMarketplaceListingById(productId);
                if (!data) {
                    setError('This product listing could not be found.');
                    return;
                }
                setProduct(data);
            } catch (err: any) {
                setError(err?.message || 'Failed to load this product listing.');
            } finally {
                setLoading(false);
            }
        };

        void load();
    }, [productId]);

    if (loading) {
        return <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950"><Spinner /></div>;
    }

    if (error || !product) {
        return (
            <div className="min-h-screen bg-neutral-50 px-4 py-12 dark:bg-neutral-950">
                <div className="mx-auto max-w-3xl">
                    <Card className="rounded-[1.75rem] border border-rose-200 bg-rose-50 p-6 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                        <h1 className="text-xl font-black">Public Product Listing Unavailable</h1>
                        <p className="mt-3 text-sm leading-7">{error || 'This product listing is unavailable right now.'}</p>
                        <Link to="/" className="mt-5 inline-flex rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white dark:bg-white dark:text-slate-900">
                            Back to Nilayam
                        </Link>
                    </Card>
                </div>
            </div>
        );
    }

    const shareUrl = buildAbsoluteShareUrl(`/marketplace/products/${product.id}`);

    return (
        <div className="min-h-screen bg-neutral-50 px-4 py-8 dark:bg-neutral-950 md:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link to="/" className="text-sm font-bold text-blue-600 hover:text-blue-700 dark:text-blue-300">
                        Back to Nilayam
                    </Link>
                    <button
                        type="button"
                        onClick={() => void shareListingDetails({
                            title: product.title,
                            text: `${product.category}\n${currency.format(product.price)}`,
                            url: shareUrl
                        })}
                        className="inline-flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-200"
                    >
                        <Share2 className="h-4 w-4" />
                        Share Product
                    </button>
                </div>

                <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    {product.images?.[0] ? (
                        <img src={product.images[0]} alt={product.title} className="h-72 w-full object-cover md:h-[26rem]" />
                    ) : (
                        <div className="flex h-72 items-center justify-center bg-amber-50 text-amber-500 dark:bg-amber-500/10 dark:text-amber-300 md:h-[26rem]">
                            <Package className="h-20 w-20" />
                        </div>
                    )}

                    <div className="grid gap-8 p-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:p-8">
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <div className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
                                    {product.category}
                                </div>
                                <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white md:text-5xl">{product.title}</h1>
                                {product.location ? (
                                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                        <MapPin className="h-4 w-4" />
                                        <span>{product.location}</span>
                                    </div>
                                ) : null}
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <Card><div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Price</div><div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{currency.format(product.price)}</div></Card>
                                <Card><div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Seller</div><div className="mt-2 text-sm font-bold text-slate-900 dark:text-white">{product.seller_name}</div></Card>
                            </div>

                            <Card>
                                <h2 className="text-lg font-black text-slate-900 dark:text-white">About this product</h2>
                                <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{product.description}</p>
                            </Card>
                        </div>

                        <div className="space-y-4">
                            <Card className="space-y-4">
                                <h2 className="text-lg font-black text-slate-900 dark:text-white">Contact seller</h2>
                                <button onClick={() => openWhatsAppChat(product.contact_info, `Hi, I am interested in "${product.title}".`)} className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-600">
                                    WhatsApp Seller
                                </button>
                                <button onClick={() => openPhoneDialer(product.contact_info)} className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900">
                                    Call Seller
                                </button>
                                <button onClick={() => void copyText(product.contact_info)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                                    Copy Number
                                </button>
                                <button onClick={() => void copyText(shareUrl)} className="w-full rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-100 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-200">
                                    Copy Public Link
                                </button>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PublicProductListingPage;
