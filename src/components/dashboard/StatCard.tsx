
import React from 'react';
import Card from '../ui/Card';
import { Link } from 'react-router-dom';

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  isWarning?: boolean;
  linkTo?: string;
  customColor?: string;
}

const StatCard: React.FC<StatCardProps> = React.memo(({ label, value, icon, isWarning = false, linkTo, customColor }) => {
  const hasWarningValue = value !== '0' && value !== '₹0' && value !== '0%';
  const showWarningStyle = isWarning && hasWarningValue;

  const cardContent = (
    <Card className={`relative overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-xl h-full border-neutral-100/50 dark:border-neutral-800/50 ${customColor || ''}`}>
       <div className="absolute -top-4 -right-4 w-20 h-20 opacity-[0.05] dark:opacity-[0.1] rotate-12 transition-transform group-hover:rotate-0 duration-700">
        {icon}
      </div>
      <div className="flex items-center space-x-5">
        <div className={`p-4 rounded-2xl transition-colors duration-300 ${customColor ? 'bg-white/20 text-white' : 'bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 shadow-sm'}`}>
           {React.cloneElement(icon as React.ReactElement<any>, { className: "w-6 h-6" })}
        </div>
        <div className="min-w-0">
            <p className={`text-xs font-bold uppercase tracking-wider ${customColor ? 'text-white/80' : 'text-neutral-500 dark:text-neutral-400'}`}>{label}</p>
            <p className={`text-2xl font-black mt-1 truncate tracking-tight ${customColor ? 'text-white' : (showWarningStyle ? 'text-red-600 dark:text-red-400' : 'text-neutral-900 dark:text-neutral-100')}`}>
                {value}
            </p>
        </div>
      </div>
    </Card>
  );

  if (linkTo) {
    return <Link to={linkTo} className="block group">{cardContent}</Link>;
  }

  return cardContent;
});

export default StatCard;
