
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Property, PropertyType, House } from '../types';
import Card from '../components/ui/Card';
import AddPropertyModal from '../components/properties/AddPropertyModal';
import AiPropertyArchitectModal from '../components/properties/AiPropertyArchitectModal';
import AddTenantModal from '../components/tenants/AddTenantModal';
import { BuildingIcon, CloudUploadIcon, TrashIcon, PencilIcon, SparklesIcon, UserPlusIcon, PropertiesIcon, PlusCircleIcon } from '../constants';
import ListPropertyModal from '../components/properties/ListPropertyModal';
import Modal from '../components/ui/Modal';
import { createPropertyWithUnits, deleteProperty, getProperties, updateProperty, getUnitsForProperty, updateHouse } from '../services/api';
import EditPropertyModal from '../components/properties/EditPropertyModal';
import ImmersiveViewer from '../components/properties/ImmersiveViewer';
import { sharePropertyLocation } from '../utils/sharing';
import PaginationControls from '../components/ui/PaginationControls';
import Spinner from '../components/ui/Spinner';
import { PROPERTY_TYPE_CATEGORIES, formatPropertyType } from '../constants';
import VacancyManager from '../components/insights/VacancyManager';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useLocation, useNavigate } from 'react-router-dom';

const ITEMS_PER_PAGE = 6;

const PropertiesSkeleton: React.FC = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-neutral-800/50 rounded-xl p-6 space-y-4 shadow-sm">
                <div className="flex items-center space-x-4">
                    <div className="skeleton h-12 w-12 rounded-lg"></div>
                    <div className="flex-1 space-y-2">
                        <div className="skeleton h-4 w-3/4"></div>
                        <div className="skeleton h-3 w-1/2"></div>
                    </div>
                </div>
                <div className="skeleton h-8 w-full"></div>
            </div>
        ))}
    </div>
);

const EmptyPropertiesIllustration: React.FC = () => (
    <div className="relative mx-auto h-56 w-56">
        <div className="absolute inset-6 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-400/10" />
        <div className="absolute left-6 top-10 h-36 w-44 rounded-[2rem] border border-slate-200 bg-white/90 shadow-[0_20px_45px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900/90">
            <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            </div>
            <div className="space-y-3 px-4 py-4">
                <div className="h-3 w-24 rounded-full bg-slate-200 dark:bg-slate-700" />
                <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-blue-50 p-3 dark:bg-blue-500/10">
                        <div className="mx-auto h-10 w-10 rounded-2xl bg-blue-200 dark:bg-blue-500/20" />
                        <div className="mx-auto mt-3 h-2.5 w-14 rounded-full bg-blue-200 dark:bg-blue-500/20" />
                    </div>
                    <div className="rounded-2xl bg-emerald-50 p-3 dark:bg-emerald-500/10">
                        <div className="mx-auto h-10 w-10 rounded-2xl bg-emerald-200 dark:bg-emerald-500/20" />
                        <div className="mx-auto mt-3 h-2.5 w-14 rounded-full bg-emerald-200 dark:bg-emerald-500/20" />
                    </div>
                </div>
            </div>
        </div>
        <div className="absolute bottom-7 right-4 flex h-24 w-24 items-center justify-center rounded-[1.75rem] border border-slate-200 bg-[linear-gradient(180deg,#eff6ff,#dbeafe)] shadow-[0_18px_40px_rgba(37,99,235,0.16)] dark:border-slate-700 dark:bg-[linear-gradient(180deg,#1e293b,#0f172a)]">
            <BuildingIcon className="h-12 w-12 text-blue-600 dark:text-blue-300" />
        </div>
        <div className="absolute right-0 top-8 rounded-full border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            Portfolio
        </div>
        <div className="absolute bottom-0 left-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            Ready To Add
        </div>
    </div>
);

