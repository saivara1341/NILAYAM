
import React, { useState } from 'react';
import Card from '../ui/Card';
import { SparklesIcon, ZapIcon, ArrowLeftIcon } from '../../constants';

const RentOptimizer: React.FC = () => {
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [optimizationResult, setOptimizationResult] = useState<any | null>(null);

    const handleOptimize = () => {
        setIsOptimizing(true);
        setTimeout(() => {
            setOptimizationResult({
                suggestions: [
                    { building: 'Skyline Heights', currentRent: '₹45,000', suggestedRent: '₹48,500', reason: 'High demand in Sector 62', gain: '+₹3,500' },
                    { building: 'Green Valley', currentRent: '₹32,000', suggestedRent: '₹33,500', reason: 'Inflation adjustment', gain: '+₹1,500' }
                ],
                totalGain: '₹5,000'
            });
            setIsOptimizing(false);
        }, 2000);
    };

    return (
        <Card className="overflow-hidden border-none shadow-2xl relative">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-neutral-900 to-black -z-10"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-3xl -z-10 rounded-full"></div>
            
            <div className="p-8">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-600 rounded-lg text-white shadow-lg shadow-blue-600/20">
                        <SparklesIcon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Advanced Agentic AI</span>
                </div>

                <h3 className="text-2xl font-black text-white tracking-tight mb-2">Rent Value Optimizer</h3>
                <p className="text-neutral-400 text-sm max-w-lg mb-8">Deploy our AI agent to scan local market listings and historical occupancy to optimize your rental income autonomously.</p>

                {!optimizationResult && !isOptimizing && (
                    <button 
                        onClick={handleOptimize}
                        className="px-8 py-3 bg-white text-neutral-900 font-black text-sm rounded-xl hover:bg-blue-50 transition-all active:scale-95 shadow-xl"
                    >
                        RUN OPTIMIZATION SCAN
                    </button>
                )}

                {isOptimizing && (
                    <div className="flex items-center gap-4 py-4">
                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm font-bold text-blue-400 animate-pulse">Scanning market trends in your area...</span>
                    </div>
                )}

                {optimizationResult && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {optimizationResult.suggestions.map((s: any, i: number) => (
                                <div key={i} className="bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-2xl">
                                    <div className="flex justify-between items-start mb-3">
                                        <h4 className="font-black text-blue-400 text-sm">{s.building}</h4>
                                        <span className="text-[10px] font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">{s.gain} monthly</span>
                                    </div>
                                    <div className="flex items-center gap-4 mb-4">
                                        <div>
                                            <p className="text-[9px] uppercase text-neutral-500 font-bold mb-1">Current</p>
                                            <p className="text-white font-black">{s.currentRent}</p>
                                        </div>
                                        <div className="text-neutral-600">
                                            <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                                        </div>
                                        <div>
                                            <p className="text-[9px] uppercase text-blue-500 font-bold mb-1">AI Suggests</p>
                                            <p className="text-blue-400 font-black">{s.suggestedRent}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-neutral-400 bg-black/20 p-2 rounded-lg">
                                        <ZapIcon className="w-3 h-3 text-orange-500" />
                                        {s.reason}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/5">
                            <p className="text-sm text-neutral-500 font-medium italic">Potential Annual Gain: <span className="text-green-400 font-black not-italic">₹60,000</span></p>
                            <button className="text-xs font-black text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-[0.1em]" onClick={() => setOptimizationResult(null)}>
                                Recalibrate &rarr;
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
};

export default RentOptimizer;
