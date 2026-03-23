
import React from 'react';
import { OccupancyDataPoint, OccupancyStatus } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';

interface OccupancyChartProps {
  data: OccupancyDataPoint[];
}

const COLORS: { [key in OccupancyStatus]: string } = {
  [OccupancyStatus.Occupied]: '#1d4ed8', // New primary color (blue-700)
  [OccupancyStatus.Vacant]: '#f59e0b', // amber-500
};

const OccupancyChart: React.FC<OccupancyChartProps> = ({ data }) => {
  const { theme } = useTheme();
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const circumference = 2 * Math.PI * 40; // r = 40

  if (total === 0) {
    return (
        <div className="flex items-center justify-center h-40 text-neutral-500 dark:text-neutral-400">
            No occupancy data.
        </div>
    );
  }

  let accumulated = 0;

  return (
    <div className="flex flex-col items-center justify-center py-2 space-y-4">
        <div className="relative w-36 h-36">
            <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="50" cy="50" r="40" className="stroke-neutral-100 dark:stroke-neutral-700/50" strokeWidth="12" fill="transparent" />
                {data.map((item) => {
                    const percent = item.value / total;
                    const strokeDashoffset = accumulated * circumference;
                    accumulated += percent;

                    return (
                        <circle
                            key={item.name}
                            cx="50"
                            cy="50"
                            r="40"
                            stroke={COLORS[item.name]}
                            strokeWidth="12"
                            fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={-strokeDashoffset}
                            className="transition-all duration-500"
                        />
                    );
                })}
            </svg>
             <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-neutral-800 dark:text-neutral-200">{total}</span>
                <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Units</span>
            </div>
        </div>

      <div className="w-full space-y-2 px-2">
        {data.map((item) => (
          <div key={item.name} className="flex justify-between items-center text-sm">
            <div className="flex items-center space-x-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[item.name] }}></span>
              <span className="text-neutral-600 dark:text-neutral-300 font-medium">{item.name}</span>
            </div>
            <span className="font-bold text-neutral-900 dark:text-neutral-100">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OccupancyChart;
