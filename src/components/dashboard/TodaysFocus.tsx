
import React, { useState, useEffect } from 'react';
import { TodaysFocusItem } from '../../types';
import { getTodaysFocusSuggestions } from '../../services/api';
import Card from '../ui/Card';
import { Link } from 'react-router-dom';
import { TargetIcon } from '../../constants';

const cardBorderStyles = {
    High: 'border-red-500 dark:border-red-500',
    Medium: 'border-yellow-500 dark:border-yellow-500',
    Low: 'border-green-500 dark:border-green-500',
};

const badgeStyles = {
    High: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    Medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    Low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
};

const FocusItem: React.FC<{ item: TodaysFocusItem }> = ({ item }) => {
    const content = (
        <Card className={`border-l-4 ${cardBorderStyles[item.priority]} overflow-hidden flex flex-col h-full`}>
            <div className="flex justify-between items-start gap-3 mb-1">
                <h4 className="font-semibold text-blue-900 dark:text-slate-200 text-sm sm:text-base leading-tight break-words flex-1">{item.title}</h4>
                <span className={`flex-shrink-0 px-2 py-0.5 text-xs font-bold rounded-full whitespace-nowrap ${badgeStyles[item.priority]}`}>{item.priority}</span>
            </div>
            <p className="mt-1 text-slate-600 dark:text-slate-400 text-sm flex-1">{item.description}</p>
        </Card>
    );

    if (item.link) {
        return <Link to={item.link} className="block h-full hover:scale-[1.02] transition-transform duration-200">{content}</Link>
    }
    return content;
};


const TodaysFocus: React.FC = () => {
    const [items, setItems] = useState<TodaysFocusItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchFocusItems = async () => {
            setLoading(true);
            try {
                const suggestions = await getTodaysFocusSuggestions();
                setItems(suggestions);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchFocusItems();
    }, []);
    
    return (
        <div>
            <h3 className="text-xl font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2 mb-4">
                <TargetIcon className="w-6 h-6"/>
                Today's Focus (AI-Generated)
            </h3>
            {loading && <div className="text-slate-500">Generating today's priorities...</div>}
            {error && <div className="text-red-500">{error}</div>}
            {!loading && items.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((item, index) => <FocusItem key={index} item={item} />)}
                </div>
            )}
             {!loading && items.length === 0 && <div className="text-slate-500">No priority items for today. Looks like a clear day!</div>}
        </div>
    );
};

export default TodaysFocus;
