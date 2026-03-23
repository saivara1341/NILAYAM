
import React, { useState, useRef, useEffect } from 'react';
import Card from '../ui/Card';
import { generatePropertyVideo } from '../../services/api';
import Spinner from '../ui/Spinner';
import { VideoIcon, CloudUploadIcon, SparklesIcon } from '../../constants';

// Fixed: Removed conflicting local Window interface declaration for aistudio

const LOADING_MESSAGES = [
    "Imagining the cinematic landscape...",
    "Setting up virtual cameras and lighting...",
    "Simulating modern architectural vibes...",
    "Polishing frames for 1080p brilliance...",
    "Applying high-end textures and reflections...",
    "Almost ready to export your masterpiece...",
];

const VideoPromoGenerator: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        let interval: any;
        if (loading) {
            interval = setInterval(() => {
                setLoadingMsgIdx(prev => (prev + 1) % LOADING_MESSAGES.length);
            }, 12000); // Veo generation is slow, rotate messages slowly
        } else {
            setLoadingMsgIdx(0);
        }
        return () => clearInterval(interval);
    }, [loading]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = (reader.result as string).split(',')[1];
                setImageBase64(base64);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            setError("Please provide a description of the video you'd like to create.");
            return;
        }

        setError(null);
        setLoading(true);

        try {
            // Fixed: Safely accessing pre-configured aistudio helpers via window casting
            const aistudio = (window as any).aistudio;
            
            // Mandatory check for paid API key when using Veo
            const hasKey = await aistudio.hasSelectedApiKey();
            if (!hasKey) {
                await aistudio.openSelectKey();
                // Assume success and proceed as per instructions
            }

            const url = await generatePropertyVideo(prompt, imageBase64 || undefined);
            setVideoUrl(url);
        } catch (err: any) {
            const aistudio = (window as any).aistudio;
            if (err.message?.includes("Requested entity was not found")) {
                setError("API configuration error. Please re-select your paid API key.");
                await aistudio.openSelectKey();
            } else {
                setError(err.message || "Video generation failed. Please try a different prompt.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="border-l-4 border-blue-600 bg-gradient-to-br from-blue-50/30 to-white dark:from-blue-900/5 dark:to-neutral-900">
            <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-blue-600 text-white rounded-lg shadow-lg shadow-blue-500/30">
                    <VideoIcon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-xl text-neutral-900 dark:text-white">Cinematic Property Promo (Veo 3.1)</h3>
            </div>
            
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
                Generate a professional 1080p marketing video for your property vacancies. Describe the atmosphere and style you want.
            </p>

            <div className="space-y-4">
                <textarea
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    rows={3}
                    className="w-full form-input resize-none"
                    placeholder="e.g., A slow cinematic drone shot of a modern apartment balcony at golden hour. Warm interior lights glowing, city skyline in the background. High-end, premium feel."
                    disabled={loading}
                />

                <div className="flex gap-4">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Start Frame (Optional)</label>
                        <input type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} className="hidden" />
                        <button 
                            type="button" 
                            onClick={() => fileInputRef.current?.click()}
                            className={`w-full h-12 flex items-center justify-center gap-2 border-2 border-dashed rounded-xl transition-all ${imageBase64 ? 'border-green-500 bg-green-50/50 text-green-700' : 'border-neutral-300 dark:border-neutral-700 hover:border-blue-500 text-neutral-400'}`}
                        >
                            {imageBase64 ? <><CheckCircleIcon className="w-4 h-4"/> Image Selected</> : <><CloudUploadIcon className="w-4 h-4"/> Upload Reference</>}
                        </button>
                    </div>
                    <div className="flex-1 flex items-end">
                        <button 
                            onClick={handleGenerate}
                            disabled={loading || !prompt.trim()}
                            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? <Spinner /> : <><SparklesIcon className="w-4 h-4"/> Generate Video</>}
                        </button>
                    </div>
                </div>

                {loading && (
                    <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl animate-pulse">
                        <p className="text-center text-blue-700 dark:text-blue-300 font-semibold text-sm">
                            {LOADING_MESSAGES[loadingMsgIdx]}
                        </p>
                        <p className="text-center text-blue-500 dark:text-blue-400 text-[10px] mt-1">
                            This typically takes 2-3 minutes. Please stay on this page.
                        </p>
                    </div>
                )}

                {error && (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm flex gap-2">
                        <span className="shrink-0">⚠️</span>
                        <p>{error}</p>
                    </div>
                )}

                {videoUrl && (
                    <div className="mt-6 animate-fade-in">
                        <div className="bg-neutral-900 rounded-2xl overflow-hidden shadow-2xl relative border-4 border-white dark:border-neutral-800">
                             <video 
                                src={videoUrl} 
                                controls 
                                className="w-full aspect-video"
                                autoPlay
                                loop
                             />
                             <div className="absolute top-4 right-4 flex gap-2">
                                <a 
                                    href={videoUrl} 
                                    download="property_promo.mp4"
                                    className="bg-white/90 backdrop-blur-md text-neutral-900 p-2 rounded-full shadow-lg hover:bg-white transition-colors"
                                    title="Download Video"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1m-4-4-4 4m0 0-4-4m4 4V4"/></svg>
                                </a>
                             </div>
                        </div>
                        <p className="text-center text-neutral-500 text-xs mt-3">Generated using Google Veo 3.1 &bull; 1080p</p>
                    </div>
                )}
            </div>
        </Card>
    );
};

// Internal icon for checkmark
const CheckCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
);

export default VideoPromoGenerator;
