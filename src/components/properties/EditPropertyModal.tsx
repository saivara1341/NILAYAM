

import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { getUnitsForProperty, updateHouse, updateProperty } from '../../services/api';
import { Property, PropertyType, CommunityFeatures, House } from '../../types';
import { PROPERTY_TYPE_CATEGORIES, formatPropertyType } from '../../constants';

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
  if (!trimmed) return { portionType: '', portionNumber: '', customLabel: '' };
  const parts = trimmed.split(/\s*-\s*/);
  if (parts.length >= 2) {
    return {
      portionType: parts.slice(0, -1).join(' - ').trim(),
      portionNumber: parts[parts.length - 1].trim(),
      customLabel: ''
    };
  }
  return { portionType: '', portionNumber: trimmed, customLabel: '' };
};

const buildUnitLabel = (portionType: string, portionNumber: string, customLabel: string, fallback: string) => {
  if (customLabel.trim()) return customLabel.trim();
  const type = portionType.trim();
  const number = portionNumber.trim();
  if (type && number) return `${type} - ${number}`;
  if (type) return type;
  if (number) return number;
  return fallback;
};

type EditableUnit = {
  id: string;
  originalLabel: string;
  portionType: string;
  portionNumber: string;
  customLabel: string;
};

interface EditPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  property: Property | null;
}

