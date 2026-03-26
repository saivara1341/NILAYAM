import React, { useEffect, useState } from 'react';
import Card from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';
import { getSystemHealthWorkspace } from '../services/api';
import { SystemHealthWorkspace } from '../types';
import { ShieldCheckIcon, BellIcon, PlugIcon } from '../constants';

const SystemHealthPage: React.FC = () => {
    const [workspace, setWorkspace] = useState<SystemHealthWorkspace | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            setWorkspace(await getSystemHealthWorkspace());
        } catch (err: any) {
            setWorkspace(null);
            setError(err?.message || 'Failed to load system health workspace.');
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
                <h2 className="text-xl font-black">System health could not be loaded</h2>
                <p className="mt-3 text-sm leading-7">{error}</p>
                <button onClick={() => void load()} className="mt-4 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white dark:bg-white dark:text-slate-900">
                    Retry
                </button>
            </Card>
        );
    }
    if (!workspace) return null;

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h2 className="text-3xl font-bold text-neutral-900 dark:text-white">System Health</h2>
                <p className="mt-2 max-w-3xl text-neutral-500 dark:text-neutral-400">
                    Operations health for webhooks, retries, audit controls, security incidents, and automation backlog.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <Card><p className="text-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Webhook Backlog</p><p className="mt-2 text-3xl font-black text-blue-600 dark:text-blue-400">{workspace.snapshot.webhookEventsPending}</p></Card>
                <Card><p className="text-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Retry Queue</p><p className="mt-2 text-3xl font-black text-amber-600 dark:text-amber-400">{workspace.snapshot.payoutRetriesQueued}</p></Card>
                <Card><p className="text-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Open Incidents</p><p className="mt-2 text-3xl font-black text-rose-600 dark:text-rose-400">{workspace.snapshot.securityIncidentsOpen}</p></Card>
                <Card><p className="text-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Audit Entries</p><p className="mt-2 text-3xl font-black text-emerald-600 dark:text-emerald-400">{workspace.auditLogCount}</p></Card>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <Card>
                    <div className="mb-4 flex items-center gap-2">
                        <PlugIcon className="h-5 w-5 text-blue-600" />
                        <h3 className="text-xl font-bold text-neutral-900 dark:text-white">Webhook Backlog</h3>
                    </div>
                    <div className="space-y-3">
                        {workspace.webhookBacklog.length === 0 && <p className="text-sm text-neutral-500 dark:text-neutral-400">No pending webhook backlog.</p>}
                        {workspace.webhookBacklog.map((event) => (
                            <div key={event.id} className="rounded-2xl border border-neutral-200 px-4 py-3 dark:border-neutral-700">
                                <p className="text-sm font-bold text-neutral-900 dark:text-white">{event.event_name}</p>
                                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{event.processing_status} • {new Date(event.created_at).toLocaleString()}</p>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card>
                    <div className="mb-4 flex items-center gap-2">
                        <BellIcon className="h-5 w-5 text-amber-600" />
                        <h3 className="text-xl font-bold text-neutral-900 dark:text-white">Failing Jobs</h3>
                    </div>
                    <div className="space-y-3">
                        {workspace.failedJobs.length === 0 && <p className="text-sm text-neutral-500 dark:text-neutral-400">No failing jobs detected.</p>}
                        {workspace.failedJobs.map((job) => (
                            <div key={job.id} className="rounded-2xl border border-neutral-200 px-4 py-3 dark:border-neutral-700">
                                <p className="text-sm font-bold text-neutral-900 dark:text-white">{job.job_type}</p>
                                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Attempts: {job.attempts} • Status: {job.status}</p>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card>
                    <div className="mb-4 flex items-center gap-2">
                        <ShieldCheckIcon className="h-5 w-5 text-rose-600" />
                        <h3 className="text-xl font-bold text-neutral-900 dark:text-white">Security Incidents</h3>
                    </div>
                    <div className="space-y-3">
                        {workspace.securityIncidents.length === 0 && <p className="text-sm text-neutral-500 dark:text-neutral-400">No open security incidents.</p>}
                        {workspace.securityIncidents.map((incident) => (
                            <div key={incident.id} className="rounded-2xl border border-neutral-200 px-4 py-3 dark:border-neutral-700">
                                <p className="text-sm font-bold text-neutral-900 dark:text-white">{incident.title}</p>
                                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{incident.severity} • {incident.status} • {new Date(incident.created_at).toLocaleString()}</p>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default SystemHealthPage;
