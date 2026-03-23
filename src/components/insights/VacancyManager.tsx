
import React, { useState, useEffect, useCallback } from 'react';
import { DetailedVacantUnit } from '../../types';
import { getUnlistedVacantUnits } from '../../services/api';
import Card from '../ui/Card';
import Spinner from '../ui/Spinner';
import ListingAgentModal from './ListingAgentModal';
import { BotIcon } from '../../constants';
import Modal from '../ui/Modal';

const VacancyManager: React.FC = () => {
    const [units, setUnits] = useState<DetailedVacantUnit[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedUnit, setSelectedUnit] = useState<DetailedVacantUnit | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isManagerOpen, setIsManagerOpen] = useState(false);

    const fetchUnits = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getUnlistedVacantUnits();
            setUnits(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUnits();
    }, [fetchUnits]);

    const handleActivateAgent = (unit: DetailedVacantUnit) => {
        setSelectedUnit(unit);
        setIsModalOpen(true);
    };

    const handleListingSuccess = () => {
        setIsModalOpen(false);
        setSelectedUnit(null);
        fetchUnits(); 
    };

    const renderContent = () => {
        if (loading) return <div className="flex justify-center p-4"><Spinner /></div>;
        if (error) return <div className="p-4 text-red-500 bg-red-100 dark:bg-red-900/30 rounded-lg">{error}</div>;
        if (units.length === 0) {
            return (
                <div className="text-center p-6 rounded-lg bg-white/40 dark:bg-black/20 backdrop-blur-sm">
                    <p className="text-sm text-neutral-600 dark:text-neutral-300 font-medium">All properties are fully occupied or listed. Great job!</p>
                </div>
            );
        }
        return (
            <div className="space-y-3 mt-4">
                {units.map(unit => (
                    <div key={unit.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white dark:bg-neutral-800 shadow-lg rounded-xl border border-neutral-100 dark:border-neutral-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-200 group">
                        <div className="mb-3 sm:mb-0">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                <p className="font-bold text-neutral-800 dark:text-neutral-100 text-lg">
                                    {unit.buildings?.name}
                                </p>
                            </div>
                            <p className="text-neutral-600 dark:text-neutral-400 font-medium ml-4">
                                Unit {unit.house_number} &bull; <span className="text-neutral-500 text-sm">Last Rent: ₹{unit.rent_amount?.toLocaleString('en-IN')}</span>
                            </p>
                        </div>
                        <button 
                            onClick={() => handleActivateAgent(unit)}
                            className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-5 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all transform group-hover:scale-105"
                        >
                            <BotIcon className="w-4 h-4" />
                            Auto-List with AI
                        </button>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <>
            {selectedUnit && (
                <ListingAgentModal 
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    unit={selectedUnit}
                    onSuccess={handleListingSuccess}
                />
            )}
            <button
                type="button"
                onClick={() => setIsManagerOpen(true)}
                className="group flex w-full items-center justify-between rounded-2xl border border-indigo-200/70 bg-gradient-to-r from-indigo-50 via-white to-blue-50 px-5 py-4 text-left shadow-sm transition-all hover:border-indigo-300 hover:shadow-md dark:border-indigo-900/60 dark:from-indigo-950/30 dark:via-neutral-900 dark:to-blue-950/30"
            >
                <div className="flex min-w-0 items-center gap-3">
                    <div className="rounded-xl bg-indigo-600 p-2 text-white shadow-lg shadow-indigo-500/25">
                        <BotIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-black text-neutral-900 dark:text-white">
                            Automated Vacancy Manager
                        </p>
                        <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                            {loading ? 'Checking vacancies...' : `${units.length} unlisted vacant unit${units.length === 1 ? '' : 's'}`}
                        </p>
                    </div>
                </div>
                <span className="rounded-full border border-indigo-200 bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-indigo-700 transition-colors group-hover:border-indigo-300 group-hover:text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300">
                    Open
                </span>
            </button>

            <Modal
                isOpen={isManagerOpen}
                onClose={() => setIsManagerOpen(false)}
                title="Automated Vacancy Manager"
            >
                <div className="space-y-4">
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        Review vacant unlisted units and launch AI listing only when you need it.
                    </p>
                    {renderContent()}
                </div>
            </Modal>
        </>
    );
};

export default VacancyManager;
