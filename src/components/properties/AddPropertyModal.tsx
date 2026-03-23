
import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../ui/Modal';
import { createPropertyWithUnits, uploadPropertyImages } from '../../services/api';
import { PropertyType, Property, UnitData, BuildingData, CommunityFeatures } from '../../types';
import { PROPERTY_TYPE_CATEGORIES, formatPropertyType, UsersIcon, CloudUploadIcon, TrashIcon, ZapIcon, BuildingIcon, SquareFootIcon, LayersIcon, HomeIcon, CameraIcon } from '../../constants';

interface AddPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newProperty: Property) => void;
}

const OTHER_PROPERTY_OPTION = '__OTHER__';

const getFallbackTypeForCategory = (category: string): PropertyType => {
    switch (category) {
        case 'Commercial':
            return PropertyType.OFFICE_BUILDING;
        case 'Industrial':
            return PropertyType.WAREHOUSE;
        case 'Institutional':
            return PropertyType.SCHOOL_CAMPUS;
        case 'Hospitality':
            return PropertyType.SERVICED_APARTMENT;
        case 'Land':
            return PropertyType.RESIDENTIAL_PLOT;
        case 'Residential':
        default:
            return PropertyType.STANDALONE_BUILDING;
    }
};

// Helper to determine structure mode
const getStructureMode = (type: PropertyType) => {
    const complexTypes = [
        PropertyType.APARTMENT_COMPLEX,
        PropertyType.GATED_COMMUNITY_VILLA,
        PropertyType.SHOPPING_MALL,
        PropertyType.MIXED_USE_COMPLEX,
        PropertyType.OFFICE_BUILDING,
        PropertyType.HOSPITAL_COMPLEX,
        PropertyType.UNIVERSITY_CAMPUS
    ];
    
    const landTypes = [
        PropertyType.AGRICULTURAL_LAND,
        PropertyType.COMMERCIAL_PLOT,
        PropertyType.RESIDENTIAL_PLOT
    ];

    if (landTypes.includes(type)) return 'land';
    if (complexTypes.includes(type)) return 'complex';
    return 'structure'; // Independent houses, PGs, Standalone buildings
};

const COMMON_AMENITIES_OPTIONS = [
    "Parking", "Lift", "Power Backup", "Gym", "Swimming Pool", 
    "Security", "Garden", "Club House", "WiFi", "CCTV"
];

const PORTION_TYPE_OPTIONS = [
    '1RK',
    '1BHK',
    '2BHK',
    '3BHK',
    '4BHK',
    'Studio',
    'Penthouse',
    'Duplex',
    'Villa',
    'Office',
    'Shop',
    'Warehouse',
];

const parseUnitLabel = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return { portionType: '', portionNumber: '' };
    const parts = trimmed.split(/\s*-\s*/);
    if (parts.length >= 2) {
        return {
            portionType: parts.slice(0, -1).join(' - ').trim(),
            portionNumber: parts[parts.length - 1].trim()
        };
    }
    return { portionType: '', portionNumber: trimmed };
};

const buildUnitLabel = (portionType: string, portionNumber: string, fallback: string) => {
    const type = portionType.trim();
    const number = portionNumber.trim();
    if (type && number) return `${type} - ${number}`;
    if (type) return type;
    if (number) return number;
    return fallback;
};

const STEP_DETAILS = [
    { id: 1, label: 'Type', helper: 'Choose category' },
    { id: 2, label: 'Structure', helper: 'Set floors and units' },
    { id: 3, label: 'Details', helper: 'Add media and address' },
    { id: 4, label: 'Community', helper: 'Enable resident tools' },
] as const;

const buildFloorLabels = (totalFloors: number, includeGroundFloor: boolean) => {
    if (totalFloors <= 0) return [];
    if (includeGroundFloor) {
        return Array.from({ length: totalFloors }, (_value, index) => (index === 0 ? 'Ground' : `Floor ${index}`));
    }
    return Array.from({ length: totalFloors }, (_value, index) => `Floor ${index + 1}`);
};

