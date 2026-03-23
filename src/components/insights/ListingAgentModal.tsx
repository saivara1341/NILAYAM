

import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import Modal from '../ui/Modal';
import { DetailedVacantUnit, FurnishingStatus, NewListingData, PreferredTenants } from '../../types';
import { createMarketplaceListings, updateHouse, uploadPropertyImages } from '../../services/api';
import Spinner from '../ui/Spinner';
import { CloudUploadIcon, TrashIcon, SparklesIcon } from '../../constants';

interface ListingAgentModalProps {
    isOpen: boolean;
    onClose: () => void;
    unit: DetailedVacantUnit;
    onSuccess: () => void;
}

const ListingAgentModal: React.FC<ListingAgentModalProps> = ({ isOpen, onClose, unit, onSuccess }) => {
    const [isGenerating, setIsGenerating] = useState(true);
    const [isPublishing, setIsPublishing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [aiNotice, setAiNotice] = useState<string | null>(null);
    
    // Form state
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState<number>(0);
    const [contact, setContact] = useState('');
    const [bedrooms, setBedrooms] = useState<number>(1);
    const [bathrooms, setBathrooms] = useState<number>(1);
    const [areaSqft, setAreaSqft] = useState<number>(500);
    const [furnishingStatus, setFurnishingStatus] = useState<FurnishingStatus>('unfurnished');
    const [preferredTenants, setPreferredTenants] = useState<PreferredTenants>('any');
    const [amenities, setAmenities] = useState<string[]>([]);
    const [listingImages, setListingImages] = useState<string[]>([]);
    const [imageFiles, setImageFiles] = useState<File[]>([]);

    const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const commonAmenities = ['Lift', 'Parking', 'Power Backup', 'CCTV', 'Security', 'WiFi', 'Garden', 'Clubhouse'];

    useEffect(() => {
        if (isOpen) {
            const generateDetails = async () => {
                setIsGenerating(true);
                setError(null);
                setAiNotice(null);
                try {
                    if (!geminiApiKey) {
                        throw new Error('AI key missing');
                    }
                    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
                    const details = `Property Name: ${unit.buildings?.name}, Unit: ${unit.house_number}, Type: ${unit.buildings?.property_type}, Location: ${unit.buildings?.address}. Previous rent was ${unit.rent_amount}.`;
                    const prompt = `Based on these details: "${details}", write a compelling and professional real estate rental listing description. Also, suggest a new competitive monthly rental price as a number, without any commas. Format the response as a JSON object with two keys: "description" and "suggestedPrice".`;
                    
                    // Fix: Use gemini-3-flash-preview for basic text tasks with JSON output
                    const response = await ai.models.generateContent({
                        model: 'gemini-3-flash-preview',
                        contents: prompt,
                        config: {
                          responseMimeType: "application/json",
                        }
                    });
                    
                    const jsonText = response.text?.trim() || '{}';
                    const result = JSON.parse(jsonText);
                    
                    setDescription(result.description || '');
                    setPrice(Number(result.suggestedPrice) || unit.rent_amount || 0);

                } catch (err: any) {
                    setAiNotice('AI suggestions are unavailable right now, so default values have been filled in for you.');
                    setDescription(`A well-maintained unit available for rent in ${unit.buildings?.name}. Contact us for more details.`);
                    setPrice(unit.rent_amount || 0);
                } finally {
                    setIsGenerating(false);
                }
            };
            
            generateDetails();
        } else {
            // Reset state on close
            setIsGenerating(true);
            setIsPublishing(false);
            setError(null);
            setAiNotice(null);
            setAmenities([]);
            setListingImages([]);
            setImageFiles([]);
        }
    }, [isOpen, unit, geminiApiKey]);

    const toggleAmenity = (amenity: string) => {
        setAmenities((current) => current.includes(amenity) ? current.filter((entry) => entry !== amenity) : [...current, amenity]);
    };

    const handleImageSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(event.target.files || []).filter((file) => file.type.startsWith('image/'));
        if (selectedFiles.length === 0) return;

        const previews = selectedFiles.map((file) => URL.createObjectURL(file));
        setImageFiles((current) => [...current, ...selectedFiles]);
        setListingImages((current) => [...current, ...previews]);
        event.target.value = '';
    };

    const removeImage = (index: number) => {
        const image = listingImages[index];
        if (image?.startsWith('blob:')) URL.revokeObjectURL(image);
        setListingImages((current) => current.filter((_, currentIndex) => currentIndex !== index));
        setImageFiles((current) => current.filter((_, currentIndex) => currentIndex !== index));
    };

    const handlePublish = async () => {
        setIsPublishing(true);
        setError(null);
        try {
            const uploadedImageUrls = imageFiles.length > 0 ? await uploadPropertyImages(imageFiles) : [];
            const newListing: NewListingData = {
                building_id: unit.building_id,
                house_id: unit.id,
                listing_type: 'rent',
                price: price,
                description: description,
                contact_info: contact,
                bedrooms,
                bathrooms,
                area_sqft: areaSqft,
                furnishing_status: furnishingStatus,
                preferred_tenants: preferredTenants,
                amenities,
                images: uploadedImageUrls,
                image_url: uploadedImageUrls[0] || null
            };
            await createMarketplaceListings([newListing]);
            await updateHouse(unit.id, { is_listed_on_marketplace: true });
            onSuccess();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsPublishing(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`AI Listing Agent: Unit ${unit.house_number}`}>
            {isGenerating ? (
                <div className="h-64 flex flex-col items-center justify-center">
                    <Spinner />
                    <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">AI is crafting the perfect listing...</p>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-4">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">Unit</p>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{unit.buildings?.name} • {unit.house_number}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="label">Suggested Rent (₹/month)</label>
                            <input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} className="form-input no-spinner" min="0" />
                        </div>
                        <div>
                            <label className="label">Area (sq ft)</label>
                            <input type="number" value={areaSqft} onChange={e => setAreaSqft(Number(e.target.value))} className="form-input no-spinner" min="0" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="label">Bedrooms</label>
                            <input type="number" value={bedrooms} onChange={e => setBedrooms(Number(e.target.value))} className="form-input no-spinner" min="0" />
                        </div>
                        <div>
                            <label className="label">Bathrooms</label>
                            <input type="number" value={bathrooms} onChange={e => setBathrooms(Number(e.target.value))} className="form-input no-spinner" min="0" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="label">Furnishing</label>
                            <select value={furnishingStatus} onChange={e => setFurnishingStatus(e.target.value as FurnishingStatus)} className="form-input">
                                <option value="furnished">Furnished</option>
                                <option value="semi-furnished">Semi-Furnished</option>
                                <option value="unfurnished">Unfurnished</option>
                            </select>
                        </div>
                        <div>
                            <label className="label">Preferred Tenants</label>
                            <select value={preferredTenants} onChange={e => setPreferredTenants(e.target.value as PreferredTenants)} className="form-input">
                                <option value="any">Any</option>
                                <option value="family">Family</option>
                                <option value="bachelors">Bachelors</option>
                                <option value="company">Company</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center justify-between">
                            <label className="label">Generated Description</label>
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-300">
                                <SparklesIcon className="w-3.5 h-3.5" />
                                AI assisted
                            </span>
                        </div>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={6} className="form-input" />
                    </div>
                    <div>
                        <label className="label">Contact Info</label>
                        <input type="text" value={contact} onChange={e => setContact(e.target.value)} placeholder="Your name or phone number" className="form-input" />
                    </div>
                    <div>
                        <label className="label">Amenities</label>
                        <div className="flex flex-wrap gap-2">
                            {commonAmenities.map((amenity) => (
                                <button
                                    key={amenity}
                                    type="button"
                                    onClick={() => toggleAmenity(amenity)}
                                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${amenities.includes(amenity) ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800'}`}
                                >
                                    {amenity}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center justify-between">
                            <label className="label">Listing Images</label>
                            <label htmlFor="ai-listing-images" className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300">
                                <CloudUploadIcon className="w-4 h-4" />
                                Upload Images
                            </label>
                        </div>
                        <input id="ai-listing-images" type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelection} />
                        <div className="mt-2 flex gap-2 overflow-x-auto pb-2 min-h-[5rem]">
                            {listingImages.map((url, idx) => (
                                <div key={`${url}-${idx}`} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                                    <img src={url} className="h-full w-full object-cover" alt="Listing preview" />
                                    <button type="button" onClick={() => removeImage(idx)} className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white">
                                        <TrashIcon className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                            {listingImages.length === 0 && <div className="flex min-h-[5rem] w-full items-center justify-center rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-xs text-slate-500">Upload unit images</div>}
                        </div>
                    </div>
                    {aiNotice && <p className="text-sm text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-200 p-2 rounded">{aiNotice}</p>}
                    {error && <p className="text-sm text-red-500 bg-red-100 dark:bg-red-900/30 p-2 rounded">{error}</p>}
                    <div className="flex justify-end gap-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                        <button onClick={onClose} className="btn btn-secondary">Cancel</button>
                        <button onClick={handlePublish} disabled={isPublishing || !contact} className="btn btn-primary">
                            {isPublishing ? 'Publishing...' : 'Confirm & Publish'}
                        </button>
                    </div>
                </div>
            )}
             <style>{`.label { font-weight: 600; } .no-spinner { appearance: textfield; } .no-spinner::-webkit-outer-spin-button, .no-spinner::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }`}</style>
        </Modal>
    );
};

export default ListingAgentModal;
