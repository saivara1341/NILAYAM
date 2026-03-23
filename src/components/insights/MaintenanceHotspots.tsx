import React, { useEffect, useState } from 'react';
import { getAllMaintenanceRequests } from '../../services/api';
import { MaintenanceRequest } from '../../types';

const MaintenanceHotspots: React.FC = () => {
    const [maintenanceRequests, setRequests] = useState<MaintenanceRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string|null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const data = await getAllMaintenanceRequests();
                setRequests(data);
            } catch(e: any) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[300px] text-slate-500 dark:text-slate-400">
                Loading data...
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-[300px] text-red-500 dark:text-red-400 text-center p-4">
                {error}
            </div>
        );
    }
    
    const requestCounts = maintenanceRequests.reduce((acc, req) => {
        const name = req.building_name || 'Unknown Property';
        acc[name] = (acc[name] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const chartData = Object.entries(requestCounts)
        .sort(([, countA], [, countB]) => (countB as number) - (countA as number))
        .slice(0, 5); // Show top 5

    if (chartData.length === 0) {
        return (
            <div className="flex items-center justify-center h-[300px] text-slate-500 dark:text-slate-400">
                No maintenance requests found.
            </div>
        );
    }

    const maxVal = Math.max(...chartData.map(([, val]) => val as number), 1);
    const chartHeight = 250;
    const barHeight = 30;
    const gap = 15;

    return (
        <div className="w-full h-[300px] p-4">
            <svg width="100%" height="100%" viewBox={`0 0 500 ${chartHeight + 20}`}>
                {chartData.map(([name, value], index) => {
                    const y = index * (barHeight + gap);
                    const barWidth = ((value as number) / maxVal) * 350; // Max width of bar
                    return (
                        <g key={name as string}>
                            <text x="0" y={y + barHeight / 2} dy=".35em" fontSize="12" className="fill-slate-500 dark:fill-slate-400 truncate" width="100">{name}</text>
                            <rect
                                x={120}
                                y={y}
                                width={barWidth}
                                height={barHeight}
                                className="fill-orange-500"
                                rx="4"
                            />
                            <text x={125 + barWidth} y={y + barHeight / 2} dy=".35em" fontSize="12" className="fill-slate-700 dark:fill-slate-200 font-semibold">{value}</text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};

export default MaintenanceHotspots;