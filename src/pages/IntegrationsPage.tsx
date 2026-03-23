
import React from 'react';
import Card from '../components/ui/Card';
import { PlugIcon } from '../constants';

const IntegrationCard: React.FC<{ logo: string, name: string, description: string }> = ({ logo, name, description }) => (
    <Card className="flex flex-col">
        <div className="flex items-center gap-4 mb-4">
            <img src={logo} alt={`${name} logo`} className="w-12 h-12 rounded-lg object-contain" />
            <div>
                <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-200">{name}</h3>
                <span className="text-xs font-semibold px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">Connected</span>
            </div>
        </div>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 flex-grow">{description}</p>
        <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <button className="w-full btn btn-secondary">Manage Settings</button>
        </div>
    </Card>
);

const IntegrationsPage: React.FC = () => {
    return (
        <div className="space-y-8 animate-fade-in">
            <div>
                <h2 className="text-3xl font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-3">
                    <PlugIcon className="w-8 h-8 text-blue-600" />
                    Integrations Hub
                </h2>
                <p className="mt-2 text-neutral-500 dark:text-neutral-400 max-w-3xl">
                    Connect Nilayam with the tools your community already uses. Sync data, import history, and enhance your existing workflow with AI.
                </p>
            </div>

            <Card>
                <h3 className="text-xl font-bold text-neutral-800 dark:text-neutral-200 mb-4">Community Management Platforms</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <IntegrationCard 
                        logo="https://mygate.com/wp-content/uploads/2023/10/mg-logo-2.svg"
                        name="MyGate"
                        description="Sync visitor logs, service requests, and resident directories. Use Nilayam's AI for tenant scoring on top of MyGate's operational data."
                    />
                    <IntegrationCard 
                        logo="https://is1-ssl.mzstatic.com/image/thumb/Purple126/v4/0c/36/83/0c368305-6453-e99c-3a47-a36329e47525/AppIcon-0-0-1x_U007emarketing-0-0-0-10-0-0-sRGB-0-0-0-GLES2_U002c0-512MB-85-220-0-0.png/256x256bb.jpg"
                        name="NoBrokerHood"
                        description="Import payment histories for automated reconciliation in the CFO Dashboard. Use Nilayam's AI Lease Studio for residents onboarded via NoBrokerHood."
                    />
                    <IntegrationCard 
                        logo="https://is1-ssl.mzstatic.com/image/thumb/Purple116/v4/91/9f/6e/919f6e4a-5f93-1815-dd53-529a65f1a1aa/AppIcon-1x_U007emarketing-0-0-0-7-0-0-sRGB-0-0-0-GLES2_U002c0-512MB-85-220-0-0.png/256x256bb.jpg"
                        name="ApnaComplex"
                        description="Connect accounting data for advanced financial reporting and auditing. Migrate historical data seamlessly."
                    />
                </div>
            </Card>

            <Card>
                <h3 className="text-xl font-bold text-neutral-800 dark:text-neutral-200 mb-4">Data Migration</h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                    Switching to Nilayam? Don't lose your historical data. We provide tools to import your existing records from other platforms.
                </p>
                <button className="btn btn-primary">Start Data Migration Wizard</button>
            </Card>

        </div>
    );
};

export default IntegrationsPage;
