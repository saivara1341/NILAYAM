

import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import Card from '../ui/Card';
import Spinner from '../ui/Spinner';

const ShareIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/></svg>
);

const AppMarketingGenerator: React.FC = () => {
    const [topic, setTopic] = useState('');
    const [platform, setPlatform] = useState('Twitter');
    const [generatedContent, setGeneratedContent] = useState('');
    const [loading, setLoading] = useState(false);

    const handleGenerate = async () => {
        if (!topic) return;
        setLoading(true);
        try {
            if (!process.env.API_KEY) throw new Error("API key missing");
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            // Fix: Use gemini-3-flash-preview for creative social media copywriting tasks
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Write a creative and engaging ${platform} post about: ${topic}. Include relevant hashtags and emojis. The tone should be professional yet inviting for potential tenants or investors.`,
            });
            setGeneratedContent(response.text || '');
        } catch (error) {
            console.error(error);
            setGeneratedContent('Error generating content. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <h3 className="text-xl font-semibold text-blue-900 dark:text-slate-200 flex items-center gap-2">
                <ShareIcon className="w-6 h-6" /> Social Media Generator
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Create engaging social media posts for your properties or announcements.</p>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">Topic / Property</label>
                    <input 
                        type="text" 
                        value={topic} 
                        onChange={(e) => setTopic(e.target.value)} 
                        placeholder="e.g., New 2BHK vacancy in Sunshine Apts" 
                        className="w-full form-input"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">Platform</label>
                    <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-full form-input">
                        <option value="Twitter">Twitter / X</option>
                        <option value="Instagram">Instagram Caption</option>
                        <option value="LinkedIn">LinkedIn</option>
                        <option value="Facebook">Facebook</option>
                        <option value="Email">Email Newsletter</option>
                    </select>
                </div>
                <button onClick={handleGenerate} disabled={loading || !topic} className="btn btn-primary w-full">
                    {loading ? 'Generating...' : 'Generate Content'}
                </button>
                {generatedContent && (
                    <div className="p-3 bg-slate-100 dark:bg-slate-900/50 rounded-lg whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                        {generatedContent}
                    </div>
                )}
            </div>
            <style>{`.form-input { display: block; width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #cbd5e1; border-radius: 0.375rem; background-color: white; color: #0f172a; } .dark .form-input { border-color: #475569; background-color: #334155; color: #f1f5f9; }`}</style>
        </Card>
    );
};

export default AppMarketingGenerator;