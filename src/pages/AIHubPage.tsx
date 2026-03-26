
import React, { useState, useRef } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import Card from '../components/ui/Card';
import { SparklesIcon, CloudUploadIcon } from '../constants';
import Spinner from '../components/ui/Spinner';
import { analyzeImageWithPrompt, getQuickAiResponse } from '../services/api';
import MarketingPosterDesigner from '../components/ai/MarketingPosterDesigner';
import AppMarketingGenerator from '../components/ai/AppMarketingGenerator';
import QuickAssist from '../components/ai/QuickAssist';
import VideoPromoGenerator from '../components/ai/VideoPromoGenerator';

// --- Helper Functions ---

const blobToBase64 = (blob: globalThis.Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

// --- Child Components ---

const ImageAnalyzer: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState('');
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAnalyze = async () => {
        if (!file || !prompt) {
            setError("Please upload an image and enter a prompt.");
            return;
        }
        setLoading(true);
        setResult('');
        setError('');
        try {
            const base64 = await blobToBase64(file);
            const response = await analyzeImageWithPrompt(base64, file.type, prompt);
            setResult(response);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <h3 className="text-xl font-semibold text-blue-900 dark:text-slate-200">Image Analyzer</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Upload an image and ask questions about it (e.g., maintenance issues).</p>
            <div className="space-y-4">
                <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} ref={fileInputRef} className="hidden"/>
                <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:border-blue-500">
                    <CloudUploadIcon className="h-6 w-6 text-slate-400" />
                    <span>{file ? file.name : 'Select an image'}</span>
                </button>
                <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="e.g., 'What is this maintenance issue and how can I fix it?'" className="w-full form-input" rows={2}/>
                <button onClick={handleAnalyze} disabled={loading || !file || !prompt} className="btn btn-primary w-full">
                    {loading ? <Spinner /> : 'Analyze Image'}
                </button>
                {error && <p className="text-sm text-red-500">{error}</p>}
                {result && (
                    <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
                        <h4 className="font-semibold">Analysis Result:</h4>
                        <p className="text-sm whitespace-pre-wrap">{result}</p>
                    </div>
                )}
            </div>
        </Card>
    );
};

const LiveChat: React.FC = () => {
    const [input, setInput] = useState('');
    const [reply, setReply] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleAsk = async () => {
        if (!input.trim()) {
            setError('Please enter a question or task for the assistant.');
            return;
        }
        setLoading(true);
        setError('');
        setReply('');
        try {
            const response = await getQuickAiResponse(`You are Nilayam's live property operations assistant. Help with tenant communication, maintenance triage, rent reminders, agreements, and resident operations.\n\nUser request: ${input}`);
            setReply(response);
        } catch (err: any) {
            setError(err.message || 'Unable to get a response right now.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
             <h3 className="text-xl font-semibold text-blue-900 dark:text-slate-200">Live Operations Assistant</h3>
             <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Ask for help drafting notices, handling tenant issues, planning events, or resolving operational problems.</p>
             <div className="space-y-4">
                <textarea value={input} onChange={e => setInput(e.target.value)} className="w-full form-input" rows={4} placeholder="Example: Draft a polite rent reminder for a tenant who is 3 days late, or summarize what to do for an upcoming lease expiry." />
                <button onClick={handleAsk} disabled={loading || !input.trim()} className="btn btn-primary w-full">
                    {loading ? <Spinner /> : 'Ask Assistant'}
                </button>
                {error && <p className="text-sm text-red-500">{error}</p>}
                {reply && (
                    <div className="rounded-lg bg-slate-100 p-4 text-sm whitespace-pre-wrap dark:bg-slate-900/50">
                        {reply}
                    </div>
                )}
             </div>
        </Card>
    )
};

const AIHubPage: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in pb-20">
        <div className="flex flex-wrap gap-4 justify-between items-center">
            <h2 className="text-3xl font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-3">
                <SparklesIcon className="h-8 w-8 text-primary"/>
                AI Hub
            </h2>
        </div>
        <p className="text-neutral-500 dark:text-neutral-400 max-w-3xl">Explore various AI-powered tools to assist with property management tasks.</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <QuickAssist />
            <VideoPromoGenerator />
            <ImageAnalyzer />
            <MarketingPosterDesigner />
            <AppMarketingGenerator />
            <LiveChat />
        </div>
        <style>{`.form-input { display: block; width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #cbd5e1; border-radius: 0.375rem; background-color: white; color: #0f172a; } .dark .form-input { border-color: #475569; background-color: #334155; color: #f1f5f9; } .btn { padding: 0.5rem 1rem; border-radius: 0.5rem; font-weight: 600; transition: background-color 0.2s; } .btn-primary { background-color: #1e40af; color: white; } .dark .btn-primary { background-color: #2563eb; } .btn-primary:hover:not(:disabled) { background-color: #1e3a8a; } .dark .btn-primary:hover:not(:disabled) { background-color: #1d4ed8; } .btn:disabled { opacity: 0.6; cursor: not-allowed; }`}</style>
    </div>
  );
};

export default AIHubPage;
