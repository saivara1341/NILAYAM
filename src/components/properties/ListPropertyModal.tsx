
import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { getVacantUnitsForProperty, createMarketplaceListings, uploadPropertyImages } from '../../services/api';
import { Property, VacantUnit, ListingType, FurnishingStatus, PreferredTenants, PossessionStatus, NewListingData } from '../../types';
import { CloudUploadIcon, BedIcon, BathIcon, SquareFootIcon, TrashIcon, SparklesIcon } from '../../constants';
import { GoogleGenAI } from "@google/genai";

interface ListPropertyModalProps {
  isOpen: boolean;
  property: Property;
  onClose: () => void;
  onSuccess: () => void;
}

const COMMON_AMENITIES = [
    '24/7 Security', 'CCTV', 'Lift', 'Power Backup', 'Gymnasium', 'Swimming Pool',
    'Clubhouse', 'Kids Play Area', 'Reserved Parking', 'Visitor Parking',
    'Water Storage', 'Vaastu Compliant', 'Intercom', 'Piped Gas', 'Pet Friendly'
];

const ListPropertyModal: React.FC<ListPropertyModalProps> = ({ isOpen, property, onClose, onSuccess }) => {
  const { profile } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1
  const [listingType, setListingType] = useState<ListingType | null>(null);
  
  // Step 2 (Rent only)
  const [vacantUnits, setVacantUnits] = useState<VacantUnit[]>([]);
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  
  // Step 3
  const [bedrooms, setBedrooms] = useState<number>(1);
  const [bathrooms, setBathrooms] = useState<number>(1);
  const [areaSqft, setAreaSqft] = useState<number>(0);
  const [furnishingStatus, setFurnishingStatus] = useState<FurnishingStatus>('unfurnished');
  const [possessionStatus, setPossessionStatus] = useState<PossessionStatus>('ready_to_move');
  const [parkingAvailable, setParkingAvailable] = useState<boolean>(true);
  
  // Step 4
  const [amenities, setAmenities] = useState<string[]>([]);
  const [preferredTenants, setPreferredTenants] = useState<PreferredTenants>('any');
  
  // Step 5
  const [price, setPrice] = useState(0);
  const [description, setDescription] = useState('');
  const [contactInfo, setContactInfo] = useState(profile?.full_name || '');
  const [listingImages, setListingImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPricing, setIsPricing] = useState(false);
  const [aiNotice, setAiNotice] = useState<string | null>(null);

  const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;

  const totalSteps = 5;

  useEffect(() => {
    if (isOpen && property) {
      if (property.images) {
          setListingImages(property.images);
      }

      const fetchUnits = async () => {
        setLoading(true);
        try {
          const units = await getVacantUnitsForProperty(property.id);
          setVacantUnits(units);
        } catch (err: any) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchUnits();
    }
  }, [isOpen, property]);

  const resetForm = () => {
    setStep(1);
    setListingType(null);
    setSelectedUnits([]);
    setPrice(0);
    setDescription('');
    setContactInfo(profile?.full_name || '');
    setListingImages([]);
    setImageFiles([]);
    setBedrooms(1);
    setBathrooms(1);
    setAreaSqft(0);
    setFurnishingStatus('unfurnished');
    setPossessionStatus('ready_to_move');
    setParkingAvailable(true);
    setAmenities([]);
    setPreferredTenants('any');
    setAiNotice(null);
    setError(null);
    setLoading(false);
  };

  const handleClose = () => {
    onClose();
    setTimeout(resetForm, 300);
  };
  
  const handleSelectUnit = (unitId: string) => {
      setSelectedUnits(prev => 
          prev.includes(unitId) ? prev.filter(id => id !== unitId) : [...prev, unitId]
      );
  };

  const handleNext = () => setStep(s => {
      if (s === 1 && listingType === 'sale') return 3; 
      return Math.min(s + 1, totalSteps);
  });
  const handleBack = () => setStep(s => {
      if (s === 3 && listingType === 'sale') return 1; 
      return Math.max(s - 1, 1)
  });
  
  const toggleAmenity = (amenity: string) => {
    setAmenities(prev => prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity]);
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
      setListingImages(listingImages.filter((_, i) => i !== index));
      setImageFiles(imageFiles.filter((_, i) => i !== index));
  };

  const generateDescription = async () => {
      setIsGenerating(true);
      try {
        if (!geminiApiKey) {
            throw new Error('AI key missing');
        }
        const ai = new GoogleGenAI({ apiKey: geminiApiKey });
        const details = `Property Name: ${property.name}, Type: ${listingType}, Location: ${property.address}, Price: ${price}, Beds: ${bedrooms}, Baths: ${bathrooms}, Area: ${areaSqft} sqft, Furnishing: ${furnishingStatus}, Amenities: ${amenities.join(', ')}.`;
        const prompt = `Write an attractive real estate listing description based on these details: ${details}. Highlight the key features and benefits.`;
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt
        });
        setDescription(response.text || '');
        setAiNotice(null);
      } catch (err) {
        setAiNotice('AI description is unavailable right now. You can continue with your own description.');
      } finally {
        setIsGenerating(false);
      }
  };

  const suggestPrice = async () => {
      setIsPricing(true);
      try {
        if (!geminiApiKey) {
            throw new Error('AI key missing');
        }
        const ai = new GoogleGenAI({ apiKey: geminiApiKey });
        const prompt = `Given a property: ${property.name}, ${property.property_type}, located at ${property.address}. It is a ${bedrooms}BHK, ${areaSqft} sqft, ${furnishingStatus}. 
        Suggest a competitive rental/sale price as a simple number only (e.g. 15000). Do not add currency symbols.`;
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt
        });
        const suggested = parseFloat(response.text?.replace(/[^0-9.]/g, '') || '0');
        if (!isNaN(suggested)) setPrice(suggested);
        setAiNotice(null);
      } catch(e) {
          setAiNotice('AI rent suggestion is unavailable right now. Please enter the rent manually.');
      } finally {
          setIsPricing(false);
      }
  }

  const handleSubmit = async () => {
      setLoading(true);
      setError(null);
      try {
          const uploadedImageUrls = imageFiles.length > 0 ? await uploadPropertyImages(imageFiles) : [];
          let listings: NewListingData[] = [];
          const sharedData = {
              price, description, contact_info: contactInfo, 
              images: uploadedImageUrls,
              image_url: uploadedImageUrls[0] || null,
              area_sqft: areaSqft, furnishing_status: furnishingStatus, amenities, parking_available: parkingAvailable,
          };

          if (listingType === 'sale') {
              listings.push({
                  ...sharedData,
                  building_id: property.id,
                  house_id: null,
                  listing_type: 'sale',
                  possession_status: possessionStatus,
              });
          } else if (listingType === 'rent') {
              listings = selectedUnits.map(unitId => ({
                  ...sharedData,
                  building_id: property.id,
                  house_id: unitId,
                  listing_type: 'rent',
                  bedrooms,
                  bathrooms,
                  preferred_tenants: preferredTenants,
              }));
          }
          await createMarketplaceListings(listings);
          onSuccess();
          handleClose();
      } catch (err: any) {
          setError(err.message);
      } finally {
          setLoading(false);
      }
  };

  const renderStep = () => {
    switch(step) {
      case 1:
        return (
          <div className="text-center">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-slate-200 mb-4">What would you like to do?</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button onClick={() => setListingType('sale')} className={`option-card ${listingType === 'sale' ? 'active' : ''}`}>
                Sell Property
                <span className="text-sm font-normal">List the entire property for sale.</span>
              </button>
              <button onClick={() => setListingType('rent')} className={`option-card ${listingType === 'rent' ? 'active' : ''}`} disabled={vacantUnits.length === 0}>
                Rent Units
                <span className="text-sm font-normal">{vacantUnits.length > 0 ? `List vacant units for rent.` : `No vacant units in this property.`}</span>
              </button>
            </div>
          </div>
        );
      case 2:
        return (
            <div>
              <h3 className="text-lg font-semibold text-blue-900 dark:text-slate-200 mb-4">Select units to list for rent ({selectedUnits.length} selected)</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {vacantUnits.map(unit => (
                    <label key={unit.id} className={`flex items-center p-3 border rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 ${selectedUnits.includes(unit.id) ? 'bg-blue-50 dark:bg-blue-900/50 border-blue-500' : 'border-slate-300 dark:border-slate-600'}`}>
                        <input type="checkbox" checked={selectedUnits.includes(unit.id)} onChange={() => handleSelectUnit(unit.id)} className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"/>
                        <span className="ml-3 text-sm font-medium text-slate-700 dark:text-slate-300">Unit {unit.house_number}</span>
                    </label>
                ))}
              </div>
            </div>
        );
      case 3:
        return (
          <div>
            <h3 className="text-lg font-semibold text-blue-900 dark:text-slate-200 mb-4">Property Details</h3>
            <div className="space-y-4">
                {listingType === 'rent' && (
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="label">Bedrooms</label><input type="number" value={bedrooms} onChange={e => setBedrooms(Number(e.target.value))} min="1" className="input no-spinner"/></div>
                        <div><label className="label">Bathrooms</label><input type="number" value={bathrooms} onChange={e => setBathrooms(Number(e.target.value))} min="1" className="input no-spinner"/></div>
                    </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="label">Area (sq. ft.)</label><input type="number" value={areaSqft} onChange={e => setAreaSqft(Number(e.target.value))} min="0" className="input no-spinner"/></div>
                    <div><label className="label">Furnishing</label><select value={furnishingStatus} onChange={e => setFurnishingStatus(e.target.value as FurnishingStatus)} className="input"><option value="furnished">Furnished</option><option value="semi-furnished">Semi-Furnished</option><option value="unfurnished">Unfurnished</option></select></div>
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    {listingType === 'sale' && (
                        <div><label className="label">Possession</label><select value={possessionStatus} onChange={e => setPossessionStatus(e.target.value as PossessionStatus)} className="input"><option value="ready_to_move">Ready to Move</option><option value="under_construction">Under Construction</option></select></div>
                    )}
                    <div><label className="label">Parking</label><select value={String(parkingAvailable)} onChange={e => setParkingAvailable(e.target.value === 'true')} className="input"><option value="true">Available</option><option value="false">Not Available</option></select></div>
                </div>
            </div>
          </div>
        );
      case 4:
        return (
            <div>
                 <h3 className="text-lg font-semibold text-blue-900 dark:text-slate-200 mb-4">Amenities & Preferences</h3>
                 <div className="flex flex-wrap gap-2">
                     {COMMON_AMENITIES.map(amenity => (
                         <button key={amenity} onClick={() => toggleAmenity(amenity)} className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${amenities.includes(amenity) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-600'}`}>
                             {amenity}
                         </button>
                     ))}
                 </div>
                 {listingType === 'rent' && (
                     <div className="mt-4">
                         <label className="label">Preferred Tenants</label>
                         <select value={preferredTenants} onChange={e => setPreferredTenants(e.target.value as PreferredTenants)} className="input">
                             <option value="any">Any</option>
                             <option value="family">Family</option>
                             <option value="bachelors">Bachelors</option>
                             <option value="company">Company</option>
                         </select>
                     </div>
                 )}
            </div>
        );
      case 5:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-slate-200">
              {listingType === 'sale' ? 'Pricing & Contact' : `Rental Price & Contact`}
            </h3>
            <div>
              <div className="flex justify-between items-center">
                  <label className="label">{listingType === 'sale' ? 'Selling Price (₹)' : 'Monthly Rent (₹)'}</label>
                  <button type="button" onClick={suggestPrice} disabled={isPricing} className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1">
                      <SparklesIcon className="w-3 h-3" /> {isPricing ? 'Calculating...' : 'Suggest Price'}
                  </button>
              </div>
              <input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} className="input no-spinner" required min="0"/>
            </div>
            <div>
                <div className="flex justify-between items-center">
                    <label className="label">Description</label>
                    <button type="button" onClick={generateDescription} disabled={isGenerating} className="text-xs text-blue-600 font-semibold hover:underline disabled:opacity-50">
                        {isGenerating ? 'Generating...' : 'Generate with AI'}
                    </button>
                </div>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="input" placeholder="Add a compelling description..." required/>
            </div>
            <div>
                <label className="label">Contact Information</label>
                <input type="text" value={contactInfo} onChange={e => setContactInfo(e.target.value)} className="input" placeholder="Name or Phone" required/>
            </div>
            <div>
              <label className="label">Listing Images</label>
              <label htmlFor="listing-image-upload" className="mb-2 inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300">
                  <CloudUploadIcon className="w-4 h-4" />
                  Upload Images
              </label>
              <input id="listing-image-upload" type="file" accept="image/*" multiple onChange={handleImageSelection} className="hidden" />
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide min-h-[5rem]">
                  {listingImages.map((url, idx) => (
                      <div key={idx} className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 group">
                          <img src={url} className="w-full h-full object-cover" alt="Property" />
                          <button type="button" onClick={() => removeImage(idx)} className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl-lg opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon className="w-3 h-3"/></button>
                      </div>
                  ))}
                  {listingImages.length === 0 && <div className="flex w-full items-center justify-center rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-xs text-slate-500">Upload listing images</div>}
              </div>
            </div>
            {aiNotice && <p className="text-sm text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-200 p-2 rounded">{aiNotice}</p>}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`List Property: ${property.name}`} maxWidth="2xl">
      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-2">
            {[...Array(totalSteps)].map((_, i) => (
                <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i + 1 <= step ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`} />
            ))}
        </div>

        <div className="min-h-[300px]">
          {renderStep()}
        </div>

        {error && <p className="text-sm text-red-500 bg-red-100 dark:bg-red-900/30 p-2 rounded text-center">{error}</p>}

        <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-700">
          <button type="button" onClick={handleBack} disabled={step === 1 || loading} className="btn btn-secondary">Back</button>
          {step < totalSteps ? (
            <button type="button" onClick={handleNext} disabled={step === 1 && !listingType} className="btn btn-primary">Next</button>
          ) : (
            <button type="button" onClick={handleSubmit} disabled={loading || !price || !description || !contactInfo} className="btn btn-primary">
              {loading ? 'Publishing...' : 'Publish Listing'}
            </button>
          )}
        </div>
      </div>
      <style>{`.option-card { padding: 1rem; border-width: 2px; border-color: #e2e8f0; border-radius: 0.75rem; text-align: left; transition-property: all; transition-duration: 200ms; font-weight: 700; color: #1e3a8a; display: flex; flex-direction: column; gap: 0.25rem; } .dark .option-card { border-color: #334155; color: #e2e8f0; } .option-card:hover { border-color: #3b82f6; background-color: #f8fafc; } .dark .option-card:hover { background-color: #1e293b; } .option-card.active { border-color: #2563eb; background-color: #eff6ff; color: #1d4ed8; } .dark .option-card.active { background-color: rgba(30, 58, 138, 0.2); color: #93c5fd; } .option-card:disabled { opacity: 0.5; cursor: not-allowed; filter: grayscale(1); } .label { display: block; font-size: 0.875rem; font-weight: 500; color: #4b5563; margin-bottom: 0.25rem; } .dark .label { color: #9ca3af; } .input { display: block; width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem; background-color: white; color: #172554; } .dark .input { border-color: #4b5563; background-color: #334155; color: #e5e7eb; } .input:focus { outline: 2px solid transparent; outline-offset: 2px; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5); border-color: #3b82f6; } .no-spinner { appearance: textfield; } .no-spinner::-webkit-inner-spin-button, .no-spinner::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }`}</style>
    </Modal>
  );
};

export default ListPropertyModal;
