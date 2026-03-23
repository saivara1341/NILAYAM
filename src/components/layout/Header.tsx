
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Link } from 'react-router-dom';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { BellIcon, LogoIcon, SearchIcon, MessageCircleIcon, ZapIcon, Menu3ArrowsIcon, TranslateIcon } from '@/constants';
import Button from '@/components/ui/Button';
import { UserRole, AppNotification, TaskJob } from '@/types';
import { getNotifications } from '@/services/api';
import { taskQueue } from '@/services/taskQueue';
import { EmptyInboxIllustration } from '@/components/ui/StateIllustrations';

const SOSIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.049 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
);

const ActivityIndicator: React.FC = () => {
    const [tasks, setTasks] = useState<TaskJob[]>([]);
    
    useEffect(() => {
        const unsubscribe = taskQueue.subscribe((updatedTasks) => {
            setTasks(updatedTasks);
        });
        return () => unsubscribe();
    }, []);

    const activeTasks = tasks.filter(t => t.status === 'processing');
    const queuedTasks = tasks.filter(t => t.status === 'queued');

    if (activeTasks.length === 0 && queuedTasks.length === 0) return null;

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full border border-neutral-200 dark:border-neutral-700 animate-fade-in">
            <div className="relative">
                <ZapIcon className="w-4 h-4 text-orange-500" />
                <span className="absolute top-0 right-0 w-2 h-2 bg-orange-500 rounded-full animate-ping"></span>
            </div>
            <div className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                {activeTasks.length > 0 ? (
                    <span className="flex items-center gap-1">
                        {activeTasks[0].topic.replace('_', ' ')} 
                        <span className="text-neutral-400">({activeTasks[0].progress}%)</span>
                    </span>
                ) : (
                    <span>{queuedTasks.length} Queued</span>
                )}
            </div>
        </div>
    );
}

interface HeaderProps {
    isCollapsed: boolean;
    setIsCollapsed: (isCollapsed: boolean) => void;
    isMobileOpen: boolean;
    setIsMobileOpen: (isOpen: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }) => {
  const { user, profile } = useAuth();
  const { language, t } = useLanguage();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
      if (user) {
          const loadNotifs = async () => {
              const data = await getNotifications();
              setNotifications(data);
          }
          loadNotifs();
      }
  }, [user]);
  
  const handleSOS = () => {
      alert("Emergency SOS Activated! Security has been notified.");
  };

  const toggleSidebar = () => {
    if (window.innerWidth < 768) {
      setIsMobileOpen(!isMobileOpen);
    } else {
      setIsCollapsed(!isCollapsed);
    }
  };

  const isTranslated = language !== 'en';

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md pt-safe border-b border-neutral-200/50 dark:border-neutral-800/50 transition-all duration-300 relative">
      <div className="px-4 sm:px-6 py-4 flex items-center justify-between h-20 relative z-20">
          
          {/* Top Left Menu Trigger + Brand */}
          <div className="flex items-center gap-3 md:gap-4 shrink-0">
             <button 
                onClick={toggleSidebar}
                className="p-2.5 -ml-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 focus:outline-none active:scale-95 transition-all shadow-sm md:shadow-none bg-white dark:bg-neutral-800 md:bg-transparent"
                aria-label="Toggle Menu"
            >
                <Menu3ArrowsIcon className={`h-6 w-6 transition-transform duration-300 ${isCollapsed && window.innerWidth >= 768 ? 'rotate-180' : ''}`} />
            </button>
    
            <Link to="/" className="flex items-center gap-3 group">
                <div className="bg-blue-600 text-white p-2 rounded-xl shadow-lg shadow-blue-600/20 group-hover:scale-105 transition-transform">
                    <LogoIcon className="h-7 w-7" />
                </div>
                <h1 className={`text-2xl md:text-3xl tracking-tighter text-neutral-900 dark:text-white ${isTranslated ? 'font-bold' : 'font-righteous'}`}>
                    {t('app.name')}
                </h1>
            </Link>
          </div>
          
          {/* Center Search - Hidden on mobile */}
          <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center gap-4 w-full max-w-xl justify-center">
                <div className="relative group flex-1 max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <SearchIcon className="h-4 w-4 text-neutral-400 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search portfolio..."
                        className="w-full pl-9 pr-4 py-2.5 bg-neutral-100/80 dark:bg-neutral-800/80 border-transparent rounded-2xl focus:ring-2 focus:ring-blue-500/30 focus:bg-white dark:focus:bg-neutral-900 text-sm text-neutral-800 dark:text-neutral-200 transition-all shadow-inner"
                    />
                </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            <ActivityIndicator />
            
            {profile?.role === UserRole.Tenant && (
                <Button 
                    onClick={handleSOS}
                    variant="emergency"
                    size="sm"
                    leftIcon={<SOSIcon className="h-4 w-4" />}
                >
                    <span className="hidden sm:inline">SOS</span>
                </Button>
            )}
            
            <div className="relative" ref={notifRef}>
                <button 
                    onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                    className="relative p-2.5 text-neutral-500 hover:text-blue-600 dark:text-neutral-400 dark:hover:text-blue-400 transition-colors rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200/50 dark:border-neutral-700/50"
                >
                    <BellIcon className="h-6 w-6" />
                    {notifications.length > 0 && (
                        <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-red-500 border-2 border-white dark:border-neutral-900 rounded-full"></span>
                    )}
                </button>
                {isNotificationsOpen && (
                    <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-100 dark:border-neutral-800 z-50 overflow-hidden animate-fade-in ring-1 ring-black/5">
                        <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/50 flex justify-between items-center">
                            <h3 className="font-bold text-neutral-900 dark:text-white">Inbox</h3>
                            <span className="text-[10px] font-black uppercase bg-blue-600 text-white px-2 py-0.5 rounded-lg tracking-widest">{notifications.length} New</span>
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="p-6 text-center text-neutral-500 dark:text-neutral-400 text-sm">
                                    <EmptyInboxIllustration />
                                    No new notifications.
                                </div>
                            ) : (
                                <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                    {notifications.map((notif) => (
                                        <div key={notif.id} className="p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer">
                                            <div className="flex justify-between items-start gap-2">
                                                <p className="text-sm font-bold text-neutral-800 dark:text-neutral-200">{notif.title}</p>
                                                <span className={`text-[9px] px-1.5 py-0.5 rounded-md uppercase font-black tracking-widest ${
                                                    notif.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                    {notif.priority}
                                                </span>
                                            </div>
                                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                                                {notif.message}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="rounded-xl border border-neutral-200/50 bg-neutral-50 p-1 dark:border-neutral-700/50 dark:bg-neutral-800">
                <ThemeToggle />
            </div>


          </div>
      </div>
      
      {/* Silver Shimmer Line at Header Bottom */}
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-neutral-200/50 dark:bg-neutral-800/50 overflow-hidden">
          <div className="absolute inset-0 w-[40%] bg-gradient-to-r from-transparent via-slate-400/30 dark:via-slate-200/20 to-transparent animate-shimmer-line"></div>
      </div>
    </header>
  );
};

export default Header;
