/**
 * Utility for sharing property details and location
 */
import { isAppShell } from './platform';

interface ShareLocationOptions {
    name: string;
    address: string;
    googleMapUrl?: string;
    coordinates?: { lat: number; lng: number };
}

interface ShareListingOptions {
    title: string;
    text: string;
    url?: string;
}

export type SocialShareTarget = 'whatsapp' | 'telegram' | 'facebook' | 'x' | 'linkedin';

const getFallbackShareUrl = () => {
    if (typeof window === 'undefined') return '';
    return window.location.href;
};

export const buildAbsoluteShareUrl = (path: string) => {
    if (typeof window === 'undefined') return path;
    const configuredOrigin = (import.meta as any).env?.VITE_PUBLIC_APP_URL?.trim?.();
    const origin = configuredOrigin ? configuredOrigin.replace(/\/$/, '') : window.location.origin;
    return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
};

export const getSocialShareLinks = (options: ShareListingOptions): Record<SocialShareTarget, string> => {
    const url = options.url || getFallbackShareUrl();
    const text = [options.title, options.text].filter(Boolean).join('\n');
    const encodedUrl = encodeURIComponent(url);
    const encodedText = encodeURIComponent(text);
    const encodedTitle = encodeURIComponent(options.title);

    return {
        whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`,
        telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
        x: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}&title=${encodedTitle}`,
    };
};

export const openSocialShare = (target: SocialShareTarget, options: ShareListingOptions) => {
    const links = getSocialShareLinks(options);
    const url = links[target];
    if (!url) return false;

    if (isAppShell()) {
        window.location.href = url;
    } else {
        window.open(url, '_blank', 'noopener,noreferrer');
    }

    return true;
};

/**
 * Shares a property's location using the Web Share API if available, 
 * otherwise copies a Google Maps link to the clipboard.
 */
export const sharePropertyLocation = async (options: ShareLocationOptions): Promise<{ success: boolean; method: 'share' | 'clipboard' | 'link' }> => {
    const { name, address, googleMapUrl, coordinates } = options;
    
    // Generate Google Maps URL
    // If coordinates are provided, use them for precise location
    // Otherwise fallback to searching for the address
    const googleMapsUrl = googleMapUrl
        || (coordinates 
            ? `https://www.google.com/maps/search/?api=1&query=${coordinates.lat},${coordinates.lng}`
            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name}, ${address}`)}`);

    const shareData = {
        title: name,
        text: `Check out this property: ${name}\nAddress: ${address}`,
        url: googleMapsUrl
    };

    try {
        // Try native sharing if available
        if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
            await navigator.share(shareData);
            return { success: true, method: 'share' };
        }
        
        // Fallback: Copy to clipboard if navigator.clipboard is available
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(`${shareData.text}\nLocation: ${googleMapsUrl}`);
            return { success: true, method: 'clipboard' };
        }

        // Ultimate fallback: Just open the link
        window.open(googleMapsUrl, '_blank');
        return { success: true, method: 'link' };

    } catch (error) {
        console.error('Error sharing location:', error);
        // If sharing fails, attempt to just open the link
        window.open(googleMapsUrl, '_blank');
        return { success: true, method: 'link' };
    }
};

export const extractPhoneNumber = (value?: string | null): string | null => {
    if (!value) return null;
    const match = value.match(/(\+?\d[\d\s-]{8,}\d)/);
    if (!match) return null;
    const normalized = match[0].replace(/\D/g, '');
    return normalized.length >= 10 ? normalized : null;
};

export const toIndianDialNumber = (value?: string | null): string | null => {
    const normalized = extractPhoneNumber(value) || (value || '').replace(/\D/g, '');
    if (!normalized) return null;
    if (normalized.length === 10) return `91${normalized}`;
    return normalized;
};

export const openWhatsAppChat = (phone?: string | null, message?: string) => {
    const dialNumber = toIndianDialNumber(phone);
    if (!dialNumber) return false;
    const suffix = message ? `?text=${encodeURIComponent(message)}` : '';
    const url = `https://wa.me/${dialNumber}${suffix}`;
    if (isAppShell()) {
        window.location.href = url;
    } else {
        window.open(url, '_blank', 'noopener,noreferrer');
    }
    return true;
};

export const openPhoneDialer = (phone?: string | null) => {
    const dialNumber = extractPhoneNumber(phone) || (phone || '').replace(/\D/g, '');
    if (!dialNumber) return false;
    window.location.href = `tel:${dialNumber}`;
    return true;
};

export const openExternalIntent = (primaryUrl?: string | null, fallbackUrl?: string | null) => {
    if (!primaryUrl || typeof window === 'undefined') return false;

    if (isAppShell()) {
        window.location.href = primaryUrl;
    } else {
        const anchor = document.createElement('a');
        anchor.href = primaryUrl;
        anchor.rel = 'noopener noreferrer';
        anchor.click();
    }

    if (fallbackUrl && fallbackUrl !== primaryUrl) {
        window.setTimeout(() => {
            if (document.visibilityState === 'visible') {
                if (isAppShell()) {
                    window.location.href = fallbackUrl;
                } else {
                    const fallback = document.createElement('a');
                    fallback.href = fallbackUrl;
                    fallback.rel = 'noopener noreferrer';
                    fallback.click();
                }
            }
        }, 700);
    }

    return true;
};

export const copyText = async (value?: string | null): Promise<boolean> => {
    if (!value || typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return false;
    await navigator.clipboard.writeText(value);
    return true;
};

export const shareListingDetails = async (options: ShareListingOptions): Promise<{ success: boolean; method: 'share' | 'clipboard' | 'link' }> => {
    const shareData = {
        title: options.title,
        text: options.text,
        url: options.url
    };

    try {
        if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
            await navigator.share(shareData);
            return { success: true, method: 'share' };
        }

        if (navigator.clipboard?.writeText) {
            const payload = [options.title, options.text, options.url].filter(Boolean).join('\n');
            await navigator.clipboard.writeText(payload);
            return { success: true, method: 'clipboard' };
        }

        if (options.url) {
            window.open(options.url, '_blank');
        }
        return { success: true, method: 'link' };
    } catch (error) {
        console.error('Error sharing listing:', error);
        if (options.url) {
            window.open(options.url, '_blank');
        }
        return { success: true, method: 'link' };
    }
};