const EditPropertyModal: React.FC<EditPropertyModalProps> = ({ isOpen, onClose, onSuccess, property }) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [propertyType, setPropertyType] = useState<PropertyType>(PropertyType.APARTMENT_COMPLEX);
  const [cctvUrl, setCctvUrl] = useState('');
  const [communityFeatures, setCommunityFeatures] = useState<CommunityFeatures>({
      enable_chat: true, enable_polls: true, enable_gate_pass: true, enable_amenities: true
  });
  const [googleMapUrl, setGoogleMapUrl] = useState('');
  const [threedModelUrl, setThreedModelUrl] = useState('');
  const [panoramaUrl, setPanoramaUrl] = useState('');
  const [units, setUnits] = useState<EditableUnit[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (property) {
      setName(property.name);
      setAddress(property.address);
      setPropertyType(property.property_type || PropertyType.APARTMENT_COMPLEX);
      setCctvUrl(property.cctv_url || '');
      if (property.community_features) {
          setCommunityFeatures(property.community_features);
      }
      setGoogleMapUrl(property.google_map_url || '');
      setThreedModelUrl(property.threed_model_url || '');
      setPanoramaUrl(property.panorama_url || '');
    }
  }, [property]);

  useEffect(() => {
    const loadUnits = async () => {
      if (!property || !isOpen) return;
      try {
        const propertyUnits = await getUnitsForProperty(property.id) as House[];
        setUnits(
          propertyUnits.map((unit) => {
            const parsed = parseUnitLabel(unit.house_number || '');
            return {
              id: unit.id,
              originalLabel: unit.house_number || '',
              portionType: parsed.portionType,
              portionNumber: parsed.portionNumber,
              customLabel: parsed.customLabel,
            };
          })
        );
      } catch (err: any) {
        setError(err.message || 'Failed to load property units.');
      }
    };

    loadUnits();
  }, [property, isOpen]);

  const toggleFeature = (key: keyof CommunityFeatures) => {
      setCommunityFeatures(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const updateUnit = (unitId: string, field: keyof EditableUnit, value: string) => {
    setUnits((current) => current.map((unit) => unit.id === unitId ? { ...unit, [field]: value } : unit));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property) return;

    setLoading(true);
    setError(null);

    try {
      await updateProperty(property.id, { 
          name, 
          address, 
          property_type: propertyType, 
          cctv_url: cctvUrl, 
          community_features: communityFeatures,
          google_map_url: googleMapUrl || undefined,
          threed_model_url: threedModelUrl,
          panorama_url: panoramaUrl
      });
      await Promise.all(
        units.map((unit) =>
          updateHouse(unit.id, {
            house_number: buildUnitLabel(unit.portionType, unit.portionNumber, unit.customLabel, unit.originalLabel || 'Unit')
          })
        )
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  if (!property) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Property">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="max-h-[70vh] overflow-y-auto pr-2 space-y-4">
            <div>
            <label htmlFor="edit-prop-name" className="block text-sm font-medium text-slate-600 dark:text-slate-400">Property Name</label>
            <input type="text" id="edit-prop-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full form-input" required />
            </div>
            <div>
            <label htmlFor="edit-prop-address" className="block text-sm font-medium text-slate-600 dark:text-slate-400">Address</label>
            <input type="text" id="edit-prop-address" value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1 w-full form-input" required />
            </div>
            <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">Property Type</label>
            <select value={propertyType} onChange={e => setPropertyType(e.target.value as PropertyType)} className="mt-1 w-full form-input">
                {Object.entries(PROPERTY_TYPE_CATEGORIES).map(([category, types]) => (
                    <optgroup key={category} label={category}>
                        {types.map(type => (
                            <option key={type} value={type}>{formatPropertyType(type)}</option>
                        ))}
                    </optgroup>
                ))}
            </select>
            </div>
            <div>
            <label htmlFor="edit-prop-cctv" className="block text-sm font-medium text-slate-600 dark:text-slate-400">CCTV Stream URL (Optional)</label>
            <input type="text" id="edit-prop-cctv" value={cctvUrl} onChange={(e) => setCctvUrl(e.target.value)} className="mt-1 w-full form-input" />
            </div>
            
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <h4 className="font-semibold text-blue-900 dark:text-slate-200 mb-2">Community Hub Settings</h4>
                <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center space-x-2 text-sm">
                        <input type="checkbox" checked={communityFeatures.enable_chat} onChange={() => toggleFeature('enable_chat')} className="rounded text-blue-600"/>
                        <span className="text-slate-700 dark:text-slate-300">Enable Group Chat</span>
                    </label>
                    <label className="flex items-center space-x-2 text-sm">
                        <input type="checkbox" checked={communityFeatures.enable_polls} onChange={() => toggleFeature('enable_polls')} className="rounded text-blue-600"/>
                        <span className="text-slate-700 dark:text-slate-300">Enable Polls/Notices</span>
                    </label>
                    <label className="flex items-center space-x-2 text-sm">
                        <input type="checkbox" checked={communityFeatures.enable_gate_pass} onChange={() => toggleFeature('enable_gate_pass')} className="rounded text-blue-600"/>
                        <span className="text-slate-700 dark:text-slate-300">Enable Gate Pass</span>
                    </label>
                    <label className="flex items-center space-x-2 text-sm">
                        <input type="checkbox" checked={communityFeatures.enable_amenities} onChange={() => toggleFeature('enable_amenities')} className="rounded text-blue-600"/>
                        <span className="text-slate-700 dark:text-slate-300">Enable Amenities</span>
                    </label>
                </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-4">
                <h4 className="font-semibold text-blue-900 dark:text-slate-200">Immersive & Location</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">Google Maps Link</label>
                        <input type="text" value={googleMapUrl} onChange={e => setGoogleMapUrl(e.target.value)} className="mt-1 w-full form-input" placeholder="https://maps.google.com/..." />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">3D Model URL (.glb)</label>
                        <input type="text" value={threedModelUrl} onChange={e => setThreedModelUrl(e.target.value)} className="mt-1 w-full form-input" placeholder="https://..." />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">360° Panorama URL</label>
                        <input type="text" value={panoramaUrl} onChange={e => setPanoramaUrl(e.target.value)} className="mt-1 w-full form-input" placeholder="https://..." />
                    </div>
                </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-4">
                <div>
                    <h4 className="font-semibold text-blue-900 dark:text-slate-200">Portions / Units</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Edit portion type like 2BHK, 3BHK, Penthouse and numbering like 101, 102, PH1.</p>
                </div>
                <div className="space-y-3">
                    {units.length === 0 && (
                      <p className="text-sm text-slate-500 dark:text-slate-400">No portions found for this property.</p>
                    )}
                    {units.map((unit, index) => (
                      <div key={unit.id} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-neutral-900/60 p-4 space-y-3">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Portion {index + 1}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">Portion Type</label>
                            <input
                              list={`edit-portion-types-${unit.id}`}
                              type="text"
                              value={unit.portionType}
                              onChange={(e) => updateUnit(unit.id, 'portionType', e.target.value)}
                              className="mt-1 w-full form-input"
                              placeholder="2BHK, Penthouse, Shop"
                            />
                            <datalist id={`edit-portion-types-${unit.id}`}>
                              {PORTION_TYPE_OPTIONS.map((option) => (
                                <option key={option} value={option} />
                              ))}
                            </datalist>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">Portion Number / Label</label>
                            <input
                              type="text"
                              value={unit.portionNumber}
                              onChange={(e) => updateUnit(unit.id, 'portionNumber', e.target.value)}
                              className="mt-1 w-full form-input"
                              placeholder="101, 102, A1, PH1"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">Custom Full Label</label>
                          <input
                            type="text"
                            value={unit.customLabel}
                            onChange={(e) => updateUnit(unit.id, 'customLabel', e.target.value)}
                            className="mt-1 w-full form-input"
                            placeholder="Optional full override"
                          />
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Preview: <span className="font-semibold text-slate-700 dark:text-slate-200">{buildUnitLabel(unit.portionType, unit.portionNumber, unit.customLabel, unit.originalLabel || 'Unit')}</span>
                        </p>
                      </div>
                    ))}
                </div>
            </div>
        </div>
        
        {error && <p className="text-sm text-red-500 bg-red-100 dark:bg-red-900/30 p-2 rounded">{error}</p>}
        <div className="flex justify-end gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-600 rounded-md hover:bg-slate-200 dark:hover:bg-slate-500">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:bg-slate-400 dark:disabled:bg-slate-600">
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
export default EditPropertyModal;
