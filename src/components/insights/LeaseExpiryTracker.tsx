import React, { useState } from 'react';
import { LeaseExpiry } from '../../types';
import { createAnnouncement } from '../../services/api';

interface LeaseExpiryTrackerProps {
  data: LeaseExpiry[];
}

const LeaseExpiryTracker: React.FC<LeaseExpiryTrackerProps> = ({ data }) => {
    const [notifyingId, setNotifyingId] = useState<string | null>(null);
    const [notifiedIds, setNotifiedIds] = useState<string[]>([]);

    if (!data || data.length === 0) {
        return <p className="text-slate-500 dark:text-slate-400 text-center py-8">No upcoming lease expiries in the next 90 days.</p>;
    }

    const handleNotify = async (lease: LeaseExpiry) => {
        const confirmation = window.confirm(
            `You are about to send a lease expiry notification for Unit ${lease.house_number} in ${lease.building_name}.\n\nThis announcement will be visible to ALL tenants in that property. Do you wish to continue?`
        );
        if (!confirmation) {
            return;
        }

        setNotifyingId(lease.house_id);
        try {
            const title = `Lease Expiry Notice: Unit ${lease.house_number}`;
            const message = `This is a reminder regarding the upcoming lease expiry for unit ${lease.house_number} on ${new Date(lease.lease_end_date).toLocaleDateString()}. Please contact management to discuss renewal options.`;

            await createAnnouncement({
                title,
                message,
                audience: 'specific_building',
                target_id: lease.building_id,
            });

            setNotifiedIds(prev => [...prev, lease.house_id]);
        } catch (error) {
            console.error("Failed to send notification:", error);
            alert(`Failed to send notification: ${(error as Error).message}`);
        } finally {
            setNotifyingId(null);
        }
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const isExpiringSoon = (dateStr: string) => {
        const expiryDate = new Date(dateStr);
        return expiryDate >= today && expiryDate <= thirtyDaysFromNow;
    }

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-700/50">
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Tenant</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Property</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Unit</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Expiry Date</th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                    {data.map((lease) => (
                        <tr key={lease.house_id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-950 dark:text-slate-200">{lease.tenant_name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{lease.building_name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{lease.house_number}</td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${isExpiringSoon(lease.lease_end_date) ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                {new Date(lease.lease_end_date).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button
                                    onClick={() => handleNotify(lease)}
                                    disabled={notifyingId === lease.house_id || notifiedIds.includes(lease.house_id)}
                                    className="px-3 py-1 text-xs font-semibold rounded-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-900/80"
                                >
                                    {notifiedIds.includes(lease.house_id) 
                                        ? 'Notified' 
                                        : (notifyingId === lease.house_id ? 'Sending...' : 'Notify Tenant')}
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default LeaseExpiryTracker;