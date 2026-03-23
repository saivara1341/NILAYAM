import React from 'react';
import { FinancialDataPoint } from '../../types';

interface ProfitLossChartProps {
  data: FinancialDataPoint[];
}

const ProfitLossChart: React.FC<ProfitLossChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
        <div className="flex items-center justify-center h-[300px] text-slate-500 dark:text-slate-400">
            No financial data to display.
        </div>
    );
  }

  const chartData = data.map(d => ({ ...d, net: d.income - d.expenses }));
  const maxNet = Math.max(...chartData.map(d => d.net), 0);
  const minNet = Math.min(...chartData.map(d => d.net), 0);
  
  const range = maxNet - minNet;
  const chartHeight = 250;
  const chartWidth = 500;

  const getPoints = () => {
    return chartData.map((item, index) => {
        const x = (index / (chartData.length - 1)) * chartWidth;
        const y = chartHeight - ((item.net - minNet) / (range || 1)) * chartHeight;
        return `${x},${y}`;
    }).join(' ');
  };
  
  return (
    <div className="w-full h-[300px] p-4">
      <svg width="100%" height="100%" viewBox={`-10 -10 ${chartWidth + 50} ${chartHeight + 50}`}>
        {/* Y-axis labels */}
        <text x="0" y="0" fontSize="12" className="fill-slate-500 dark:fill-slate-400" textAnchor="end">{maxNet.toLocaleString()}</text>
        <text x="0" y={chartHeight/2} fontSize="12" className="fill-slate-500 dark:fill-slate-400" textAnchor="end">{(minNet + range/2).toLocaleString()}</text>
        <text x="0" y={chartHeight} fontSize="12" className="fill-slate-500 dark:fill-slate-400" textAnchor="end">{minNet.toLocaleString()}</text>
        
        {/* Zero line */}
        <line 
            x1="0" 
            x2={chartWidth} 
            y1={chartHeight - ((-minNet) / (range || 1)) * chartHeight} 
            y2={chartHeight - ((-minNet) / (range || 1)) * chartHeight} 
            className="stroke-slate-300 dark:stroke-slate-600" 
            strokeDasharray="4" 
        />
        
        {/* Main line */}
        <polyline
            fill="none"
            className="stroke-blue-500"
            strokeWidth="2"
            points={getPoints()}
        />

        {/* Data points */}
        {chartData.map((item, index) => {
            const x = (index / (chartData.length - 1)) * chartWidth;
            const y = chartHeight - ((item.net - minNet) / (range || 1)) * chartHeight;
            return (
                <g key={item.month}>
                    <circle cx={x} cy={y} r="4" className="fill-blue-500" />
                    <text x={x} y={chartHeight + 20} textAnchor="middle" fontSize="12" className="fill-slate-500 dark:fill-slate-400">
                        {item.month}
                    </text>
                </g>
            );
        })}
      </svg>
    </div>
  );
};

export default ProfitLossChart;
