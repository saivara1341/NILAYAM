
import React, { useEffect, useState } from 'react';
import { ForecastDataPoint, FinancialDataPoint } from '../../types';
import { generateRevenueForecast, getMonthlyFinancialsForInsights } from '../../services/api';
import Spinner from '../ui/Spinner';

const PredictiveRevenueChart: React.FC = () => {
    const [historicalData, setHistoricalData] = useState<FinancialDataPoint[]>([]);
    const [forecast, setForecast] = useState<ForecastDataPoint[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const history = await getMonthlyFinancialsForInsights();
                setHistoricalData(history);
                
                const prediction = await generateRevenueForecast(history);
                setForecast(prediction);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    if (loading) return <div className="h-64 flex items-center justify-center"><Spinner /></div>;

    const chartHeight = 250;
    const chartWidth = 600;
    const padding = 40;

    // Combine for visualization scaling
    const allIncomes = [
        ...historicalData.map(d => d.income), 
        ...forecast.map(d => d.predictedIncome)
    ];
    const maxVal = Math.max(...allIncomes, 10000) * 1.1;

    const getX = (index: number, total: number) => padding + (index / (total - 1)) * (chartWidth - 2 * padding);
    const getY = (val: number) => chartHeight - padding - (val / maxVal) * (chartHeight - 2 * padding);

    const totalPoints = historicalData.length + forecast.length;

    // Path for historical
    let historyPath = "";
    historicalData.forEach((d, i) => {
        const x = getX(i, totalPoints);
        const y = getY(d.income);
        historyPath += `${i === 0 ? 'M' : 'L'} ${x} ${y} `;
    });

    // Path for forecast (starts from last historical point)
    let forecastPath = "";
    if (historicalData.length > 0) {
        const lastHist = historicalData[historicalData.length - 1];
        forecastPath = `M ${getX(historicalData.length - 1, totalPoints)} ${getY(lastHist.income)} `;
    }
    forecast.forEach((d, i) => {
        const x = getX(historicalData.length + i, totalPoints);
        const y = getY(d.predictedIncome);
        forecastPath += `L ${x} ${y} `;
    });

    return (
        <div className="w-full overflow-x-auto">
            <div className="min-w-[600px]">
                <div className="flex justify-between items-center mb-4 px-4">
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 bg-blue-600 rounded-full"></span>
                        <span className="text-xs text-neutral-600 dark:text-neutral-400">Historical</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 border-2 border-purple-500 border-dashed rounded-full"></span>
                        <span className="text-xs text-neutral-600 dark:text-neutral-400">AI Forecast</span>
                    </div>
                </div>
                
                <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
                    {/* Grid Lines */}
                    <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} className="stroke-neutral-200 dark:stroke-neutral-700" />
                    <line x1={padding} y1={padding} x2={padding} y2={chartHeight - padding} className="stroke-neutral-200 dark:stroke-neutral-700" />

                    {/* Historical Line */}
                    <path d={historyPath} fill="none" stroke="#2563eb" strokeWidth="3" />
                    
                    {/* Forecast Line (Dashed) */}
                    <path d={forecastPath} fill="none" stroke="#a855f7" strokeWidth="3" strokeDasharray="5,5" />

                    {/* Historical Points */}
                    {historicalData.map((d, i) => (
                        <g key={`hist-${i}`}>
                            <circle cx={getX(i, totalPoints)} cy={getY(d.income)} r="4" className="fill-blue-600" />
                            <text x={getX(i, totalPoints)} y={chartHeight - 10} textAnchor="middle" className="text-[10px] fill-neutral-500">{d.month}</text>
                        </g>
                    ))}

                    {/* Forecast Points */}
                    {forecast.map((d, i) => (
                        <g key={`fore-${i}`}>
                            <circle cx={getX(historicalData.length + i, totalPoints)} cy={getY(d.predictedIncome)} r="4" className="fill-purple-500" />
                            <text x={getX(historicalData.length + i, totalPoints)} y={chartHeight - 10} textAnchor="middle" className="text-[10px] fill-purple-500 font-bold">{d.month}</text>
                            <text x={getX(historicalData.length + i, totalPoints)} y={getY(d.predictedIncome) - 10} textAnchor="middle" className="text-[10px] fill-purple-500 font-bold">₹{d.predictedIncome/1000}k</text>
                        </g>
                    ))}
                </svg>
            </div>
        </div>
    );
};

export default PredictiveRevenueChart;
