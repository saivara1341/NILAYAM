
import React from 'react';
import Card from '../ui/Card';
import { ServiceProvider, UserRole } from '../../types';
import { PhoneIcon, MessageCircleIcon, BadgeCheckIcon, BadgePercentIcon } from '../../constants';

interface ServiceProviderCardProps {
    provider: ServiceProvider;
    onContact: () => void;
    role?: UserRole | null;
}

const ServiceProviderCard: React.FC<ServiceProviderCardProps> = ({ provider, onContact, role }) => {
    return (
        <Card className="hover:border-blue-400 transition-colors group">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden border-2 border-white dark:border-neutral-600 shadow-sm">
                        <img
                            src={`https://api.dicebear.com/7.x/initials/svg?seed=${provider.name}`}
                            alt={provider.name}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div>
                        <h4 className="font-bold text-lg text-neutral-900 dark:text-white flex items-center gap-1.5">
                            {provider.name}
                            {provider.is_verified && <span><BadgeCheckIcon className="w-4 h-4 text-blue-500" /></span>}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-semibold px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-full border border-neutral-200 dark:border-neutral-700">
                                {provider.category}
                            </span>
                            <div className="flex items-center gap-1 text-green-600 dark:text-green-400" title="No commission fees">
                                <BadgePercentIcon className="w-3.5 h-3.5" />
                                <span className="text-xs font-bold">Zero Brokerage</span>
                            </div>
                        </div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1.5 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            {provider.location}
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="flex items-center gap-1 justify-end text-yellow-500 font-bold text-sm">
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.368 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.368-2.448a1 1 0 00-1.176 0l-3.368 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.24 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69L9.049 2.927z" /></svg>
                        {provider.rating}
                    </div>
                    <p className="text-xs text-neutral-400">{provider.jobs_completed}+ jobs</p>
                </div>
            </div>

            <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-300 line-clamp-2">
                {provider.description}
            </p>

            <div className="flex gap-2 mt-4">
                <button
                    onClick={onContact}
                    className="flex-1 bg-green-600 text-white py-2 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 hover:bg-green-700 transition-colors shadow-sm"
                >
                    <MessageCircleIcon className="w-4 h-4" /> WhatsApp
                </button>
                <a
                    href={`tel:${provider.phone_number}`}
                    className="flex-1 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-600 py-2 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                >
                    <PhoneIcon className="w-4 h-4" /> Call
                </a>
                {role === 'owner' && (
                    <button
                        className="flex-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 py-2 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                    >
                        <BadgeCheckIcon className="w-4 h-4" /> RWA Approve
                    </button>
                )}
            </div>
        </Card>
    );
};

export default ServiceProviderCard;
