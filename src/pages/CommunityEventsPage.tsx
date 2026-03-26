import React, { useEffect, useMemo, useState } from 'react';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import Spinner from '@/components/ui/Spinner';
import { useAuth } from '@/contexts/AuthContext';
import { createCommunityEvent, getAccessibleCommunityProperties, getCommunityEvents, respondToCommunityEvent } from '@/services/api';
import { CommunityEvent } from '@/types';
import { CalendarDaysIcon, CheckCircleIcon, MapPinIcon, PlusCircleIcon, UsersIcon } from '@/constants';

const categories: Array<CommunityEvent['category']> = ['social', 'maintenance', 'wellness', 'meeting', 'festival', 'marketplace'];

const badgeTone: Record<CommunityEvent['category'], string> = {
    social: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    maintenance: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    wellness: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    meeting: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
    festival: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    marketplace: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
};

const CommunityEventsPage: React.FC = () => {
    const { profile, effectiveRole } = useAuth();
    const [properties, setProperties] = useState<Array<{ id: string; name: string; address?: string; unit_count?: number }>>([]);
    const [selectedPropertyId, setSelectedPropertyId] = useState('');
    const [events, setEvents] = useState<CommunityEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [form, setForm] = useState({
        title: '',
        description: '',
        category: 'social' as CommunityEvent['category'],
        venue: '',
        startsAt: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
        capacity: ''
    });

    const loadProperties = async () => {
        const result = await getAccessibleCommunityProperties();
        setProperties(result);
        setSelectedPropertyId((current) => current || result[0]?.id || '');
        return result;
    };

    const loadEvents = async (propertyId: string) => {
        if (!propertyId) {
            setEvents([]);
            return;
        }
        const result = await getCommunityEvents(propertyId);
        setEvents(result);
    };

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const result = await loadProperties();
                if (result[0]?.id) {
                    await loadEvents(result[0].id);
                }
            } catch (err: any) {
                setError(err.message || 'Unable to load community events.');
            } finally {
                setLoading(false);
            }
        };

        void load();
    }, []);

    useEffect(() => {
        if (!selectedPropertyId) return;
        void loadEvents(selectedPropertyId);
    }, [selectedPropertyId]);

    const selectedProperty = useMemo(
        () => properties.find((property) => property.id === selectedPropertyId) || null,
        [properties, selectedPropertyId]
    );

    const summary = useMemo(() => {
        const going = events.reduce((sum, event) => sum + (event.attendees || []).filter((entry) => entry.status === 'going').length, 0);
        return {
            total: events.length,
            live: events.filter((event) => event.status === 'live').length,
            upcoming: events.filter((event) => event.status === 'upcoming').length,
            going
        };
    }, [events]);

    const handleCreate = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!selectedPropertyId) return;
        setSaving(true);
        setError(null);
        try {
            await createCommunityEvent({
                building_id: selectedPropertyId,
                title: form.title,
                description: form.description,
                category: form.category,
                venue: form.venue,
                starts_at: new Date(form.startsAt).toISOString(),
                host_name: profile?.full_name || 'Community Host',
                capacity: form.capacity ? Number(form.capacity) : undefined
            });
            setIsCreateOpen(false);
            setForm({
                title: '',
                description: '',
                category: 'social',
                venue: '',
                startsAt: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
                capacity: ''
            });
            await loadEvents(selectedPropertyId);
        } catch (err: any) {
            setError(err.message || 'Unable to create community event.');
        } finally {
            setSaving(false);
        }
    };

    const handleRsvp = async (eventId: string, status: 'going' | 'interested') => {
        if (!profile?.id) return;
        setSaving(true);
        try {
            await respondToCommunityEvent(eventId, {
                user_id: profile.id,
                name: profile.full_name || 'Resident',
                role: profile.role || 'tenant',
                status
            });
            await loadEvents(selectedPropertyId);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="flex min-h-[50vh] items-center justify-center"><Spinner /></div>;
    }

    return (
        <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
            <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create Community Event">
                <form onSubmit={handleCreate} className="space-y-4">
                    <input value={form.title} onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))} className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-white" placeholder="Event title" required />
                    <textarea value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} className="min-h-[110px] w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-white" placeholder="What is this event about?" required />
                    <div className="grid grid-cols-2 gap-3">
                        <select value={form.category} onChange={(e) => setForm((current) => ({ ...current, category: e.target.value as CommunityEvent['category'] }))} className="rounded-xl border border-neutral-200 px-4 py-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-white">
                            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                        </select>
                        <input value={form.venue} onChange={(e) => setForm((current) => ({ ...current, venue: e.target.value }))} className="rounded-xl border border-neutral-200 px-4 py-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-white" placeholder="Venue" required />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <input type="datetime-local" value={form.startsAt} onChange={(e) => setForm((current) => ({ ...current, startsAt: e.target.value }))} className="rounded-xl border border-neutral-200 px-4 py-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-white" required />
                        <input type="number" value={form.capacity} onChange={(e) => setForm((current) => ({ ...current, capacity: e.target.value }))} className="rounded-xl border border-neutral-200 px-4 py-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-white" placeholder="Capacity (optional)" />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setIsCreateOpen(false)} className="rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-bold dark:border-neutral-700 dark:text-white">Cancel</button>
                        <button type="submit" disabled={saving} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60">{saving ? 'Saving...' : 'Publish Event'}</button>
                    </div>
                </form>
            </Modal>

            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-neutral-900 dark:text-white">Community Events</h2>
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Run meetups, society updates, wellness sessions, festive gatherings, and resident marketplaces from one page.</p>
                </div>
                <div className="flex gap-3">
                    {properties.length > 1 && (
                        <select value={selectedPropertyId} onChange={(e) => setSelectedPropertyId(e.target.value)} className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-white">
                            {properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}
                        </select>
                    )}
                    {effectiveRole === 'owner' && (
                        <button onClick={() => setIsCreateOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-3 text-sm font-black text-white dark:bg-white dark:text-neutral-900">
                            <PlusCircleIcon className="h-4 w-4" />
                            New Event
                        </button>
                    )}
                </div>
            </div>

            {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300">{error}</div>}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <Card><p className="text-xs font-black uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">Community</p><p className="mt-2 text-2xl font-black text-neutral-900 dark:text-white">{selectedProperty?.name || 'No property'}</p><p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{selectedProperty?.address || 'Choose a property to manage events.'}</p></Card>
                <Card><p className="text-xs font-black uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">Total Events</p><p className="mt-2 text-3xl font-black text-neutral-900 dark:text-white">{summary.total}</p></Card>
                <Card><p className="text-xs font-black uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">Upcoming</p><p className="mt-2 text-3xl font-black text-blue-600 dark:text-blue-400">{summary.upcoming}</p></Card>
                <Card><p className="text-xs font-black uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">Resident RSVPs</p><p className="mt-2 text-3xl font-black text-emerald-600 dark:text-emerald-400">{summary.going}</p></Card>
            </div>

            {events.length === 0 ? (
                <Card>
                    <div className="py-12 text-center">
                        <CalendarDaysIcon className="mx-auto h-10 w-10 text-neutral-300 dark:text-neutral-600" />
                        <p className="mt-4 text-lg font-black text-neutral-900 dark:text-white">No community events yet</p>
                        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">Create the first event to activate resident engagement for this property.</p>
                    </div>
                </Card>
            ) : (
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    {events.map((item) => {
                        const attendeeCount = item.attendees?.filter((entry) => entry.status === 'going').length || 0;
                        const myResponse = item.attendees?.find((entry) => entry.user_id === profile?.id)?.status;
                        return (
                            <Card key={item.id} className="overflow-hidden">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${badgeTone[item.category]}`}>{item.category}</span>
                                            <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">{item.status}</span>
                                        </div>
                                        <h3 className="mt-3 text-2xl font-black tracking-tight text-neutral-900 dark:text-white">{item.title}</h3>
                                        <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-400">{item.description}</p>
                                    </div>
                                </div>
                                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                                    <div className="rounded-2xl bg-neutral-50 px-4 py-3 dark:bg-neutral-900/60">
                                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">When</p>
                                        <p className="mt-1 text-sm font-bold text-neutral-900 dark:text-white">{new Date(item.starts_at).toLocaleString()}</p>
                                    </div>
                                    <div className="rounded-2xl bg-neutral-50 px-4 py-3 dark:bg-neutral-900/60">
                                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">Venue</p>
                                        <p className="mt-1 text-sm font-bold text-neutral-900 dark:text-white">{item.venue}</p>
                                    </div>
                                    <div className="rounded-2xl bg-neutral-50 px-4 py-3 dark:bg-neutral-900/60">
                                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">Attendance</p>
                                        <p className="mt-1 text-sm font-bold text-neutral-900 dark:text-white">{attendeeCount}{item.capacity ? ` / ${item.capacity}` : ''}</p>
                                    </div>
                                </div>
                                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-700">
                                    <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-500 dark:text-neutral-400">
                                        <span className="inline-flex items-center gap-1"><UsersIcon className="h-4 w-4" /> Hosted by {item.host_name}</span>
                                        <span className="inline-flex items-center gap-1"><MapPinIcon className="h-4 w-4" /> {selectedProperty?.name}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => void handleRsvp(item.id, 'interested')} disabled={saving} className={`rounded-xl px-4 py-2 text-sm font-black ${myResponse === 'interested' ? 'bg-blue-600 text-white' : 'border border-neutral-300 bg-white text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white'}`}>Interested</button>
                                        <button onClick={() => void handleRsvp(item.id, 'going')} disabled={saving} className={`rounded-xl px-4 py-2 text-sm font-black ${myResponse === 'going' ? 'bg-emerald-600 text-white' : 'border border-emerald-300 bg-white text-emerald-700 dark:border-emerald-800 dark:bg-neutral-900 dark:text-emerald-300'}`}>Going</button>
                                    </div>
                                </div>
                                {item.attendees && item.attendees.length > 0 && (
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {item.attendees.slice(0, 6).map((attendee) => (
                                            <span key={`${item.id}_${attendee.user_id}`} className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                                                {attendee.name} • {attendee.status}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default CommunityEventsPage;