const AddPropertyModal: React.FC<AddPropertyModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Step 1: Classification ---
  const [propertyCategory, setPropertyCategory] = useState<string>('Residential');
  const [propertyType, setPropertyType] = useState<PropertyType>(PropertyType.INDEPENDENT_HOUSE);
  const [isOtherPropertyType, setIsOtherPropertyType] = useState(false);
  const [customPropertyType, setCustomPropertyType] = useState('');
  
  // --- Step 2: Structure ---
  // Complex Mode
  const [numBlocks, setNumBlocks] = useState<number | string>(1);
  const [blockNaming, setBlockNaming] = useState<'Alphabet' | 'Numeric'>('Alphabet'); 
  // Structure Mode (House/Building)
  const [numFloors, setNumFloors] = useState<number | string>(1);
  const [unitsPerFloor, setUnitsPerFloor] = useState<number | string>(1);
  const [includeGroundFloor, setIncludeGroundFloor] = useState(true);
  const [customizeFloorPortions, setCustomizeFloorPortions] = useState(false);
  const [floorPortions, setFloorPortions] = useState<number[]>([1]);
  const [portionLabels, setPortionLabels] = useState<string[][]>([['']]);
  const [portionTypes, setPortionTypes] = useState<string[][]>([['']]);
  const [portionNumbers, setPortionNumbers] = useState<string[][]>([['']]);
  // Independent House Mode
  const [isSingleUnit, setIsSingleUnit] = useState(true);

  // Land Mode
  const [plotArea, setPlotArea] = useState<number | string>('');
  const [surveyNumber, setSurveyNumber] = useState('');
  
  // Defaults
  const [defaultRent, setDefaultRent] = useState<number | string>('');
  const [defaultSecurityDeposit, setDefaultSecurityDeposit] = useState<number | string>('');
  const [defaultParking, setDefaultParking] = useState('None');

  // --- Step 3: Identity & Media ---
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [cctvUrl, setCctvUrl] = useState('');
  const [amenitiesList, setAmenitiesList] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [googleMapUrl, setGoogleMapUrl] = useState('');
  const [threedModelUrl, setThreedModelUrl] = useState('');
  const [panoramaUrl, setPanoramaUrl] = useState('');

  // --- Step 4: Community ---
  const [communityFeatures, setCommunityFeatures] = useState<CommunityFeatures>({
      enable_chat: true,
      enable_polls: true,
      enable_gate_pass: true,
      enable_amenities: true
  });

  // Derived State
  const mode = useMemo(() => getStructureMode(propertyType), [propertyType]);
  const stepperInputClass = "flex-1 min-w-0 bg-transparent text-center font-bold text-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";
  const numericInputClass = "input text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";
  const selectInputClass = "input bg-white text-slate-900 dark:bg-neutral-900 dark:text-white";
  const mutedLabelClass = "text-sm font-bold text-slate-800 dark:text-slate-200";
  const helperTextClass = "text-xs text-slate-600 dark:text-slate-400";
  const preventWheelIncrement = (event: React.WheelEvent<HTMLInputElement>) => {
      event.currentTarget.blur();
  };

  // Reset when type changes to avoid invalid states
  useEffect(() => {
      if (mode === 'land') {
          setCommunityFeatures(prev => ({ ...prev, enable_gate_pass: false, enable_amenities: false }));
      } else {
          setCommunityFeatures({ enable_chat: true, enable_polls: true, enable_gate_pass: true, enable_amenities: true });
      }
      // Default single unit for independent house
      if (propertyType === PropertyType.INDEPENDENT_HOUSE) {
          setIsSingleUnit(true);
      } else {
          setIsSingleUnit(false);
      }
  }, [mode, propertyType]);

  useEffect(() => {
      return () => {
          images.forEach((imageUrl) => {
              if (imageUrl.startsWith('blob:')) {
                  URL.revokeObjectURL(imageUrl);
              }
          });
      };
  }, [images]);

  const resetForm = () => {
    images.forEach((imageUrl) => {
        if (imageUrl.startsWith('blob:')) {
            URL.revokeObjectURL(imageUrl);
        }
    });
    setStep(1);
    setPropertyCategory('Residential');
    setPropertyType(PropertyType.INDEPENDENT_HOUSE);
    setIsOtherPropertyType(false);
    setCustomPropertyType('');
    setNumBlocks(1);
    setNumFloors(1);
    setUnitsPerFloor(1);
    setIncludeGroundFloor(true);
    setCustomizeFloorPortions(false);
    setFloorPortions([1]);
    setPortionLabels([['']]);
    setPortionTypes([['']]);
    setPortionNumbers([['']]);
    setIsSingleUnit(true);
    setPlotArea('');
    setSurveyNumber('');
    setDefaultRent('');
    setDefaultSecurityDeposit('');
    setName('');
    setAddress('');
    setCctvUrl('');
    setAmenitiesList([]);
    setImages([]);
    setImageFiles([]);
    setGoogleMapUrl('');
    setThreedModelUrl('');
    setPanoramaUrl('');
    setError(null);
  };
  
  const handleClose = () => {
      onClose();
      setTimeout(resetForm, 300);
  };

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  useEffect(() => {
      const totalFloors = Math.max(1, Number(numFloors) || 1);
      setFloorPortions((prev) => {
          const next = Array.from({ length: totalFloors }, (_value, index) => prev[index] ?? Math.max(1, Number(unitsPerFloor) || 1));
          return next;
      });
  }, [numFloors, unitsPerFloor]);

  useEffect(() => {
      if (mode === 'land') {
          setPortionLabels([]);
          setPortionTypes([]);
          setPortionNumbers([]);
          return;
      }

      const totalFloors = Math.max(1, Number(numFloors) || 1);
      const labels = Array.from({ length: totalFloors }, (_value, floorIndex) => {
          const unitsForFloor = (propertyType === PropertyType.INDEPENDENT_HOUSE && isSingleUnit)
              ? (floorIndex === 0 ? 1 : 0)
              : (customizeFloorPortions
                  ? Math.max(1, Number(floorPortions[floorIndex] || 1))
                  : Math.max(1, Number(unitsPerFloor) || 1));

          return Array.from({ length: unitsForFloor }, (_unitValue, unitIndex) => portionLabels[floorIndex]?.[unitIndex] ?? '');
      });

      setPortionLabels(labels);
      setPortionTypes((current) =>
          labels.map((floorLabels, floorIndex) =>
              floorLabels.map((_label, unitIndex) => current[floorIndex]?.[unitIndex] ?? parseUnitLabel(labels[floorIndex]?.[unitIndex] ?? '').portionType)
          )
      );
      setPortionNumbers((current) =>
          labels.map((floorLabels, floorIndex) =>
              floorLabels.map((_label, unitIndex) => current[floorIndex]?.[unitIndex] ?? parseUnitLabel(labels[floorIndex]?.[unitIndex] ?? '').portionNumber)
          )
      );
  }, [mode, numFloors, unitsPerFloor, customizeFloorPortions, floorPortions, propertyType, isSingleUnit]);

  const updatePortionLabel = (floorIndex: number, unitIndex: number, value: string) => {
      setPortionLabels((current) =>
          current.map((floorLabels, currentFloorIndex) =>
              currentFloorIndex === floorIndex
                  ? floorLabels.map((label, currentUnitIndex) => currentUnitIndex === unitIndex ? value : label)
                  : floorLabels
          )
      );
  };

  const updatePortionMatrix = (
      setter: React.Dispatch<React.SetStateAction<string[][]>>,
      floorIndex: number,
      unitIndex: number,
      value: string
  ) => {
      setter((current) =>
          current.map((floorLabels, currentFloorIndex) =>
              currentFloorIndex === floorIndex
                  ? floorLabels.map((label, currentUnitIndex) => currentUnitIndex === unitIndex ? value : label)
                  : floorLabels
          )
      );
  };

  const toggleAmenity = (amenity: string) => {
      setAmenitiesList(prev => prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity]);
  };

  const handleImageSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(event.target.files || []);
      if (selectedFiles.length === 0) return;

      const imageOnlyFiles = selectedFiles.filter(file => file.type.startsWith('image/'));
      if (imageOnlyFiles.length !== selectedFiles.length) {
          setError('Only image files can be uploaded for property images.');
      } else {
          setError(null);
      }
      const previewUrls = imageOnlyFiles.map(file => URL.createObjectURL(file));

      setImageFiles(prev => [...prev, ...imageOnlyFiles]);
      setImages(prev => [...prev, ...previewUrls]);
      event.target.value = '';
  };

  const removeImage = (index: number) => {
      const imageUrlToRemove = images[index];
      if (imageUrlToRemove?.startsWith('blob:')) {
          URL.revokeObjectURL(imageUrlToRemove);
      }
      setImages(images.filter((_, i) => i !== index));
      setImageFiles(imageFiles.filter((_, i) => i !== index));
  };

  const toggleFeature = (key: keyof CommunityFeatures) => {
      setCommunityFeatures(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // --- Logic to Generate Units Payload ---
  const generateUnitsPayload = (): UnitData[] => {
      const generatedUnits: UnitData[] = [];
      const rent = Number(defaultRent) || 0;
      const deposit = Number(defaultSecurityDeposit) || 0;

      if (mode === 'land') {
          // For land, we create 1 "unit" representing the whole plot
          generatedUnits.push({
              house_number: surveyNumber || 'Plot-1',
              rent_amount: rent,
              security_deposit: deposit,
              parking_slot: ''
          });
          return generatedUnits;
      }

      const nFloors = Number(numFloors) || 1;
      const floorLabels = buildFloorLabels(nFloors, includeGroundFloor);
      const nBlocks = mode === 'complex' ? (Number(numBlocks) || 1) : 1;

      if (propertyType === PropertyType.INDEPENDENT_HOUSE && isSingleUnit) {
          const fallbackLabel = name ? `${name}-Main` : 'Main House';
          const houseNumber = buildUnitLabel(portionTypes[0]?.[0] || '', portionNumbers[0]?.[0] || '', portionLabels[0]?.[0]?.trim() || fallbackLabel);
          generatedUnits.push({
              house_number: houseNumber,
              rent_amount: rent,
              security_deposit: deposit,
              parking_slot: defaultParking === 'Same as Unit' ? houseNumber : ''
          });
          return generatedUnits;
      }

      const generateFloorUnits = (prefix: string) => {
          for (let floor = 0; floor < nFloors; floor++) {
              const floorLabel = floorLabels[floor];
              const floorCode = includeGroundFloor
                  ? (floor === 0 ? 'G' : floor.toString())
                  : (floor + 1).toString();
              const floorUnits = customizeFloorPortions ? Math.max(1, Number(floorPortions[floor] || 1)) : (Number(unitsPerFloor) || 1);
              
              for (let unit = 1; unit <= floorUnits; unit++) {
                  // Unit naming logic
                  let houseNumber;
                  const manualLabel = portionLabels[floor]?.[unit - 1]?.trim();
                  const unitSuffix = unit.toString().padStart(2, '0');
                  const fallbackNumber = `${prefix}${floorCode}${unitSuffix}`;
                  const structuredLabel = buildUnitLabel(
                      portionTypes[floor]?.[unit - 1] || '',
                      portionNumbers[floor]?.[unit - 1] || '',
                      manualLabel || fallbackNumber
                  );

                  if (structuredLabel) {
                      houseNumber = structuredLabel;
                  } else if (nFloors === 1 && floorUnits === 1) {
                      houseNumber = prefix ? `${prefix}Main` : 'Main'; // Single unit house
                  } else {
                      // Standard: 101, 102... or G01, G02
                      houseNumber = `${prefix}${floorCode}${unitSuffix}`;
                  }

                  const parking = defaultParking === 'Same as Unit' ? houseNumber : '';
                  
                  generatedUnits.push({
                      house_number: houseNumber,
                      rent_amount: rent,
                      security_deposit: deposit,
                      parking_slot: parking
                  });
              }
          }
      };

      if (mode === 'complex') {
          for (let b = 0; b < nBlocks; b++) {
              const blockName = blockNaming === 'Alphabet' 
                  ? String.fromCharCode(65 + b) // A, B, C...
                  : (b + 1).toString(); // 1, 2, 3...
              generateFloorUnits(`${blockName}-`);
          }
      } else {
          generateFloorUnits(''); 
      }

      return generatedUnits;
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
        const uploadedImageUrls = imageFiles.length > 0 ? await uploadPropertyImages(imageFiles) : [];
        const buildingData: BuildingData = { 
            name, 
            address, 
            property_type: propertyType, 
            cctv_url: cctvUrl, 
            community_features: communityFeatures,
            images: uploadedImageUrls,
            google_map_url: googleMapUrl || undefined,
            threed_model_url: threedModelUrl,
            panorama_url: panoramaUrl
        };
        
        const units = generateUnitsPayload();

        const newProperty = await createPropertyWithUnits(buildingData, units);
        onSuccess(newProperty);
        handleClose();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const isNextDisabled = () => {
      if (step === 2) {
          if (mode === 'land') {
              return !plotArea || !surveyNumber;
          }
          if (customizeFloorPortions && floorPortions.some((count) => !count || count <= 0)) {
              return true;
          }
          if (mode === 'complex') {
              return !numBlocks || Number(numBlocks) <= 0 || !numFloors || Number(numFloors) <= 0 || (!customizeFloorPortions && (!unitsPerFloor || Number(unitsPerFloor) <= 0));
          }
          if (mode === 'structure') {
              if (propertyType === PropertyType.INDEPENDENT_HOUSE && isSingleUnit) {
                  return !numFloors || Number(numFloors) <= 0;
              }
              return !numFloors || Number(numFloors) <= 0 || (!customizeFloorPortions && (!unitsPerFloor || Number(unitsPerFloor) <= 0));
          }
      }
      if (step === 3) {
          return !name || !address;
      }
      if (step === 1 && isOtherPropertyType) {
          return !customPropertyType.trim();
      }
      return false;
  };

  // --- Step Renders ---

  const renderStep1_Classification = () => (
      <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.keys(PROPERTY_TYPE_CATEGORIES).map((category) => (
                  <button
                      key={category}
                      onClick={() => {
                          setPropertyCategory(category);
                          setIsOtherPropertyType(false);
                          setCustomPropertyType('');
                          setPropertyType(PROPERTY_TYPE_CATEGORIES[category as keyof typeof PROPERTY_TYPE_CATEGORIES][0]);
                      }}
                      className={`min-h-[56px] p-3 rounded-2xl border text-sm font-semibold transition-all ${
                          propertyCategory === category 
                          ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-500' 
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                  >
                      {category}
                  </button>
              ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
              {PROPERTY_TYPE_CATEGORIES[propertyCategory as keyof typeof PROPERTY_TYPE_CATEGORIES]?.map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                        setIsOtherPropertyType(false);
                        setCustomPropertyType('');
                        setPropertyType(type);
                    }}
                    className={`min-h-[64px] p-3 rounded-2xl border text-xs font-semibold transition-all text-center leading-5 ${
                        propertyType === type && !isOtherPropertyType
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                      {formatPropertyType(type)}
                  </button>
              ))}
              <button
                type="button"
                onClick={() => {
                    setIsOtherPropertyType(true);
                    setPropertyType(getFallbackTypeForCategory(propertyCategory));
                }}
                className={`min-h-[64px] p-3 rounded-2xl border text-xs font-semibold transition-all text-center ${
                    isOtherPropertyType
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                  Other
              </button>
          </div>

          {isOtherPropertyType && (
              <div className="mt-4 space-y-2 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 dark:border-indigo-900/40 dark:bg-indigo-900/10">
                  <label className="label">Custom Property Type</label>
                  <input
                      type="text"
                      value={customPropertyType}
                      onChange={(e) => setCustomPropertyType(e.target.value)}
                      className="input"
                      placeholder="e.g. Co-living Space, Banquet Hall, Farm Stay"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                      We&apos;ll keep your custom label in the setup flow and save it under the closest supported category for compatibility.
                  </p>
              </div>
          )}

          <div className="mt-4 p-4 bg-slate-50 dark:bg-neutral-800/80 rounded-2xl border border-slate-200 dark:border-neutral-700 text-sm text-slate-600 dark:text-slate-400 flex gap-4 items-center">
              <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl shadow-sm">
                  {mode === 'complex' && <BuildingIcon className="w-5 h-5 text-blue-500" />}
                  {mode === 'structure' && <HomeIcon className="w-5 h-5 text-green-500" />}
                  {mode === 'land' && <LayersIcon className="w-5 h-5 text-amber-500" />}
              </div>
              <div>
                  <span className="font-bold text-slate-900 dark:text-white block">
                      {isOtherPropertyType ? `${customPropertyType.trim() || 'Custom Property'} Setup` : (
                        <>
                          {mode === 'complex' && "Complex Structure Detection"}
                          {mode === 'structure' && "Building Structure Detection"}
                          {mode === 'land' && "Land/Plot Detection"}
                        </>
                      )}
                  </span>
                  <p className="text-xs opacity-80 mt-1">
                      {isOtherPropertyType
                        ? `Custom label: ${customPropertyType.trim() || 'Enter your own type name'}`
                        : (
                          <>
                            {mode === 'complex' && "Ideal for apartments or multi-block estates."}
                            {mode === 'structure' && "Perfect for individual buildings or independent houses."}
                            {mode === 'land' && "Specify plot details and dimensions."}
                          </>
                        )}
                  </p>
              </div>
          </div>
      </div>
  );

  const renderStep2_Structure = () => (
      <div className="space-y-6 animate-fade-in">
          <h4 className="font-semibold text-blue-900 dark:text-slate-200 flex items-center gap-2">
              <ZapIcon className="w-5 h-5 text-yellow-500" />
              Configure {mode === 'land' ? 'Dimensions' : 'Structure'}
          </h4>

          {/* Land Inputs */}
          {mode === 'land' && (
              <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="label">Plot Area</label>
                      <div className="relative">
                          <input type="number" value={plotArea} onChange={e => setPlotArea(e.target.value)} onWheel={preventWheelIncrement} className={`${numericInputClass} pr-12`} placeholder="e.g. 2400" />
                          <span className="absolute right-3 top-2.5 text-xs font-medium text-slate-500 dark:text-slate-400">Sq.Ft</span>
                      </div>
                  </div>
                  <div>
                      <label className="label">Survey Number</label>
                      <input type="text" value={surveyNumber} onChange={e => setSurveyNumber(e.target.value)} className="input" placeholder="e.g. 123/B" />
                  </div>
              </div>
          )}

          {/* Complex Inputs */}
          {mode === 'complex' && (
              <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-800 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="label">Total Blocks</label>
                          <div className="flex items-center gap-4 bg-white dark:bg-neutral-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                              <button
                                  type="button"
                                  onClick={() => setNumBlocks(Math.max(1, Number(numBlocks) - 1))}
                                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-neutral-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 active:scale-95 transition-all text-xl font-bold"
                              >-</button>
                              <input type="number" value={numBlocks} onChange={e => setNumBlocks(e.target.value)} onWheel={preventWheelIncrement} className={stepperInputClass} min="1" />
                              <button
                                  type="button"
                                  onClick={() => setNumBlocks(Number(numBlocks) + 1)}
                                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-all text-xl font-bold"
                              >+</button>
                          </div>
                      </div>
                      <div>
                          <label className="label">Block Naming</label>
                          <select value={blockNaming} onChange={e => setBlockNaming(e.target.value as any)} className="input">
                              <option value="Alphabet">A, B, C...</option>
                              <option value="Numeric">1, 2, 3...</option>
                          </select>
                      </div>
                  </div>
              </div>
          )}

          {/* Building/Floor Inputs (Shared by Complex and Structure) */}
          {mode !== 'land' && (
              <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-neutral-800/50 p-4">
                          <p className="text-sm font-bold text-slate-900 dark:text-white">Floor Counting</p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              Tell us whether the total floor count includes the ground floor.
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                  type="button"
                                  onClick={() => setIncludeGroundFloor(true)}
                                  className={`px-3 py-2 rounded-xl text-sm font-semibold border transition ${
                                      includeGroundFloor
                                          ? 'border-blue-600 bg-blue-600 text-white'
                                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                                  }`}
                              >
                                  Include Ground
                              </button>
                              <button
                                  type="button"
                                  onClick={() => setIncludeGroundFloor(false)}
                                  className={`px-3 py-2 rounded-xl text-sm font-semibold border transition ${
                                      !includeGroundFloor
                                          ? 'border-blue-600 bg-blue-600 text-white'
                                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                                  }`}
                              >
                                  Upper Floors Only
                              </button>
                          </div>
                      </div>

                      {(propertyType !== PropertyType.INDEPENDENT_HOUSE || !isSingleUnit) && (
                          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-neutral-800/50 p-4">
                              <p className="text-sm font-bold text-slate-900 dark:text-white">Portion Planning</p>
                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                  Use one shared count for all floors, or switch to floor-by-floor customization.
                              </p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                  <button
                                      type="button"
                                      onClick={() => setCustomizeFloorPortions(false)}
                                      className={`px-3 py-2 rounded-xl text-sm font-semibold border transition ${
                                          !customizeFloorPortions
                                              ? 'border-blue-600 bg-blue-600 text-white'
                                              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                                      }`}
                                  >
                                      Same On Every Floor
                                  </button>
                                  <button
                                      type="button"
                                      onClick={() => setCustomizeFloorPortions(true)}
                                      className={`px-3 py-2 rounded-xl text-sm font-semibold border transition ${
                                          customizeFloorPortions
                                              ? 'border-blue-600 bg-blue-600 text-white'
                                              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                                      }`}
                                  >
                                      Customize Each Floor
                                  </button>
                              </div>
                          </div>
                      )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-3">
                      <label className={mutedLabelClass}>
                          Total Floors {mode === 'complex' ? '(per Block)' : ''}
                      </label>
                      <p className={helperTextClass}>
                          {includeGroundFloor
                              ? `${numFloors} floor(s) total including ground`
                              : `${numFloors} upper floor(s), ground excluded`}
                      </p>
                      <div className="flex items-center gap-4 bg-white dark:bg-neutral-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                          <button 
                            type="button"
                            onClick={() => setNumFloors(Math.max(1, Number(numFloors) - 1))}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-neutral-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 active:scale-95 transition-all text-xl font-bold"
                          >-</button>
                          <input
                            type="number"
                            value={numFloors}
                            onChange={e => setNumFloors(e.target.value)}
                            onWheel={preventWheelIncrement}
                            className={stepperInputClass}
                            min="1"
                          />
                          <button 
                            type="button"
                            onClick={() => setNumFloors(Number(numFloors) + 1)}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-all text-xl font-bold"
                          >+</button>
                      </div>
                  </div>
                  {(propertyType !== PropertyType.INDEPENDENT_HOUSE || !isSingleUnit) && !customizeFloorPortions && (
                    <div className="space-y-3">
                        <label className={mutedLabelClass}>{propertyType === PropertyType.PG_HOSTEL ? 'Rooms per Floor' : 'Units per Floor'}</label>
                        <div className="flex items-center gap-4 bg-white dark:bg-neutral-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <button 
                                type="button"
                                onClick={() => setUnitsPerFloor(Math.max(1, Number(unitsPerFloor) - 1))}
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-neutral-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 active:scale-95 transition-all text-xl font-bold"
                            >-</button>
                            <input
                                type="number"
                                value={unitsPerFloor}
                                onChange={e => setUnitsPerFloor(e.target.value)}
                                onWheel={preventWheelIncrement}
                                className={stepperInputClass}
                                min="1"
                            />
                            <button 
                                type="button"
                                onClick={() => setUnitsPerFloor(Number(unitsPerFloor) + 1)}
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-all text-xl font-bold"
                            >+</button>
                        </div>
                    </div>
                  )}
              </div>
              {customizeFloorPortions && (propertyType !== PropertyType.INDEPENDENT_HOUSE || !isSingleUnit) && (
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-neutral-900 p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-3 mb-4">
                          <div>
                              <p className="text-sm font-bold text-slate-900 dark:text-white">Customize Portions for Each Floor</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">Useful when different floors have different unit counts.</p>
                          </div>
                          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                              {mode === 'complex' ? 'Applied per block' : 'Applied once'}
                          </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {buildFloorLabels(Math.max(1, Number(numFloors) || 1), includeGroundFloor).map((floorLabel, index) => (
                              <div key={floorLabel} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-neutral-800/60 p-3">
                                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-2">{floorLabel}</label>
                                  <div className="flex items-center gap-3">
                                      <button
                                          type="button"
                                          onClick={() => setFloorPortions((prev) => prev.map((value, idx) => idx === index ? Math.max(1, value - 1) : value))}
                                          className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-neutral-700 text-slate-700 dark:text-slate-200 font-bold"
                                      >
                                          -
                                      </button>
                                      <input
                                          type="number"
                                          min="1"
                                          value={floorPortions[index] ?? 1}
                                          onChange={(e) => {
                                              const nextValue = Math.max(1, Number(e.target.value) || 1);
                                              setFloorPortions((prev) => prev.map((value, idx) => idx === index ? nextValue : value));
                                          }}
                                          onWheel={preventWheelIncrement}
                                          className={`${numericInputClass} flex-1 rounded-lg px-3 py-2 text-center font-bold`}
                                      />
                                      <button
                                          type="button"
                                          onClick={() => setFloorPortions((prev) => prev.map((value, idx) => idx === index ? value + 1 : value))}
                                          className="w-9 h-9 rounded-lg bg-blue-600 text-white font-bold"
                                      >
                                          +
                                      </button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              )}
              </div>
          )}

          {/* Independent House Toggle */}
          {propertyType === PropertyType.INDEPENDENT_HOUSE && (
              <div className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-lg">
                  <input 
                    type="checkbox" 
                    id="singleUnit" 
                    checked={isSingleUnit} 
                    onChange={e => setIsSingleUnit(e.target.checked)} 
                    className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="singleUnit" className="cursor-pointer">
                      <span className="block text-sm font-semibold text-neutral-800 dark:text-neutral-200">Single Family Home</span>
                      <span className="block text-xs text-neutral-500 dark:text-neutral-400">Entire house is rented as one unit</span>
                  </label>
              </div>
          )}

          {/* Defaults */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Default Values (Optional)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                      <label className="label text-slate-700 dark:text-slate-300">Default Rent (₹)</label>
                      <input type="number" value={defaultRent} onChange={e => setDefaultRent(e.target.value)} onWheel={preventWheelIncrement} className={numericInputClass} placeholder="0" min="0" />
                  </div>
                  <div>
                      <label className="label text-slate-700 dark:text-slate-300">Security Deposit (₹)</label>
                      <input type="number" value={defaultSecurityDeposit} onChange={e => setDefaultSecurityDeposit(e.target.value)} onWheel={preventWheelIncrement} className={numericInputClass} placeholder="0" min="0" />
                  </div>
                  {mode !== 'land' && (
                      <div className="sm:col-span-2">
                          <label className="label text-slate-700 dark:text-slate-300">Parking</label>
                          <select value={defaultParking} onChange={e => setDefaultParking(e.target.value)} className={selectInputClass}>
                              <option value="None">None</option>
                              <option value="Same as Unit">Same as Unit No.</option>
                          </select>
                      </div>
                  )}
              </div>
          </div>

          {/* Live Preview */}
          <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg text-center">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                  Total Inventory to Create: <strong className="text-blue-600 dark:text-blue-400">{generateUnitsPayload().length} Units</strong>
              </p>
              {mode !== 'land' && (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Floor plan: {buildFloorLabels(Math.max(1, Number(numFloors) || 1), includeGroundFloor).join(', ')}
                  </p>
              )}
          </div>

          {mode !== 'land' && (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-neutral-900 p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3 mb-4">
                      <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">Portion Types & Numbering</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                              Set portion type like 1BHK, 2BHK, Penthouse, Office, Shop and also set numbering like 101, 102 or any label.
                          </p>
                      </div>
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">Auto numbering still works as fallback</span>
                  </div>
                  <div className="space-y-4">
                      {portionLabels.map((floorLabels, floorIndex) => (
                          floorLabels.length > 0 ? (
                              <div key={`portion-floor-${floorIndex}`} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-neutral-800/60 p-4">
                                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">
                                      {buildFloorLabels(Math.max(1, Number(numFloors) || 1), includeGroundFloor)[floorIndex] || `Floor ${floorIndex + 1}`}
                                  </p>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      {floorLabels.map((label, unitIndex) => (
                                          <div key={`portion-${floorIndex}-${unitIndex}`} className="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-neutral-900/70 p-3">
                                              <label className="label !mb-0">
                                                  Portion {unitIndex + 1}
                                              </label>
                                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                  <div>
                                                      <label className="label !mb-1 text-xs">Portion Type</label>
                                                      <input
                                                          list={`portion-types-${floorIndex}-${unitIndex}`}
                                                          type="text"
                                                          value={portionTypes[floorIndex]?.[unitIndex] ?? ''}
                                                          onChange={(e) => updatePortionMatrix(setPortionTypes, floorIndex, unitIndex, e.target.value)}
                                                          className="input"
                                                          placeholder="2BHK, Penthouse, Shop"
                                                      />
                                                      <datalist id={`portion-types-${floorIndex}-${unitIndex}`}>
                                                          {PORTION_TYPE_OPTIONS.map((option) => (
                                                              <option key={option} value={option} />
                                                          ))}
                                                      </datalist>
                                                  </div>
                                                  <div>
                                                      <label className="label !mb-1 text-xs">Portion Number / Label</label>
                                                      <input
                                                          type="text"
                                                          value={portionNumbers[floorIndex]?.[unitIndex] ?? ''}
                                                          onChange={(e) => updatePortionMatrix(setPortionNumbers, floorIndex, unitIndex, e.target.value)}
                                                          className="input"
                                                          placeholder="101, 102, A1"
                                                      />
                                                  </div>
                                              </div>
                                              <div>
                                                  <label className="label !mb-1 text-xs">Custom Full Label</label>
                                                  <input
                                                      type="text"
                                                      value={label}
                                                      onChange={(e) => updatePortionLabel(floorIndex, unitIndex, e.target.value)}
                                                      className="input"
                                                      placeholder="Optional override"
                                                  />
                                              </div>
                                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                                  Preview: <span className="font-semibold text-slate-700 dark:text-slate-200">{buildUnitLabel(portionTypes[floorIndex]?.[unitIndex] ?? '', portionNumbers[floorIndex]?.[unitIndex] ?? '', label || `Portion ${unitIndex + 1}`)}</span>
                                              </p>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          ) : null
                      ))}
                  </div>
              </div>
          )}
      </div>
  );

  const renderStep3_Identity = () => (
      <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 xl:grid-cols-[1.25fr_0.95fr] gap-5">
              <section className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-neutral-900 p-5 space-y-4 shadow-sm">
                  <div className="space-y-1">
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">Property Details</h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Add the key identity details tenants and your team will use every day.</p>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                      <div>
                          <label htmlFor="prop-name" className="label">Property Name</label>
                          <input type="text" id="prop-name" value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="e.g., Sunshine Residency" required />
                      </div>
                      <div>
                          <label htmlFor="prop-address" className="label">Full Address</label>
                          <textarea id="prop-address" value={address} onChange={(e) => setAddress(e.target.value)} className="input min-h-[108px] resize-y" rows={4} placeholder="Street, area, city, state, pin code" required />
                      </div>
                      <div>
                          <label htmlFor="prop-cctv-url" className="label flex items-center gap-1"><CameraIcon className="w-3 h-3"/> CCTV Stream URL</label>
                          <input type="text" id="prop-cctv-url" value={cctvUrl} onChange={(e) => setCctvUrl(e.target.value)} className="input" placeholder="rtsp:// or https:// stream link" />
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">CCTV can stay as a URL. This field is optional.</p>
                      </div>
                  </div>
              </section>

              <section className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-neutral-900 p-5 space-y-4 shadow-sm">
                  <div className="space-y-1">
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">Amenities</h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Choose the facilities available in this property.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                      {COMMON_AMENITIES_OPTIONS.map(amenity => (
                          <button 
                              key={amenity} 
                              type="button"
                              onClick={() => toggleAmenity(amenity)}
                              className={`px-3 py-2 text-sm rounded-2xl border transition-colors ${
                                  amenitiesList.includes(amenity) 
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-blue-300'
                              }`}
                          >
                              {amenity}
                          </button>
                      ))}
                  </div>
              </section>
          </div>

          <section className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-neutral-900 p-5 space-y-4 shadow-sm">
              <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                  <div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">Property Images</h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Upload image files for the property gallery. URLs are no longer required here.</p>
                  </div>
                  <label htmlFor="prop-image-upload" className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300 cursor-pointer">
                      <CloudUploadIcon className="w-4 h-4" />
                      Upload Images
                  </label>
              </div>
              <input
                  id="prop-image-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelection}
                  className="hidden"
              />
              <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-neutral-800/40 p-4">
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide min-h-[7rem]">
                      {images.map((url, idx) => (
                          <div key={`${url}-${idx}`} className="relative flex-shrink-0 w-28 h-28 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 group bg-white dark:bg-neutral-900 shadow-sm">
                              <img src={url} className="w-full h-full object-cover" alt={`Property preview ${idx + 1}`} />
                              <button type="button" onClick={() => removeImage(idx)} className="absolute top-1.5 right-1.5 bg-red-500 text-white p-1.5 rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"><TrashIcon className="w-3 h-3"/></button>
                          </div>
                      ))}
                      {images.length === 0 && (
                          <div className="w-full min-h-[10rem] rounded-2xl flex items-center justify-center">
                              <div className="flex flex-col items-center text-center text-slate-400 dark:text-slate-500">
                                  <div className="relative mb-4 h-20 w-24">
                                      <div className="absolute left-0 top-3 h-14 w-14 rounded-2xl border border-slate-300/80 bg-white shadow-sm dark:border-slate-700 dark:bg-neutral-900" />
                                      <div className="absolute right-0 top-0 h-14 w-14 rounded-2xl border border-blue-200 bg-blue-50 shadow-sm dark:border-blue-900/50 dark:bg-blue-950/30" />
                                      <div className="absolute bottom-0 left-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 dark:border-slate-600 dark:bg-neutral-900">
                                          <CloudUploadIcon className="w-5 h-5" />
                                      </div>
                                  </div>
                                  <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Add multiple property images</span>
                                  <span className="mt-1 text-xs">Upload exterior views, interiors, amenities, and common areas</span>
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </section>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Immersive Features & Location</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                      <label className="label">Google Maps Link</label>
                      <input type="text" value={googleMapUrl} onChange={e => setGoogleMapUrl(e.target.value)} className="input" placeholder="https://maps.google.com/..." />
                  </div>
                  <div>
                      <label className="label">3D Model URL (.glb)</label>
                      <input type="text" value={threedModelUrl} onChange={e => setThreedModelUrl(e.target.value)} className="input" placeholder="https://.../model.glb" />
                  </div>
                  <div>
                      <label className="label">360° Panorama URL</label>
                      <input type="text" value={panoramaUrl} onChange={e => setPanoramaUrl(e.target.value)} className="input" placeholder="https://.../panorama.jpg" />
                  </div>
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-neutral-900/60 p-4 md:col-span-2">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Location tip</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Paste the Google Maps share link for this property. It is easier to manage on mobile and works better than entering raw latitude and longitude manually.
                      </p>
                  </div>
              </div>
          </div>
      </div>
  );

  const renderStep4_Community = () => (
      <div className="animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <UsersIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h4 className="font-semibold text-blue-800 dark:text-slate-300">Community Hub Settings</h4>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Configure the digital experience for your tenants.</p>
          
          <div className="space-y-4">
              <label className="flex items-center justify-between gap-4 p-4 border border-slate-200 dark:border-slate-700 rounded-2xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <div>
                      <span className="font-medium text-slate-900 dark:text-slate-200">Group Chat</span>
                      <p className="text-xs text-slate-500">Allow a WhatsApp-style group chat for residents.</p>
                  </div>
                  <input type="checkbox" checked={communityFeatures.enable_chat} onChange={() => toggleFeature('enable_chat')} className="h-5 w-5 shrink-0 text-blue-600 rounded" />
              </label>
              <label className="flex items-center justify-between gap-4 p-4 border border-slate-200 dark:border-slate-700 rounded-2xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <div>
                      <span className="font-medium text-slate-900 dark:text-slate-200">Notice Board & Polls</span>
                      <p className="text-xs text-slate-500">Enable announcements and voting.</p>
                  </div>
                  <input type="checkbox" checked={communityFeatures.enable_polls} onChange={() => toggleFeature('enable_polls')} className="h-5 w-5 shrink-0 text-blue-600 rounded" />
              </label>
              {mode !== 'land' && (
                  <label className="flex items-center justify-between gap-4 p-4 border border-slate-200 dark:border-slate-700 rounded-2xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      <div>
                          <span className="font-medium text-slate-900 dark:text-slate-200">Gate Pass</span>
                          <p className="text-xs text-slate-500">Digital entry pass for visitors/delivery.</p>
                      </div>
                      <input type="checkbox" checked={communityFeatures.enable_gate_pass} onChange={() => toggleFeature('enable_gate_pass')} className="h-5 w-5 shrink-0 text-blue-600 rounded" />
                  </label>
              )}
              {mode !== 'land' && (
                  <label className="flex items-center justify-between gap-4 p-4 border border-slate-200 dark:border-slate-700 rounded-2xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      <div>
                          <span className="font-medium text-slate-900 dark:text-slate-200">Amenities Booking</span>
                          <p className="text-xs text-slate-500">Manage bookings for pool, gym, etc.</p>
                      </div>
                      <input type="checkbox" checked={communityFeatures.enable_amenities} onChange={() => toggleFeature('enable_amenities')} className="h-5 w-5 shrink-0 text-blue-600 rounded" />
                  </label>
              )}
          </div>
      </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add New Property" maxWidth="4xl">
      <div className="space-y-5">
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                {STEP_DETAILS.map((item) => (
                    <div key={item.id} className={`h-2 flex-1 rounded-full transition-all ${item.id <= step ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`} />
                ))}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                {STEP_DETAILS.map((item) => {
                    const isActive = item.id === step;
                    const isCompleted = item.id < step;
                    return (
                        <div
                            key={item.id}
                            className={`rounded-2xl border px-3 py-3 transition-colors ${
                                isActive
                                    ? 'border-blue-600 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/20'
                                    : isCompleted
                                        ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20'
                                        : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-neutral-800/60'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${
                                    isActive
                                        ? 'bg-blue-600 text-white'
                                        : isCompleted
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-white text-slate-500 dark:bg-neutral-900 dark:text-slate-300'
                                }`}>
                                    {item.id}
                                </span>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{item.label}</p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{item.helper}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        <div className="rounded-[28px] border border-slate-200/80 bg-slate-50/70 p-3 md:p-4 dark:border-slate-800 dark:bg-neutral-950/40">
        <div className="min-h-[420px]">
          {step === 1 && renderStep1_Classification()}
          {step === 2 && renderStep2_Structure()}
          {step === 3 && renderStep3_Identity()}
          {step === 4 && renderStep4_Community()}
        </div>
        </div>

        {error && <p className="text-sm text-red-500 bg-red-100 dark:bg-red-900/30 p-2 rounded text-center">{error}</p>}

        <div className="sticky bottom-0 -mx-1 flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-4 border-t border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm">
          <button
            type="button"
            onClick={prevStep}
            disabled={step === 1}
            className="w-full sm:w-auto min-w-[120px] min-h-[52px] px-5 py-3 rounded-2xl font-black text-sm tracking-wide border border-neutral-300 dark:border-neutral-700 bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Back
          </button>
          
          {step < 4 && (
              <button 
                type="button" 
                onClick={nextStep} 
                className="w-full sm:w-auto min-w-[120px] min-h-[52px] px-5 py-3 rounded-2xl font-black text-sm tracking-wide bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" 
                disabled={isNextDisabled()}
              >
                  Next
              </button>
          )}
          
          {step === 4 && (
            <button type="button" onClick={handleSubmit} disabled={loading} className="w-full sm:w-auto min-w-[180px] min-h-[52px] px-5 py-3 rounded-2xl font-black text-sm tracking-wide bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {loading ? 'Creating Property...' : `Confirm & Create`}
            </button>
          )}
        </div>
      </div>
      <style>{`
        .label {
          display: block;
          margin-bottom: 0.45rem;
          font-size: 0.875rem;
          font-weight: 700;
          color: #334155;
          letter-spacing: -0.01em;
        }
        .dark .label {
          color: #cbd5e1;
        }
        .input {
          display: block;
          width: 100%;
          min-height: 3rem;
          padding: 0.78rem 0.95rem;
          border: 1px solid #cbd5e1;
          border-radius: 1rem;
          background: #ffffff;
          color: #0f172a;
          font-size: 0.95rem;
          line-height: 1.4;
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
        }
        .input::placeholder {
          color: #94a3b8;
        }
        .input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.16);
        }
        .dark .input {
          border-color: #475569;
          background: #0f172a;
          color: #f8fafc;
        }
        .dark .input::placeholder {
          color: #64748b;
        }
        @media (max-width: 640px) {
          .input {
            font-size: 16px;
          }
        }
      `}</style>
    </Modal>
  );
};

export default AddPropertyModal;
