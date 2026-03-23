
import React from 'react';
import { useLocation } from 'react-router-dom';
import { LogoIcon } from '../constants';

const OAuthConsentPage: React.FC = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  // In a real Supabase IDP flow, these params come from the redirect
  // e.g. ?client_id=...&redirect_uri=...&response_type=code
  
  const handleAllow = () => {
      // In a real implementation, this would call a Supabase function to grant consent
      // For this UI demo, we just go back or close window
      window.history.back();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 dark:bg-neutral-950 p-4">
        <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800 p-8 text-center animate-fade-in">
            <div className="flex justify-center mb-6">
                <div className="bg-blue-600 p-3 rounded-xl shadow-lg shadow-blue-600/20">
                    <LogoIcon className="w-10 h-10 text-white" />
                </div>
            </div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Authorization Request</h2>
            <p className="text-neutral-500 dark:text-neutral-400 mb-8">
                An external application is requesting access to your Nilayam account data.
            </p>
            
            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-4 mb-8 text-left border border-neutral-100 dark:border-neutral-700">
                <h4 className="font-semibold text-sm text-neutral-900 dark:text-white mb-2">Permissions requested:</h4>
                <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
                    <li className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                        View your profile details
                    </li>
                    <li className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                        Read your property data
                    </li>
                </ul>
            </div>

            <div className="flex gap-4">
                <button className="flex-1 py-3 px-4 rounded-xl font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                    Deny
                </button>
                <button onClick={handleAllow} className="flex-1 py-3 px-4 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-colors">
                    Authorize
                </button>
            </div>
        </div>
    </div>
  );
};

export default OAuthConsentPage;
