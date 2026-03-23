/**
 * Utility for sharing property details and location
 */

interface ShareLocationOptions {
    name: string;
    address: string;
    googleMapUrl?: string;
    coordinates?: { lat: number; lng: number };
}

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
