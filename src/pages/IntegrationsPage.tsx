import React, { useEffect, useState } from 'react';
import Card from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';
import { IntegrationStatus } from '../types';
import { getIntegrationsWorkspace } from '../services/api';
import { PlugIcon } from '../constants';

const badgeStyles: Record<IntegrationStatus['status'], string> = {
    connected: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    configuration_needed: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    pending_kyc: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
};

const IntegrationsPage: React.FC = () => {
    const [items, setItems] = useState<IntegrationStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            setItems(await getIntegrationsWorkspace());
        } catch (err: any) {
            setItems([]);
            setError(err?.message || 'Failed to load integrations workspace.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
    }, []);

    if (loading) return <div className="flex min-h-[40vh] items-center justify-center"><Spinner /></div>;
    if (error) {
        return (
            <Card className="rounded-[1.75rem] border border-rose-200 bg-rose-50 p-6 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                <h2 className="text-xl font-black">Integrations could not be loaded</h2>
                <p className="mt-3 text-sm leading-7">{error}</p>
                <button onClick={() => void load()} className="mt-4 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white dark:bg-white dark:text-slate-900">
                    Retry
                </button>
            </Card>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            <div>
                <h2 className="flex items-center gap-3 text-3xl font-bold text-neutral-900 dark:text-white">
                    <PlugIcon className="h-8 w-8 text-blue-600" />
                    Integrations Hub
                </h2>
                <p className="mt-2 max-w-3xl text-neutral-500 dark:text-neutral-400">
                    Payments, communications, documents, monitoring, and analytics integrations required to run Nilayam as a production ERP platform.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {items.map((item) => (
                    <Card key={item.id} className="flex flex-col">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <div>
                                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">{item.name}</h3>
                                <p className="mt-1 text-xs font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">{item.category}</p>
                            </div>
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${badgeStyles[item.status]}`}>
                                {item.status.replace('_', ' ')}
                            </span>
                        </div>
                        <p className="flex-grow text-sm text-neutral-600 dark:text-neutral-400">{item.description}</p>
                        <div className="mt-4 border-t border-neutral-100 pt-4 dark:border-neutral-800">
                            <button className="w-full btn btn-secondary">{item.action_label}</button>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default IntegrationsPage;