const EmptyState: React.FC<{ onAddClick: () => void; onAiClick: () => void; isFiltered: boolean }> = ({ onAddClick, onAiClick, isFiltered }) => {
    const { t } = useLanguage();
    return (
        <div className="text-center py-16 px-6">
            <div className="flex justify-center mb-8 relative">
                <EmptyPropertiesIllustration />
            </div>
            <h3 className="mt-6 text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
                {isFiltered ? 'No Properties Found' : 'No Properties Yet'}
            </h3>
            <p className="mt-3 text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto text-lg leading-relaxed">
                {isFiltered ? 'No properties match the selected filter. Try a different category.' : 'Get started by adding your first property.'}
            </p>
            {!isFiltered && (
                <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4 px-4 sm:px-0">
                    <button 
                        onClick={onAiClick} 
                        className="flex items-center justify-center gap-2 px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-indigo-600/20"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                        AI ARCHITECT
                    </button>
                    <button 
                        onClick={onAddClick} 
                        className="flex items-center justify-center gap-2 px-8 py-4 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white font-black rounded-2xl border-2 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 hover:scale-105 active:scale-95 transition-all shadow-lg"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                        ADD PROPERTY
                    </button>
                </div>
            )}
        </div>
    )
};


const PropertyUnitsView: React.FC<{ property: Property }> = ({ property }) => {
    const [units, setUnits] = useState<House[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
    const [draftUnitName, setDraftUnitName] = useState('');
    const [savingUnitId, setSavingUnitId] = useState<string | null>(null);
    const { t } = useLanguage();

    const fetchUnits = useCallback(async () => {
            setLoading(true);
            try {
                const data = await getUnitsForProperty(property.id);
                setUnits(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }, [property.id]);

    useEffect(() => {
        fetchUnits();
    }, [fetchUnits]);

    const startEditingUnit = (unit: House) => {
        setEditingUnitId(unit.id);
        setDraftUnitName(unit.house_number || '');
    };

    const cancelEditingUnit = () => {
        setEditingUnitId(null);
        setDraftUnitName('');
    };

    const saveUnitName = async (unitId: string) => {
        if (!draftUnitName.trim()) return;
        setSavingUnitId(unitId);
        setError(null);
        try {
            await updateHouse(unitId, { house_number: draftUnitName.trim() });
            await fetchUnits();
            cancelEditingUnit();
        } catch (err: any) {
            setError(err.message || 'Failed to update unit name.');
        } finally {
            setSavingUnitId(null);
        }
    };

    return (
        <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700 animate-fade-in">
            {loading && <Spinner />}
            {error && <p className="text-sm text-red-500">{error}</p>}
            {!loading && units.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {units.map(unit => (
                        <div key={unit.id} className="flex justify-between items-center p-3 bg-neutral-50 dark:bg-neutral-900/50 rounded-lg border border-neutral-100 dark:border-neutral-800/50">
                            <div className="flex-1 min-w-0">
                                {editingUnitId === unit.id ? (
                                    <div className="space-y-2">
                                        <input
                                            value={draftUnitName}
                                            onChange={(event) => setDraftUnitName(event.target.value)}
                                            className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm font-semibold text-neutral-900 dark:text-white"
                                            placeholder="Enter portion name"
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => saveUnitName(unit.id)}
                                                disabled={savingUnitId === unit.id || !draftUnitName.trim()}
                                                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
                                            >
                                                {savingUnitId === unit.id ? 'Saving...' : 'Save'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={cancelEditingUnit}
                                                className="rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-xs font-bold text-neutral-700 dark:text-neutral-200"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold text-sm text-neutral-800 dark:text-neutral-200">{unit.house_number}</p>
                                        <button
                                            type="button"
                                            onClick={() => startEditingUnit(unit)}
                                            className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1 text-[11px] font-bold text-blue-600 dark:text-blue-300"
                                        >
                                            <PencilIcon className="h-3.5 w-3.5" />
                                            Edit
                                        </button>
                                    </div>
                                )}
                                <p className="text-xs text-neutral-500 dark:text-neutral-400">{unit.tenant_name || t('common.vacant')}</p>
                            </div>
                            <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-md ${unit.tenant_name ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                                {unit.tenant_name ? t('common.occupied') : t('common.vacant')}
                            </span>
                        </div>
                    ))}
                </div>
            )}
            {!loading && units.length === 0 && <p className="text-sm text-center text-neutral-500 dark:text-neutral-400 py-4">No units found for this property.</p>}
        </div>
    );
};


const PropertyCard: React.FC<{
    property: Property;
    onListClick: () => void;
    onDeleteClick: () => void;
    onEditClick: () => void;
    onAssignTenantClick: () => void;
    onViewImmersive: (type: '3d' | '360', url: string, title: string) => void;
}> = ({ property, onListClick, onDeleteClick, onEditClick, onAssignTenantClick, onViewImmersive }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const hasImage = property.images && property.images.length > 0;
    const { t } = useLanguage();

    const handleShareLocation = async () => {
        await sharePropertyLocation({
            name: property.name,
            address: property.address,
            googleMapUrl: property.google_map_url,
            coordinates: property.coordinates
        });
    };

    return (
        <Card className="hover:border-blue-300 dark:hover:border-blue-700 flex flex-col justify-between transition-colors p-0 overflow-hidden">
            <div onClick={() => setIsExpanded(!isExpanded)} className="cursor-pointer">
                {/* Image Section */}
                <div className={`relative h-40 w-full ${hasImage ? '' : 'bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900 flex items-center justify-center'}`}>
                    {hasImage ? (
                        <>
                            <img
                                src={property.images![0]}
                                alt={property.name}
                                className="w-full h-full object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                            {property.images!.length > 1 && (
                                <span className="absolute bottom-2 right-2 bg-black/50 text-white text-xs font-semibold px-2 py-1 rounded-md flex items-center gap-1 backdrop-blur-sm">
                                    +{property.images!.length - 1} more
                                </span>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-neutral-400 dark:text-neutral-600">
                            <BuildingIcon className="h-12 w-12 mb-2" />
                            <span className="text-xs font-medium">No Image</span>
                        </div>
                    )}
                    <div className="absolute top-3 left-3">
                        <span className="text-xs font-semibold px-2.5 py-1 bg-white/90 dark:bg-black/60 text-neutral-700 dark:text-neutral-200 rounded-lg backdrop-blur-sm shadow-sm">
                            {formatPropertyType(property.property_type)}
                        </span>
                    </div>
                </div>

                <div className="p-5">
                    <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-200 truncate leading-tight">{property.name}</h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 truncate flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        {property.address}
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                        <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 rounded-lg">
                            {property.unit_count} {property.unit_count === 1 ? t('common.unit') : t('properties.units')}
                        </span>
                        {property.cctv_url && <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-lg flex items-center gap-1"><div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>CCTV</span>}
                    </div>

                    {isExpanded && <PropertyUnitsView property={property} />}
                </div>
            </div>

            <div className="px-5 pb-5 pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
                <button onClick={() => setIsExpanded(!isExpanded)} className="w-full text-center px-3 py-2 text-xs font-medium text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300 transition-colors">
                    {isExpanded ? 'Hide Details' : 'View Details'}
                </button>

                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); onAssignTenantClick(); }}
                        className="flex items-center justify-center px-3 py-2 text-sm font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                        title="Assign Tenant to this Property"
                    >
                        <UserPlusIcon className="w-4 h-4 mr-2" />
                        {t('qa.add_tenant')}
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onListClick(); }}
                        className="isolate overflow-hidden flex items-center justify-center gap-2 px-3 py-2 text-sm font-black text-slate-800 dark:text-slate-100 rounded-xl border border-slate-300/80 dark:border-slate-500/40 bg-[linear-gradient(135deg,#f8fafc_0%,#e5e7eb_45%,#cbd5e1_100%)] dark:bg-[linear-gradient(135deg,rgba(248,250,252,0.12)_0%,rgba(148,163,184,0.14)_50%,rgba(71,85,105,0.28)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.78)] hover:border-slate-400 dark:hover:border-slate-400/60 hover:brightness-[1.02] active:scale-[0.98] transition-all"
                    >
                        <CloudUploadIcon className="w-4 h-4" />
                        List
                    </button>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); onEditClick(); }}
                        title="Edit Property"
                        className="flex-1 flex items-center justify-center p-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                    >
                        <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleShareLocation(); }}
                        title="Share Location"
                        className="flex-1 flex items-center justify-center gap-2 p-2 text-sm font-semibold text-blue-700 dark:text-blue-300 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/20 rounded-xl hover:from-blue-100 hover:to-cyan-100 dark:hover:from-blue-900/40 dark:hover:to-cyan-900/30 transition-colors border border-blue-100 dark:border-blue-900/40"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.5 12.5 15.5 8.5M8.5 11.5l7 4" />
                            <circle cx="6.5" cy="12" r="2.5" strokeWidth="2" />
                            <circle cx="17.5" cy="7.5" r="2.5" strokeWidth="2" />
                            <circle cx="17.5" cy="16.5" r="2.5" strokeWidth="2" />
                        </svg>
                        Share
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDeleteClick(); }}
                        title="Delete Property"
                        className="flex-1 flex items-center justify-center p-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                    >
                        <TrashIcon className="h-5 w-5" />
                    </button>
                </div>

                {(property.threed_model_url || property.panorama_url) && (
                    <div className="flex gap-2">
                        {property.threed_model_url && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onViewImmersive('3d', property.threed_model_url!, property.name); }}
                                className="flex-1 flex items-center justify-center px-3 py-2 text-xs font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20 active:scale-95"
                            >
                                <span className="mr-1.5 flex h-2 w-2 rounded-full bg-indigo-200 animate-pulse" />
                                3D View
                            </button>
                        )}
                        {property.panorama_url && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onViewImmersive('360', property.panorama_url!, property.name); }}
                                className="flex-1 flex items-center justify-center px-3 py-2 text-xs font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20 active:scale-95"
                            >
                                <span className="mr-1.5 flex h-2 w-2 rounded-full bg-emerald-200 animate-pulse" />
                                360° View
                            </button>
                        )}
                    </div>
                )}
            </div>
        </Card>
    );
}

