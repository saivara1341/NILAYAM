
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { TENANT_NAV_LINKS, TENANT_COMMUNITY_LINKS } from '@/constants';
import { useLanguage } from '@/contexts/LanguageContext';

interface TenantSidebarProps {
    isCollapsed: boolean;
    isMobileOpen: boolean;
    setIsMobileOpen: (isOpen: boolean) => void;
    isAppShell: boolean;
}

const TenantSidebar: React.FC<TenantSidebarProps> = ({ isCollapsed, isMobileOpen, setIsMobileOpen, isAppShell }) => {
  const location = useLocation();
  const { t } = useLanguage();

  return (
    <>
        {/* Mobile Backdrop */}
        {isMobileOpen && (
            <div 
                className={`fixed inset-0 z-40 animate-fade-in bg-black/60 backdrop-blur-sm ${isAppShell ? '' : 'md:hidden'}`}
                onClick={() => setIsMobileOpen(false)}
            />
        )}

        {/* Sidebar Container */}
        <aside className={`
            fixed inset-y-0 left-0 z-50 h-full bg-white dark:bg-neutral-900 border-r border-neutral-200/60 dark:border-neutral-800 shadow-2xl md:shadow-none
            transition-transform duration-300 ease-in-out
            ${isAppShell ? '' : 'md:relative md:translate-x-0'}
            ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
            ${isAppShell ? 'w-80 max-w-[88vw]' : `${isCollapsed ? 'md:w-20' : 'md:w-64'} w-72 md:w-auto`}
        `}>
          <div className="flex flex-col h-full">
            {/* Mobile Header in Drawer */}
            <div className={`flex items-center justify-between p-4 border-b border-neutral-100 dark:border-neutral-800 ${isAppShell ? '' : 'md:hidden'}`}>
                  <span className="font-bold text-lg text-neutral-800 dark:text-neutral-200">Menu</span>
                  <button onClick={() => setIsMobileOpen(false)} className="p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
            </div>

            <nav className="flex-grow overflow-y-auto pt-4 md:pt-4">
                <ul className="px-2">
                {TENANT_NAV_LINKS.map((link) => {
                    const isActive = location.pathname.startsWith(link.href);
                    return (
                        <li key={link.href} className="mb-1">
                        <NavLink
                            to={link.href}
                            onClick={() => setIsMobileOpen(false)}
                            className={`flex items-center w-full rounded-lg transition-colors duration-200 ${
                                isActive 
                                ? 'bg-blue-600 text-white shadow-md' 
                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                            } ${!isAppShell && isCollapsed ? 'justify-center h-12 px-0 md:px-0' : 'p-3 space-x-4'}`}
                        >
                            {link.icon}
                            <span className={`font-medium ${!isAppShell && isCollapsed ? 'md:hidden' : 'block'}`}>{t(link.labelKey)}</span>
                        </NavLink>
                        </li>
                    );
                })}
                </ul>

                <hr className="my-4 border-slate-200 dark:border-slate-800 mx-4" />

                <div className={`px-6 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider ${!isAppShell && isCollapsed ? 'md:hidden' : 'block'}`}>
                    {t('nav.community')}
                </div>

                <ul className="px-2">
                    {TENANT_COMMUNITY_LINKS.map((link) => (
                        <li key={link.labelKey} className="mb-1">
                            <a
                                href={link.href}
                                onClick={(e) => {
                                    if(link.disabled) e.preventDefault();
                                    else setIsMobileOpen(false);
                                }}
                                className={`flex items-center w-full rounded-lg transition-colors duration-200 text-slate-500 dark:text-slate-400 ${
                                    link.disabled 
                                    ? 'cursor-not-allowed opacity-60' 
                                    : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                                } ${!isAppShell && isCollapsed ? 'justify-center h-12 px-0 md:px-0' : 'p-3 space-x-4'}`}
                                title={link.disabled ? 'Coming Soon' : ''}
                            >
                                {link.icon}
                                <span className={`font-medium ${!isAppShell && isCollapsed ? 'md:hidden' : 'block'}`}>{t(link.labelKey)}</span>
                                {link.disabled && <span className={`text-xs bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full ml-auto ${!isAppShell && isCollapsed ? 'md:hidden' : 'block'}`}>Soon</span>}
                            </a>
                        </li>
                    ))}
                </ul>
            </nav>
          </div>
        </aside>
    </>
  );
};

export default TenantSidebar;
