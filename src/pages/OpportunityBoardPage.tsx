import React, { useEffect, useMemo, useState } from 'react';
import Card from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';
import { BookingRecord, CRMWorkspace, LeadRecord, PropertyVisit } from '../types';
import { getCRMWorkspace, updateLeadStage } from '../services/api';
import { SearchIcon, BriefcaseIcon, CalendarDaysIcon, CreditCardIcon } from '../constants';

const stageOrder: LeadRecord['stage'][] = ['new', 'contacted', 'visit_scheduled', 'visit_completed', 'negotiation', 'booking_token', 'won', 'lost'];

const stageTone: Record<LeadRecord['stage'], string> = {
    new: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    contacted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    visit_scheduled: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
    visit_completed: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
    negotiation: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    booking_token: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    won: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    lost: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
};

const VisitItem: React.FC<{ visit: PropertyVisit }> = ({ visit }) => (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 px-4 py-4">
        <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-neutral-900 dark:text-white">Visit for lead {visit.lead_id}</p>
            <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                {visit.status}
            </span>
        </div>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{new Date(visit.scheduled_for).toLocaleString()}</p>
        {visit.notes && <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">{visit.notes}</p>}
    </div>
);

const BookingItem: React.FC<{ booking: BookingRecord }> = ({ booking }) => (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 px-4 py-4">
        <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-neutral-900 dark:text-white">{booking.booking_type.replace('_', ' ')} booking</p>
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                {booking.status}
            </span>
        </div>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">₹{booking.amount.toLocaleString('en-IN')} • Lead {booking.lead_id}</p>
        {booking.notes && <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">{booking.notes}</p>}
    </div>
);

const OpportunityBoardPage: React.FC = () => {
    const [workspace, setWorkspace] = useState<CRMWorkspace | null>(null);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [updatingLead, setUpdatingLead] = useState<string | null>(null);

    useEffect(() => {
        const loadWorkspace = async () => {
            setLoading(true);
            try {
                const data = await getCRMWorkspace();
                setWorkspace(data);
            } finally {
                setLoading(false);
            }
        };
        void loadWorkspace();
    }, []);

    const leads = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        return (workspace?.leads || []).filter((lead) => {
            if (!normalized) return true;
            return [lead.full_name, lead.phone_number, lead.source, lead.stage, lead.notes]
                .some((value) => String(value || '').toLowerCase().includes(normalized));
        });
    }, [query, workspace?.leads]);

    const updateStage = async (leadId: string, stage: LeadRecord['stage']) => {
        setUpdatingLead(leadId);
        try {
            const updated = await updateLeadStage(leadId, stage);
            if (!updated) return;
            setWorkspace((current) => current ? {
                ...current,
                leads: current.leads.map((lead) => lead.id === leadId ? updated : lead)
            } : current);
        } finally {
            setUpdatingLead(null);
        }
    };

    if (loading) return <div className="flex min-h-[40vh] items-center justify-center"><Spinner /></div>;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-neutral-900 dark:text-white">Lead & Booking CRM</h2>
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Track prospects from enquiry to visit, negotiation, booking token, and closure.</p>
                </div>
                <div className="grid grid-cols-3 gap-3 md:min-w-[360px]">
                    <Card className="p-4"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">Leads</p><p className="mt-2 text-2xl font-black text-neutral-900 dark:text-white">{workspace?.leads.length || 0}</p></Card>
                    <Card className="p-4"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">Visits</p><p className="mt-2 text-2xl font-black text-violet-600 dark:text-violet-400">{workspace?.visits.length || 0}</p></Card>
                    <Card className="p-4"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">Bookings</p><p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">{workspace?.bookings.length || 0}</p></Card>
                </div>
            </div>

            <Card>
                <div className="relative">
                    <SearchIcon className="absolute left-4 top-3.5 h-4 w-4 text-neutral-400" />
                    <input
                        type="text"
                        placeholder="Search lead, phone number, source, or stage..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full rounded-2xl border border-neutral-200 bg-white py-3 pl-11 pr-4 text-sm text-neutral-900 outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                    />
                </div>
            </Card>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <Card>
                    <div className="flex items-center gap-2 mb-4">
                        <BriefcaseIcon className="w-5 h-5 text-blue-600" />
                        <h3 className="text-xl font-bold text-neutral-900 dark:text-white">Lead Pipeline</h3>
                    </div>
                    <div className="space-y-4">
                        {leads.map((lead) => (
                            <div key={lead.id} className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900/60 p-4">
                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="text-sm font-bold text-neutral-900 dark:text-white">{lead.full_name}</p>
                                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${stageTone[lead.stage]}`}>
                                                {lead.stage.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{lead.phone_number} • {lead.source} • {lead.interested_in}</p>
                                        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">{lead.notes || 'No notes captured yet.'}</p>
                                    </div>
                                    <select
                                        value={lead.stage}
                                        onChange={(event) => void updateStage(lead.id, event.target.value as LeadRecord['stage'])}
                                        disabled={updatingLead === lead.id}
                                        className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                                    >
                                        {stageOrder.map((stage) => <option key={stage} value={stage}>{stage.replace('_', ' ')}</option>)}
                                    </select>
                                </div>
                            </div>
                        ))}
                        {leads.length === 0 && (
                            <div className="rounded-2xl border border-dashed border-neutral-300 px-6 py-10 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
                                No leads matched the current search.
                            </div>
                        )}
                    </div>
                </Card>

                <div className="space-y-6">
                    <Card>
                        <div className="flex items-center gap-2 mb-4">
                            <CalendarDaysIcon className="w-5 h-5 text-violet-600" />
                            <h3 className="text-xl font-bold text-neutral-900 dark:text-white">Visit Schedule</h3>
                        </div>
                        <div className="space-y-3">
                            {(workspace?.visits || []).map((visit) => <VisitItem key={visit.id} visit={visit} />)}
                            {(workspace?.visits || []).length === 0 && <p className="text-sm text-neutral-500 dark:text-neutral-400">Scheduled property visits will appear here.</p>}
                        </div>
                    </Card>

                    <Card>
                        <div className="flex items-center gap-2 mb-4">
                            <CreditCardIcon className="w-5 h-5 text-emerald-600" />
                            <h3 className="text-xl font-bold text-neutral-900 dark:text-white">Booking Tokens</h3>
                        </div>
                        <div className="space-y-3">
                            {(workspace?.bookings || []).map((booking) => <BookingItem key={booking.id} booking={booking} />)}
                            {(workspace?.bookings || []).length === 0 && <p className="text-sm text-neutral-500 dark:text-neutral-400">Received booking tokens and advances will appear here.</p>}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default OpportunityBoardPage;