const PropertiesPage: React.FC = () => {
    const { profile } = useAuth();
    const { t } = useLanguage();
    const location = useLocation();
    const navigate = useNavigate();
    const [properties, setProperties] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dbError, setDbError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalProperties, setTotalProperties] = useState(0);
    const [filterType, setFilterType] = useState<PropertyType | 'all'>('all');

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);

    const [listingProperty, setListingProperty] = useState<Property | null>(null);
    const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null);
    const [propertyToEdit, setPropertyToEdit] = useState<Property | null>(null);
    const [propertyForTenant, setPropertyForTenant] = useState<Property | null>(null);
    const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const [immersiveConfig, setImmersiveConfig] = useState<{ isOpen: boolean; type: '3d' | '360'; url: string; title: string } | null>(null);

    const isBasicPlan = profile?.subscription_tier !== 'pro';

    const fetchProperties = useCallback(async (page: number, type: PropertyType | 'all') => {
        setLoading(true);
        setError(null);
        setDbError(null);
        try {
            const filterArg = type === 'all' ? undefined : { propertyType: type };
            const { data, count } = await getProperties(page, ITEMS_PER_PAGE, filterArg);
            setProperties(data);
            setTotalProperties(count);
        } catch (err: any) {
            if (err.message.includes('infinite recursion')) {
                setDbError(err.message);
            } else {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProperties(currentPage, filterType);
    }, [currentPage, filterType, fetchProperties]);

    // Handle dashboard redirection state
    useEffect(() => {
        if (location.state?.openAddModal) {
            setIsAddModalOpen(true);
            // Clear state to prevent re-opening
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location, navigate]);

    const handleAddClick = () => {
        if (isBasicPlan && totalProperties >= 2) {
            setUpgradeModalOpen(true);
        } else {
            setIsAddModalOpen(true);
        }
    }

    const handleAiClick = () => {
        if (isBasicPlan && totalProperties >= 2) {
            setUpgradeModalOpen(true);
        } else {
            setIsAiModalOpen(true);
        }
    }

    const handleAddSuccess = (newProperty: Property) => {
        setProperties(prev => [newProperty, ...prev]);
        setTotalProperties(prev => prev + 1);
        setIsAddModalOpen(false);
        setIsAiModalOpen(false);
    };

    const handleEditSuccess = () => {
        fetchProperties(currentPage, filterType);
        setPropertyToEdit(null);
    };

    const handleTenantAddSuccess = () => {
        setPropertyForTenant(null);
    }

    const handleDeleteClick = (property: Property) => {
        setDeleteError(null);
        setPropertyToDelete(property);
    };

    const handleConfirmDelete = async () => {
        if (!propertyToDelete) return;
        setIsDeleting(true);
        try {
            await deleteProperty(propertyToDelete.id);
            setProperties(prev => prev.filter(p => p.id !== propertyToDelete.id));
            setTotalProperties(prev => prev - 1);
            setPropertyToDelete(null);
        } catch (err: any) {
            setDeleteError(err.message);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setFilterType(e.target.value as PropertyType | 'all');
        setCurrentPage(1);
    };

    const totalPages = Math.ceil(totalProperties / ITEMS_PER_PAGE);

    const renderContent = () => {
        if (loading && properties.length === 0) return <PropertiesSkeleton />;
        
        // Only show full-screen error if we have NO properties to show
        if ((dbError || error) && properties.length === 0) {
            return (
                <div className="space-y-8">
                    <div className="text-center py-12 p-6 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30">
                        <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                        <h3 className="text-lg font-bold text-amber-900 dark:text-amber-300">Connection is a bit slow</h3>
                        <p className="text-sm text-amber-700 dark:text-amber-400 mt-2 max-w-md mx-auto">
                            We're having trouble reaching the database right now, but you can still try to add a property or refresh.
                        </p>
                        <button 
                            onClick={() => fetchProperties(currentPage, filterType)}
                            className="mt-4 text-xs font-bold text-amber-600 underline"
                        >
                            Try Refreshing
                        </button>
                    </div>
                    
                    <EmptyState
                        onAddClick={handleAddClick}
                        onAiClick={handleAiClick}
                        isFiltered={filterType !== 'all'}
                    />
                </div>
            );
        }
        if (properties.length === 0) {
            return (
                <EmptyState
                    onAddClick={handleAddClick}
                    onAiClick={handleAiClick}
                    isFiltered={filterType !== 'all'}
                />
            );
        }
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {properties.map(prop => (
                    <PropertyCard
                        key={prop.id}
                        property={prop}
                        onListClick={() => setListingProperty(prop)}
                        onDeleteClick={() => handleDeleteClick(prop)}
                        onEditClick={() => setPropertyToEdit(prop)}
                        onAssignTenantClick={() => setPropertyForTenant(prop)}
                        onViewImmersive={(type, url, title) => setImmersiveConfig({ isOpen: true, type, url, title })}
                    />
                ))}
            </div>
        );
    };

    return (
        <>
            <AddPropertyModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={handleAddSuccess}
            />
            <AiPropertyArchitectModal
                isOpen={isAiModalOpen}
                onClose={() => setIsAiModalOpen(false)}
                onSuccess={handleAddSuccess}
            />
            <EditPropertyModal
                isOpen={!!propertyToEdit}
                onClose={() => setPropertyToEdit(null)}
                onSuccess={handleEditSuccess}
                property={propertyToEdit}
            />
            <AddTenantModal
                isOpen={!!propertyForTenant}
                onClose={() => setPropertyForTenant(null)}
                onSuccess={handleTenantAddSuccess}
                preSelectedPropertyId={propertyForTenant?.id}
            />
            {listingProperty && (
                <ListPropertyModal
                    property={listingProperty}
                    isOpen={!!listingProperty}
                    onClose={() => setListingProperty(null)}
                    onSuccess={() => { setListingProperty(null); }}
                />
            )}
            {immersiveConfig && (
                <ImmersiveViewer
                    isOpen={immersiveConfig.isOpen}
                    onClose={() => setImmersiveConfig(prev => prev ? { ...prev, isOpen: false } : null)}
                    type={immersiveConfig.type}
                    url={immersiveConfig.url}
                    title={immersiveConfig.title}
                />
            )}
            {propertyToDelete && (
                <Modal
                    isOpen={!!propertyToDelete}
                    onClose={() => setPropertyToDelete(null)}
                    title="Confirm Property Deletion"
                >
                    <div className="text-center">
                        <p className="text-neutral-600 dark:text-neutral-400">
                            Are you sure you want to delete <strong className="text-neutral-900 dark:text-neutral-200">{propertyToDelete.name}</strong>?
                        </p>
                        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                            This action is irreversible and will permanently delete all associated data.
                        </p>
                        {deleteError && <p className="mt-4 text-sm text-red-500">{deleteError}</p>}
                        <div className="mt-6 flex justify-center gap-4">
                            <button
                                onClick={() => setPropertyToDelete(null)}
                                className="btn btn-secondary flex-1"
                                disabled={isDeleting}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                className="btn btn-danger flex-1"
                                disabled={isDeleting}
                            >
                                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {upgradeModalOpen && (
                <Modal isOpen={upgradeModalOpen} onClose={() => setUpgradeModalOpen(false)} title="Upgrade to Pro">
                    <div className="text-center p-4">
                        <div className="inline-block p-4 bg-amber-100 rounded-full mb-4">
                            <SparklesIcon className="w-8 h-8 text-amber-500" />
                        </div>
                        <h3 className="text-xl font-bold text-neutral-900 dark:text-white">Limit Reached</h3>
                        <p className="text-neutral-500 mt-2">
                            You've reached the maximum of 2 properties allowed on the Basic plan.
                            Upgrade to Pro for unlimited properties and more AI power.
                        </p>
                        <div className="mt-6 flex justify-center gap-4">
                            <button onClick={() => setUpgradeModalOpen(false)} className="btn btn-secondary">Maybe Later</button>
                            <Link to="/profile" className="btn bg-amber-500 hover:bg-amber-600 text-white">View Upgrade Options</Link>
                        </div>
                    </div>
                </Modal>
            )}

            <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <h2 className="text-3xl font-bold text-neutral-800 dark:text-neutral-200">{t('properties.title')}</h2>
                    <div className="flex gap-3 w-full sm:w-auto">
                        <button 
                            onClick={handleAiClick} 
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm font-black rounded-xl hover:scale-[1.02] transition-all shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 active:scale-95"
                        >
                            <SparklesIcon className="w-4 h-4" />
                            {t('properties.ai_btn')}
                        </button>
                        <button 
                            onClick={handleAddClick} 
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-black rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all shadow-lg active:scale-95 border border-neutral-200 dark:border-neutral-800"
                        >
                            <PlusCircleIcon className="w-4 h-4" />
                            {t('properties.add_btn')}
                        </button>
                    </div>
                </div>

                <VacancyManager />

                <div className="flex flex-wrap gap-2 items-center mb-6">
                    <button
                        onClick={() => setFilterType('all')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                            filterType === 'all'
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                            : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700'
                        }`}
                    >
                        All Properties
                    </button>
                    {Object.entries(PROPERTY_TYPE_CATEGORIES).map(([category, types]) => {
                        const isCategoryActive = types.includes(filterType as any);
                        return (
                            <div key={category} className="relative group">
                                <button
                                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                                        isCategoryActive
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                        : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                                    }`}
                                >
                                    {category}
                                    <svg className={`w-4 h-4 transition-transform ${isCategoryActive ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </button>
                                <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-100 dark:border-neutral-800 p-2 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all transform origin-top scale-95 group-hover:scale-100">
                                    {types.map(type => (
                                        <button
                                            key={type}
                                            onClick={() => setFilterType(type)}
                                            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                                                filterType === type
                                                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                                                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                                            }`}
                                        >
                                            {formatPropertyType(type)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {renderContent()}

                <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    itemsPerPage={ITEMS_PER_PAGE}
                    totalItems={totalProperties}
                />
            </div>
        </>
    );
};

export default PropertiesPage;
