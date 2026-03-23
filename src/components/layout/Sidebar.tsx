
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { OWNER_NAV_LINKS } from '@/constants';
import { useLanguage } from '@/contexts/LanguageContext';

interface SidebarProps {
    isCollapsed: boolean;
    isMobileOpen: boolean;
    setIsMobileOpen: (isOpen: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, isMobileOpen, setIsMobileOpen }) => {
  const location = useLocation();
  const { t } = useLanguage();

  return (
    <>
        {/* Mobile Backdrop */}
        {isMobileOpen && (
            <div 
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-fade-in"
                onClick={() => setIsMobileOpen(false)}
            />
        )}

        {/* Sidebar Container */}
        <aside className={`
            fixed inset-y-0 left-0 z-50 h-full bg-white dark:bg-neutral-900 border-r border-neutral-200/60 dark:border-neutral-800 
            transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none
            md:relative md:translate-x-0
            ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
            ${isCollapsed ? 'md:w-20' : 'md:w-64'}
            w-72 md:w-auto
        `}>
          <div className="flex flex-col h-full">
              {/* Mobile Header in Drawer */}
              <div className="md:hidden flex items-center justify-between p-4 border-b border-neutral-100 dark:border-neutral-800">
                  <span className="font-bold text-lg text-neutral-800 dark:text-neutral-200">Menu</span>
                  <button onClick={() => setIsMobileOpen(false)} className="p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
              </div>

              <nav className="pt-4 md:pt-6 flex-grow overflow-y-auto scrollbar-hide">
                <ul className="space-y-2 px-3">
                  {OWNER_NAV_LINKS.map((link) => {
                    const isActive = location.pathname.startsWith(link.href);
                    return (
                        <li key={link.href}>
                        <NavLink
                            to={link.href}
                            onClick={() => setIsMobileOpen(false)} // Close on mobile click
                            className={`flex items-center w-full rounded-xl transition-all duration-200 group relative ${
                                isActive 
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 font-semibold' 
                                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-200'
                            } ${isCollapsed ? 'justify-center h-12 px-0 md:px-0 px-4' : 'px-4 py-3 space-x-3'}`}
                        >
                            <>
                                {/* Icon Wrapper */}
                                <span className="flex-shrink-0 flex items-center justify-center">
                                    {link.icon}
                                </span>
                                
                                {/* Label: Hidden if collapsed on Desktop, always shown on Mobile */}
                                <span className={`truncate ${isCollapsed ? 'md:hidden' : 'block'}`}>
                                    {t(link.labelKey)}
                                </span>
                                
                                {/* Active Indicator Strip */}
                                {isActive && (
                                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-600 rounded-r-full"></span>
                                )}
                            </>
                        </NavLink>
                        </li>
                    );
                  })}
                </ul>
              </nav>
          </div>
        </aside>
    </>
  );
};

export default Sidebar;
