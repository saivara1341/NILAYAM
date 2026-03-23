import React from 'react';
import { FinancialDataPoint } from '../../types';

interface FinancialSummaryChartProps {
  data: FinancialDataPoint[];
}

const FinancialSummaryChart: React.FC<FinancialSummaryChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
        <div className="flex items-center justify-center h-[300px] text-neutral-500 dark:text-neutral-400">
            No financial data to display.
        </div>
    );
  }

  const maxVal = Math.max(...data.flatMap(d => [d.income, d.expenses]), 1); 
  const chartHeight = 250;
  const barWidth = 20;
  const gap = 30;

  return (
    <div className="w-full h-[300px] p-4 group">
      <svg width="100%" height="100%" viewBox={`0 -20 ${(barWidth * 2 + gap) * data.length} ${chartHeight + 60}`}>
        <line x1="30" x2={(barWidth * 2 + gap) * data.length} y1={chartHeight} y2={chartHeight} className="stroke-neutral-200 dark:stroke-neutral-700" />

        {data.map((item, index) => {
          const x = index * (barWidth * 2 + gap) + 40;
          const incomeHeight = item.income > 0 ? (item.income / maxVal) * chartHeight : 0;
          const expensesHeight = item.expenses > 0 ? (item.expenses / maxVal) * chartHeight : 0;
          return (
            <g key={item.month} className="transition-opacity duration-200 opacity-80 group-hover:opacity-100 hover:!opacity-100">
              <rect
                x={x}
                y={chartHeight - incomeHeight}
                width={barWidth}
                height={incomeHeight}
                className="fill-primary"
                rx="4"
              />
              <rect
                x={x + barWidth + 5}
                y={chartHeight - expensesHeight}
                width={barWidth}
                height={expensesHeight}
                className="fill-red-500"
                rx="4"
              />
               <text x={x + barWidth + 2.5} y={chartHeight + 20} textAnchor="middle" fontSize="12" className="fill-neutral-500 dark:fill-neutral-400">
                {item.month}
              </text>
              <foreignObject x={x - 10} y={chartHeight - Math.max(incomeHeight, expensesHeight) - 40} width="100" height="40">
                <div className="hidden group-hover:block text-center bg-neutral-800 dark:bg-neutral-900 text-white text-xs rounded-md px-2 py-1 shadow-lg">
                  <div>Inc: ₹{item.income.toLocaleString()}</div>
                  <div>Exp: ₹{item.expenses.toLocaleString()}</div>
                </div>
              </foreignObject>
            </g>
          );
        })}
        <g transform="translate(40, -10)">
            <rect x="0" y="0" width="12" height="12" className="fill-primary" rx="2" />
            <text x="18" y="10" fontSize="12" className="fill-neutral-600 dark:fill-neutral-300">Income</text>
            <rect x="80" y="0" width="12" height="12" className="fill-red-500" rx="2" />
            <text x="98" y="10" fontSize="12" className="fill-neutral-600 dark:fill-neutral-300">Expenses</text>
        </g>
      </svg>
    </div>
  );
};

export default FinancialSummaryChart;