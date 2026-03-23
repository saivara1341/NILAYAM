
import React, { useState } from 'react';
import Card from '../components/ui/Card';
import { SearchIcon } from '../constants';

const BriefcaseIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
);

const OpportunityBoardPage: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    // Placeholder for opportunities data - will be empty for now
    const opportunities: any[] = [];

    const filteredOpportunities = opportunities.filter(op =>
        (op.title && op.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (op.company && op.company.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-3xl font-bold text-neutral-800 dark:text-neutral-200">Opportunity Board</h2>
            
            <Card>
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <SearchIcon className="h-5 w-5 text-neutral-500 dark:text-neutral-400 transition-colors duration-200 group-focus-within:text-primary dark:group-focus-within:text-primary-light" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search jobs or companies..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-full focus:outline-none focus:ring-2 focus:ring-primary bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-200"
                    />
                </div>
            </Card>

            {filteredOpportunities.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* This is where opportunity cards would be rendered */}
                </div>
            ) : (
                <div className="text-center py-24 bg-white dark:bg-neutral-800/50 rounded-xl border border-neutral-200/80 dark:border-neutral-700/60">
                    <BriefcaseIcon className="mx-auto h-16 w-16 text-neutral-400 dark:text-neutral-500" />
                    <h3 className="mt-4 text-xl font-semibold text-neutral-800 dark:text-neutral-200">
                        No matching opportunities found.
                    </h3>
                    <p className="mt-2 text-neutral-500 dark:text-neutral-400">
                        {searchTerm ? "Try adjusting your search term." : "The opportunity board is currently empty."}
                    </p>
                </div>
            )}
        </div>
    );
};

export default OpportunityBoardPage;
