
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { HomeIcon, PropertiesIcon, WrenchIcon, LeaseIcon, CreditCardIcon } from '@/constants';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';

interface MobileBottomNavProps {
    onMenuClick: () => void;
}

// Custom Menu Icon for the nav bar
const MenuBarsIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
);

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onMenuClick }) => {
    const location = useLocation();
    const { t } = useLanguage();
    
    const { effectiveRole } = useAuth();
    
    const ownerNavItems = [
        { to: '/dashboard', labelKey: 'nav.home', icon: <HomeIcon className="w-6 h-6" /> },
        { to: '/properties', labelKey: 'nav.properties', icon: <PropertiesIcon className="w-6 h-6" /> },
        { to: '/payments', labelKey: 'nav.payments', icon: <CreditCardIcon className="w-6 h-6" /> },
    ];

    const tenantNavItems = [
        { to: '/tenant-dashboard', labelKey: 'nav.home', icon: <HomeIcon className="w-6 h-6" /> },
        { to: '/agreements', labelKey: 'nav.agreements', icon: <LeaseIcon className="w-6 h-6" /> },
        { to: '/tenant-maintenance', labelKey: 'nav.maintenance', icon: <WrenchIcon className="w-6 h-6" /> },
    ];

    const navItems = effectiveRole === UserRole.Tenant ? tenantNavItems : ownerNavItems;

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50">
            {/* Gradient Fade to seamless blend content */}
            <div className="absolute -top-10 left-0 right-0 h-10 bg-gradient-to-t from-white/90 dark:from-neutral-950/90 to-transparent pointer-events-none"></div>
            
            <div className="bg-white/95 dark:bg-neutral-950/95 backdrop-blur-xl border-t border-neutral-100/50 dark:border-neutral-800/50 shadow-[0_-8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.3)] pb-safe pt-2">
                <div className="mx-auto flex max-w-xl justify-around items-center h-16 px-2">
                    {navItems.map((item) => {
                        const isActive = location.pathname.startsWith(item.to);
                        return (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={`
                                    relative group flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-300
                                    active:scale-95
                                `}
                            >
                                <div className={`
                                    relative p-2 rounded-2xl transition-all duration-300
                                    ${isActive ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shadow-[0_8px_20px_rgba(37,99,235,0.18)]' : 'text-neutral-400 dark:text-neutral-500'}
                                `}>
                                    {React.cloneElement(item.icon as React.ReactElement<any>, { 
                                        className: `w-6 h-6 transition-all duration-300 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}` 
                                    })}
                                </div>
                                <span className={`text-[10px] font-semibold tracking-wide transition-all duration-300 ${isActive ? 'text-blue-600 dark:text-blue-400 translate-y-0 opacity-100' : 'text-neutral-400 dark:text-neutral-500 opacity-80'}`}>
                                    {t(item.labelKey)}
                                </span>
                            </NavLink>
                        );
                    })}
                    
                    <button
                        onClick={onMenuClick}
                        className="relative group flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-300 active:scale-95 text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300"
                    >
                        <div className="p-2">
                            <MenuBarsIcon className="w-6 h-6" />
                        </div>
                        <span className="text-[10px] font-semibold tracking-wide opacity-80">Menu</span>
                    </button>
                </div>
            </div>
        </nav>
    );
};

export default MobileBottomNav;
