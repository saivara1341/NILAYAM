

import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import Card from '../ui/Card';
import Spinner from '../ui/Spinner';

const MarketingPosterDesigner: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!prompt) return;
        setLoading(true);
        setError(null);
        setImageUrl(null);

        try {
            if (!process.env.API_KEY) throw new Error("API key not configured.");
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash-image',
              contents: {
                parts: [{ text: prompt }],
              },
            });
            
            let foundImage = false;
            // The response may contain multiple parts, iterate to find the image
            for (const part of response.candidates[0].content.parts) {
              if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                const url = `data:image/png;base64,${base64ImageBytes}`;
                setImageUrl(url);
                foundImage = true;
                break;
              }
            }
            if (!foundImage) {
                throw new Error("The model did not return an image. Please try refining your prompt.");
            }

        } catch (err: any) {
            setError(err.message || 'Failed to generate image.');
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <Card>
            <div className="space-y-4">
                <h3 className="text-xl font-semibold text-blue-900 dark:text-slate-200">Marketing Poster Designer</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Describe the poster you want to create for your property. Include details like style, colors, and text you want to feature.</p>
                <div>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g., 'A modern marketing poster for 'Sunshine Apartments'. Feature a sunny, luxurious swimming pool. Include the text 'Your new home awaits!' in an elegant font. Use a blue and gold color scheme.'"
                        className="w-full form-input"
                        rows={4}
                        disabled={loading}
                    />
                </div>
                <button onClick={handleGenerate} disabled={loading || !prompt.trim()} className="btn btn-primary w-full">
                    {loading ? 'Generating Poster...' : 'Generate Poster'}
                </button>

                {error && <p className="text-sm text-red-500">{error}</p>}
                
                <div className="mt-4 w-full aspect-[4/3] bg-slate-100 dark:bg-slate-900/50 rounded-lg flex items-center justify-center">
                    {loading && <Spinner />}
                    {!loading && imageUrl && <img src={imageUrl} alt={prompt} className="rounded-lg object-contain w-full h-full" />}
                    {!loading && !imageUrl && !error && <p className="text-slate-400">Your generated poster will appear here.</p>}
                </div>
            </div>
            <style>{`.form-input { display: block; width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #cbd5e1; border-radius: 0.375rem; background-color: white; color: #0f172a; } .dark .form-input { border-color: #475569; background-color: #334155; color: #f1f5f9; }`}</style>
        </Card>
    );
};

export default MarketingPosterDesigner;