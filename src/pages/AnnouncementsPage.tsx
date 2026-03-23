

import React, { useState, useCallback, useEffect } from 'react';
import Card from '../components/ui/Card';
import { createAnnouncement, getAnnouncements, getAllPropertiesForDropdown } from '../services/api';
import { Announcement } from '../types';
import PaginationControls from '../components/ui/PaginationControls';
import Spinner from '../components/ui/Spinner';
import { GoogleGenAI } from "@google/genai";

const AnnouncementCard: React.FC<{ announcement: Announcement, properties: {id: string, name: string}[] }> = ({ announcement, properties }) => {
    let audienceText = "All Tenants";
    if (announcement.audience === 'specific_building' && announcement.target_id) {
        const targetProperty = properties.find(p => p.id === announcement.target_id);
        audienceText = `Tenants at ${targetProperty?.name || 'a specific property'}`;
    }

    return (
        <Card>
            <div className="flex justify-between items-start">
                <h4 className="font-bold text-blue-900 dark:text-slate-200">{announcement.title}</h4>
                <div className="text-right">
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                        {new Date(announcement.created_at).toLocaleString()}
                    </p>
                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-1">
                        To: {audienceText}
                    </p>
                </div>
            </div>
            <p className="mt-2 text-slate-600 dark:text-slate-400 text-sm">{announcement.message}</p>
        </Card>
    )
};

const ITEMS_PER_PAGE = 5;

const AnnouncementsPage: React.FC = () => {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [properties, setProperties] = useState<{id: string, name: string}[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalAnnouncements, setTotalAnnouncements] = useState(0);

    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [audience, setAudience] = useState<'all_tenants' | 'specific_building'>('all_tenants');
    const [targetId, setTargetId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const fetchPageData = useCallback(async (page: number) => {
        setLoading(true);
        setError(null);
        try {
            if (properties.length === 0) {
                 const props = await getAllPropertiesForDropdown();
                 setProperties(props);
            }
            const { data, count } = await getAnnouncements(page, ITEMS_PER_PAGE);
            setAnnouncements(data);
            setTotalAnnouncements(count);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [properties.length]);

    useEffect(() => {
        fetchPageData(currentPage);
    }, [currentPage, fetchPageData]);

    const handleGenerateContent = async () => {
        if (!title) {
            alert("Please provide a title or topic for the announcement first.");
            return;
        }
        setIsGenerating(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Write a professional announcement message for tenants based on this topic: "${title}". Make it clear and concise.`;
            // Fix: Use gemini-3-flash-preview for creative text drafting
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt
            });
            setMessage(response.text || '');
        } catch (err) {
            console.error("AI generation failed:", err);
            alert("Failed to generate message.");
        } finally {
            setIsGenerating(false);
        }
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitError(null);
        try {
            await createAnnouncement({
                title,
                message,
                audience,
                target_id: audience === 'specific_building' ? targetId : null,
            });
            setTitle('');
            setMessage('');
            setAudience('all_tenants');
            setTargetId(null);
            
            if (currentPage === 1) {
                fetchPageData(1);
            } else {
                setCurrentPage(1);
            }
        } catch (err: any) {
            setSubmitError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderAnnouncements = () => {
        if (loading) return <div className="flex justify-center items-center h-64"><Spinner /></div>;
        if (error) return <p className="text-red-500 dark:text-red-400 text-center py-8">{error}</p>;
        if (announcements.length === 0) return <p className="text-slate-500 dark:text-slate-400 text-center py-8">You haven't sent any announcements yet.</p>;

        return (
            <div className="space-y-4">
                {announcements.map(ann => <AnnouncementCard key={ann.id} announcement={ann} properties={properties} />)}
            </div>
        )
    };
    
    const totalPages = Math.ceil(totalAnnouncements / ITEMS_PER_PAGE);
    
    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-3xl font-bold text-blue-900 dark:text-slate-200">Announcements</h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <Card>
                        <h3 className="text-xl font-semibold mb-4 text-blue-900 dark:text-slate-200">New Announcement</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="title" className="block text-sm font-medium text-slate-600 dark:text-slate-400">Title / Topic</label>
                                <input id="title" type="text" value={title} onChange={e => setTitle(e.target.value)} className="mt-1 w-full form-input" required />
                            </div>
                            <div>
                                <div className="flex justify-between items-center">
                                    <label htmlFor="message" className="block text-sm font-medium text-slate-600 dark:text-slate-400">Message</label>
                                    <button type="button" onClick={handleGenerateContent} disabled={isGenerating || !title} className="text-xs text-blue-600 font-semibold hover:underline disabled:opacity-50">
                                        {isGenerating ? 'Generating...' : 'Generate with AI'}
                                    </button>
                                </div>
                                <textarea id="message" value={message} onChange={e => setMessage(e.target.value)} rows={4} className="mt-1 w-full form-input" required />
                            </div>
                            <div>
                                <label htmlFor="audience" className="block text-sm font-medium text-slate-600 dark:text-slate-400">Audience</label>
                                <select id="audience" value={audience} onChange={e => setAudience(e.target.value as any)} className="mt-1 w-full form-input">
                                    <option value="all_tenants">All Tenants</option>
                                    <option value="specific_building">Specific Property</option>
                                </select>
                            </div>
                            {audience === 'specific_building' && (
                                <div>
                                    <label htmlFor="property" className="block text-sm font-medium text-slate-600 dark:text-slate-400">Property</label>
                                    <select id="property" value={targetId || ''} onChange={e => setTargetId(e.target.value)} className="mt-1 w-full form-input" required>
                                        <option value="" disabled>Select a property</option>
                                        {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                            )}
                            {submitError && <p className="text-sm text-red-500">{submitError}</p>}
                            <button type="submit" disabled={isSubmitting} className="w-full bg-blue-800 dark:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-900 dark:hover:bg-blue-700 transition-colors disabled:bg-slate-400">
                                {isSubmitting ? 'Sending...' : 'Send Announcement'}
                            </button>
                        </form>
                    </Card>
                </div>

                <div className="lg:col-span-2">
                     <h3 className="text-xl font-semibold mb-4 text-blue-900 dark:text-slate-200">Sent History</h3>
                     {renderAnnouncements()}
                     {totalPages > 1 && (
                        <div className="mt-4">
                            <PaginationControls
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                                itemsPerPage={ITEMS_PER_PAGE}
                                totalItems={totalAnnouncements}
                            />
                        </div>
                     )}
                </div>
            </div>
        </div>
    );
};

// Simple form input style for reuse
const formInputStyle = `block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-slate-700 text-blue-950 dark:text-slate-200`;
const style = document.createElement('style');
style.innerHTML = `.form-input { ${formInputStyle.replace(/\s+/g, ' ').trim()} }`;
document.head.appendChild(style);

export default AnnouncementsPage;