import React, { useState } from 'react';
import Card from '../ui/Card';
import { getQuickAiResponse } from '../../services/api';
import Spinner from '../ui/Spinner';

const BoltIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
);

const QuickAssist: React.FC = () => {
    const [input, setInput] = useState('');
    const [response, setResponse] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAsk = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;
        setLoading(true);
        try {
            const res = await getQuickAiResponse(input);
            setResponse(res);
        } catch (err) {
            setResponse("Sorry, I couldn't fetch a response right now.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/10 dark:to-orange-900/10 border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-yellow-400 text-white rounded-full">
                    <BoltIcon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-lg text-yellow-900 dark:text-yellow-100">Quick Assist (Flash Lite)</h3>
            </div>
            <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-4">
                Need a fast answer? Ask anything for a low-latency response.
            </p>
            <form onSubmit={handleAsk} className="flex gap-2 mb-4">
                <input 
                    type="text" 
                    value={input} 
                    onChange={(e) => setInput(e.target.value)} 
                    placeholder="e.g., Draft a polite noise complaint..." 
                    className="form-input flex-1"
                />
                <button type="submit" disabled={loading} className="btn bg-yellow-500 text-white hover:bg-yellow-600 disabled:opacity-50">
                    {loading ? '...' : 'Go'}
                </button>
            </form>
            {response && (
                <div className="p-3 bg-white dark:bg-neutral-800 rounded-lg border border-yellow-100 dark:border-yellow-900/30 animate-fade-in text-sm whitespace-pre-wrap text-neutral-800 dark:text-neutral-200">
                    {response}
                </div>
            )}
        </Card>
    );
};

export default QuickAssist;