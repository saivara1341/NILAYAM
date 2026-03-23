import React, { useEffect, useState } from 'react';
import Card from '../ui/Card';
import { getRealEstateMarketTrends } from '../../services/api';
import Spinner from '../ui/Spinner';

const GlobeIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
);

const MarketTrends: React.FC = () => {
    const [trends, setTrends] = useState<{ content: string; sources: any[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTrends = async () => {
            try {
                const data = await getRealEstateMarketTrends();
                setTrends(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchTrends();
    }, []);

    if (loading) return <Card><div className="h-48 flex items-center justify-center"><Spinner /></div></Card>;
    if (error) return <Card><div className="text-red-500 p-4">Failed to load market trends.</div></Card>;
    if (!trends) return null;

    return (
        <Card className="border-l-4 border-purple-500">
            <h3 className="text-xl font-bold text-purple-900 dark:text-purple-200 flex items-center gap-2 mb-4">
                <GlobeIcon className="w-6 h-6" />
                Live Market Intelligence
            </h3>
            <div className="prose dark:prose-invert max-w-none">
                <p className="whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-300">{trends.content}</p>
            </div>
            {trends.sources && trends.sources.length > 0 && (
                <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                    <p className="text-xs font-semibold text-neutral-500 uppercase mb-2">Sources (Google Search)</p>
                    <div className="flex flex-wrap gap-2">
                        {trends.sources.map((source: any, idx: number) => (
                            <a 
                                key={idx} 
                                href={source.web?.uri} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs bg-neutral-100 dark:bg-neutral-700 text-blue-600 dark:text-blue-400 px-2 py-1 rounded hover:underline truncate max-w-[200px]"
                            >
                                {source.web?.title || 'Source'}
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </Card>
    );
};

export default MarketTrends;