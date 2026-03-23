import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    LogoIcon,
    DashboardIcon,
    CreditCardIcon,
    WrenchIcon,
    StoreIcon,
    CheckCircleIcon,
    FinancialAnalyticsIcon,
    TenantTrackingIcon,
    InsightsIcon,
    BellIcon,
    ShieldCheckIcon,
    SparklesIcon,
    CalendarDaysIcon,
    HomeIcon,
    MessageSquareIcon,
    LayersIcon
} from '../constants';
import ThemeToggle from '../components/ui/ThemeToggle';
import Button from '../components/ui/Button';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { LANGUAGES } from '@/constants/translations';

const GlobeIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <circle cx="12" cy="12" r="9" strokeWidth="1.5" />
        <path d="M3 12h18M12 3c2.8 3 4.2 6 4.2 9s-1.4 6-4.2 9c-2.8-3-4.2-6-4.2-9S9.2 6 12 3Z" strokeWidth="1.5" />
    </svg>
);

const resolveText = (value: string, fallback: string) => (value && value !== '' && value !== fallback ? value : fallback);

const Reveal: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({ children, delay = 0, className = '' }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const node = ref.current;
        if (!node) return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setVisible(true);
                observer.disconnect();
            }
        }, { threshold: 0.18 });
        observer.observe(node);
        return () => observer.disconnect();
    }, []);

    return (
        <div
            ref={ref}
            className={`${className} transition-all duration-700 ease-out ${visible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {children}
        </div>
    );
};

const LandingLanguageSelector: React.FC = () => {
    const { language, setLanguage } = useLanguage();
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onClick = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, []);

    const currentLang = LANGUAGES.find((lang) => lang.code === language) || LANGUAGES[0];

    return (
        <div className="relative" ref={wrapperRef}>
            <button
                onClick={() => setOpen((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
                <GlobeIcon className="h-4 w-4" />
                <span className="uppercase">{currentLang.code}</span>
            </button>
            {open && (
                <div className="absolute right-0 top-12 z-50 w-52 overflow-hidden rounded-3xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
                    {LANGUAGES.map((lang) => (
                        <button
                            key={lang.code}
                            onClick={() => {
                                setLanguage(lang.code);
                                setOpen(false);
                            }}
                            className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition ${language === lang.code ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900'}`}
                        >
                            <span className="font-medium">{lang.nativeName}</span>
                            <span className="text-xs uppercase opacity-70">{lang.code}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

const FloatingChip: React.FC<{ icon: React.ReactNode; label: string; className: string }> = ({ icon, label, className }) => (
    <div className={`absolute rounded-full border border-white/15 bg-slate-950/85 px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-white shadow-xl backdrop-blur-xl ${className}`}>
        <div className="flex items-center gap-2">
            <span className="text-blue-300">{icon}</span>
            <span>{label}</span>
        </div>
    </div>
);

const HeroVisual: React.FC = () => (
    <div className="relative mx-auto w-full max-w-[680px]">
        <div className="absolute left-10 top-8 h-64 w-64 rounded-full bg-sky-400/20 blur-3xl" />
        <div className="absolute bottom-0 right-12 h-56 w-56 rounded-full bg-emerald-400/15 blur-3xl" />
        <FloatingChip icon={<ShieldCheckIcon className="h-4 w-4" />} label="Verified" className="left-0 top-12 hidden sm:block animate-float-soft" />
        <FloatingChip icon={<CreditCardIcon className="h-4 w-4" />} label="Collections" className="right-4 top-6 hidden sm:block animate-float-mid" />
        <FloatingChip icon={<WrenchIcon className="h-4 w-4" />} label="Helpdesk" className="left-10 bottom-24 hidden lg:block animate-float-fast" />
        <FloatingChip icon={<StoreIcon className="h-4 w-4" />} label="Services" className="right-0 bottom-10 hidden lg:block animate-float-soft" />
        <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-[linear-gradient(180deg,#0f172a_0%,#111827_100%)] p-3 shadow-[0_35px_90px_rgba(15,23,42,0.30)] sm:rounded-[2.5rem] sm:p-6">
            <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-3 sm:rounded-[2rem] sm:p-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-blue-600 p-3 text-white shadow-lg shadow-blue-600/30">
                            <LogoIcon className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.3em] text-sky-200">Nilayam</p>
                            <p className="text-sm text-slate-400">Property operating system</p>
                        </div>
                    </div>
                    <div className="rounded-full bg-emerald-400/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">Live</div>
                </div>
                <div className="mt-5 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                    <div className="space-y-4">
                        <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 sm:rounded-[1.8rem] sm:p-5">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Control Room</p>
                                    <h3 className="mt-2 text-2xl font-black text-white sm:text-3xl">94% occupancy</h3>
                                    <p className="mt-2 text-sm leading-6 text-slate-400">Collections, leasing, and operations in a single view.</p>
                                </div>
                                <div className="rounded-2xl bg-sky-400/10 p-3 text-sky-300">
                                    <InsightsIcon className="h-7 w-7" />
                                </div>
                            </div>
                            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <div className="min-w-0 rounded-2xl bg-slate-950/80 p-3"><p className="truncate text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 sm:text-[11px] sm:tracking-[0.18em]">Income</p><p className="mt-2 truncate text-lg font-black text-white">₹12.4L</p></div>
                                <div className="min-w-0 rounded-2xl bg-slate-950/80 p-3"><p className="truncate text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 sm:text-[11px] sm:tracking-[0.18em]">Tickets</p><p className="mt-2 truncate text-lg font-black text-white">08</p></div>
                                <div className="min-w-0 rounded-2xl bg-slate-950/80 p-3"><p className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 sm:text-[11px] sm:tracking-[0.16em]">Renewals</p><p className="mt-2 truncate text-lg font-black text-white">03</p></div>
                            </div>
                        </div>
                        <div className="grid gap-4">
                            <div className="min-w-0 rounded-[1.4rem] border border-white/10 bg-white/5 p-4 sm:rounded-[1.6rem]">
                                <div className="flex items-start gap-3">
                                    <div className="rounded-2xl bg-violet-400/10 p-3 text-violet-300"><TenantTrackingIcon className="h-5 w-5" /></div>
                                    <div className="min-w-0 flex-1 overflow-hidden">
                                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 sm:text-xs sm:tracking-[0.22em]">Onboarding</p>
                                        <p className="mt-1 break-words text-xs font-bold leading-5 text-white sm:text-sm">Resident setup</p>
                                    </div>
                                </div>
                                <div className="mt-4 space-y-2">{['KYC verified', 'Lease signed', 'Autopay enabled'].map((item) => <div key={item} className="flex items-center gap-2 rounded-2xl bg-slate-950/75 px-3 py-2 text-sm text-slate-200"><CheckCircleIcon className="h-4 w-4 text-emerald-300" /><span>{item}</span></div>)}</div>
                            </div>
                            <div className="min-w-0 rounded-[1.4rem] border border-white/10 bg-white/5 p-4 sm:rounded-[1.6rem]">
                                <div className="flex items-start gap-3">
                                    <div className="rounded-2xl bg-emerald-400/10 p-3 text-emerald-300"><FinancialAnalyticsIcon className="h-5 w-5" /></div>
                                    <div className="min-w-0 flex-1 overflow-hidden">
                                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 sm:text-xs sm:tracking-[0.22em]">Forecast</p>
                                        <p className="mt-1 break-words text-xs font-bold leading-5 text-white sm:text-sm">Cashflow intelligence</p>
                                    </div>
                                </div>
                                <div className="mt-4 flex h-20 items-end gap-2">{[28, 44, 39, 61, 56, 74].map((value, index) => <div key={index} className="flex-1 rounded-t-full bg-[linear-gradient(180deg,#38bdf8,#0f172a)]" style={{ height: `${value}%` }} />)}</div>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 sm:rounded-[1.8rem] sm:p-5">
                            <div className="flex items-center justify-between">
                                <div className="min-w-0 pr-3"><p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Resident App</p><h4 className="mt-2 text-lg font-black leading-6 text-white sm:text-xl">Everything in one place</h4></div>
                                <div className="rounded-2xl bg-white/10 p-3 text-sky-300"><HomeIcon className="h-5 w-5" /></div>
                            </div>
                            <div className="mt-5 space-y-3">
                                <div className="rounded-[1.4rem] bg-slate-950/80 p-4">
                                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Rent Due</p>
                                    <div className="mt-2 flex items-center justify-between"><p className="text-2xl font-black text-white">₹25,000</p><span className="rounded-full bg-emerald-400/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">Autopay</span></div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="min-w-0 rounded-[1.3rem] bg-white/5 p-4 text-center"><CalendarDaysIcon className="mx-auto h-5 w-5 text-cyan-300" /><p className="mt-2 truncate text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 sm:text-[11px] sm:tracking-[0.2em]">Visitors</p></div>
                                    <div className="min-w-0 rounded-[1.3rem] bg-white/5 p-4 text-center"><MessageSquareIcon className="mx-auto h-5 w-5 text-violet-300" /><p className="mt-2 truncate text-[10px] font-black uppercase tracking-[0.12em] text-slate-500 sm:text-[11px] sm:tracking-[0.16em]">Community</p></div>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-[1.5rem] border border-white/10 bg-[linear-gradient(135deg,rgba(37,99,235,0.18),rgba(20,184,166,0.12))] p-4 sm:rounded-[1.8rem] sm:p-5">
                            <div className="flex items-center justify-between">
                                <div className="min-w-0 pr-3"><p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Action Queue</p><h4 className="mt-2 text-lg font-black leading-6 text-white sm:text-xl">Today’s priorities</h4></div>
                                <SparklesIcon className="h-5 w-5 text-amber-300" />
                            </div>
                            <div className="mt-4 space-y-3">{[
                                { icon: <BellIcon className="h-4 w-4" />, title: 'Send maintenance notice' },
                                { icon: <CreditCardIcon className="h-4 w-4" />, title: 'Review pending payments' },
                                { icon: <StoreIcon className="h-4 w-4" />, title: 'Approve local vendor' }
                            ].map((item) => <div key={item.title} className="flex items-start gap-3 rounded-2xl bg-slate-950/70 px-3 py-3"><div className="rounded-xl bg-white/5 p-2 text-sky-300">{item.icon}</div><div className="min-w-0"><p className="text-sm font-bold leading-5 text-white">{item.title}</p><p className="text-xs leading-5 text-slate-500">Suggested by operational insights</p></div></div>)}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

const MetricCard: React.FC<{ value: string; label: string; tone: string; valueTone: string }> = ({ value, label, tone, valueTone }) => (
    <div className={`rounded-[2rem] border p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] ${tone}`}>
        <p className={`text-4xl font-black tracking-tight ${valueTone}`}>{value}</p>
        <p className="mt-2 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">{label}</p>
    </div>
);

const FeaturePanel: React.FC<{ icon: React.ReactNode; title: string; body: string; tone: string }> = ({ icon, title, body, tone }) => (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_25px_60px_rgba(15,23,42,0.12)] dark:border-slate-800 dark:bg-slate-900">
        <div className={`inline-flex rounded-2xl p-3 text-white ${tone}`}>{icon}</div>
        <h3 className="mt-5 text-xl font-black text-slate-950 dark:text-white">{title}</h3>
        <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-400">{body}</p>
    </div>
);

const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const { session } = useAuth();
    const { t, language } = useLanguage();
    const [activeTab, setActiveTab] = useState<'owners' | 'tenants'>('owners');
    const text = (key: string, fallback: string) => resolveText(t(key), fallback);
    const translated = language !== 'en';

    const ownerFeatures = [
        {
            icon: <DashboardIcon className="h-6 w-6" />,
            title: 'Portfolio command center',
            body: 'Monitor occupancy, units, collections, announcements, and open issues from a single operating dashboard.',
            tone: 'bg-[linear-gradient(135deg,#2563eb,#0f172a)]'
        },
        {
            icon: <FinancialAnalyticsIcon className="h-6 w-6" />,
            title: 'Financial clarity',
            body: 'Track income, overdue rent, and property performance without juggling separate spreadsheets and tools.',
            tone: 'bg-[linear-gradient(135deg,#0f766e,#14b8a6)]'
        },
        {
            icon: <InsightsIcon className="h-6 w-6" />,
            title: 'AI-assisted decisions',
            body: 'Surface trends, forecasts, and next-best actions that help teams respond faster and manage proactively.',
            tone: 'bg-[linear-gradient(135deg,#7c3aed,#2563eb)]'
        }
    ];

    const tenantFeatures = [
        {
            icon: <CreditCardIcon className="h-6 w-6" />,
            title: 'Clear rent experience',
            body: 'Residents can see dues, payment details, and confirmation history in a simpler, more confident flow.',
            tone: 'bg-[linear-gradient(135deg,#16a34a,#22c55e)]'
        },
        {
            icon: <WrenchIcon className="h-6 w-6" />,
            title: 'Transparent maintenance',
            body: 'Issues can be raised, tracked, and resolved with better visibility for both tenants and owners.',
            tone: 'bg-[linear-gradient(135deg,#ea580c,#f59e0b)]'
        },
        {
            icon: <StoreIcon className="h-6 w-6" />,
            title: 'Resident ecosystem',
            body: 'Documents, announcements, visitor tools, local services, and community activity live in one place.',
            tone: 'bg-[linear-gradient(135deg,#0284c7,#14b8a6)]'
        }
    ];

    const displayedFeatures = activeTab === 'owners' ? ownerFeatures : tenantFeatures;

    return (
        <div className="min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#f7fafc_0%,#eef4ff_26%,#ffffff_56%,#f8fafc_100%)] text-slate-950 dark:bg-[linear-gradient(180deg,#020617_0%,#0f172a_100%)] dark:text-white">
            <nav className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/75">
                <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:h-24 lg:px-8">
                    <Link to="/" className="flex items-center gap-3">
                        <div className="rounded-2xl bg-[linear-gradient(135deg,#2563eb,#0f172a)] p-3 text-white shadow-lg shadow-blue-500/25">
                            <LogoIcon className="h-6 w-6" />
                        </div>
                        <div>
                            <p className={`text-2xl tracking-tight text-slate-950 dark:text-white ${translated ? 'font-black' : 'font-righteous'}`}>{text('app.name', 'Nilayam')}</p>
                            <p className="text-[11px] font-black uppercase tracking-[0.26em] text-slate-400">Property OS</p>
                        </div>
                    </Link>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="hidden items-center gap-2 sm:flex">
                            <LandingLanguageSelector />
                            <ThemeToggle />
                        </div>
                        <div className="sm:hidden"><ThemeToggle /></div>
                        {session ? (
                            <Button onClick={() => navigate('/dashboard-router')} size="sm">{text('landing.cta_dashboard', 'Open Dashboard')}</Button>
                        ) : (
                            <Button onClick={() => navigate('/auth')} size="sm" variant="secondary">{text('btn.signin', 'Sign In')}</Button>
                        )}
                    </div>
                </div>
            </nav>

            <main className="pt-20 lg:pt-24">
                <section className="relative px-4 pb-16 pt-10 sm:px-6 sm:pb-20 lg:px-8 lg:pb-24 lg:pt-16">
                    <div className="absolute left-1/2 top-4 -z-10 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-sky-400/15 blur-3xl" />
                    <div className="absolute right-0 top-20 -z-10 h-72 w-72 rounded-full bg-violet-400/10 blur-3xl" />
                    <div className="absolute bottom-0 left-0 -z-10 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />

                    <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
                        <Reveal className="max-w-2xl">
                            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/90 px-4 py-2 text-xs font-black uppercase tracking-[0.28em] text-sky-700 shadow-lg shadow-sky-100 dark:border-sky-400/20 dark:bg-white/5 dark:text-sky-300 dark:shadow-none">
                                <SparklesIcon className="h-4 w-4" />
                                {text('landing.tagline', 'Modern Property Operations')}
                            </div>
                            <h1 className={`mt-6 text-5xl font-black leading-[0.95] tracking-tight text-slate-950 dark:text-white sm:text-6xl lg:text-7xl ${translated ? 'font-black' : ''}`}>
                                Run properties with
                                <span className="mt-3 block bg-[linear-gradient(135deg,#2563eb,#0ea5e9,#10b981)] bg-clip-text text-transparent">more control and less chaos</span>
                            </h1>
                            <p className="mt-6 max-w-xl text-base leading-8 text-slate-600 dark:text-slate-300 sm:text-lg">
                                Nilayam brings owners, tenants, payments, maintenance, announcements, and local services into one product that feels like a real operating system instead of a loose collection of screens.
                            </p>
                            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
                                <Button onClick={() => navigate(session ? '/dashboard-router' : '/auth')} size="lg">{session ? text('landing.cta_dashboard', 'Go To Dashboard') : text('landing.cta_start', 'Start With Nilayam')}</Button>
                                <button onClick={() => document.getElementById('feature-zone')?.scrollIntoView({ behavior: 'smooth' })} className="inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-slate-700 transition hover:text-sky-700 dark:text-slate-300 dark:hover:text-white"><LayersIcon className="h-4 w-4" />Explore Product</button>
                            </div>
                            <div className="mt-10 grid gap-4 sm:grid-cols-3">
                                <div className="rounded-[1.7rem] border border-blue-200 bg-blue-50/90 px-4 py-4 shadow-sm dark:border-blue-900/40 dark:bg-blue-950/20"><p className="text-2xl font-black text-blue-950 dark:text-blue-100">Owners</p><p className="mt-1 text-xs font-bold uppercase tracking-[0.22em] text-blue-700 dark:text-blue-300">Portfolio control</p></div>
                                <div className="rounded-[1.7rem] border border-emerald-200 bg-emerald-50/90 px-4 py-4 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/20"><p className="text-2xl font-black text-emerald-950 dark:text-emerald-100">Tenants</p><p className="mt-1 text-xs font-bold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-300">Resident experience</p></div>
                                <div className="rounded-[1.7rem] border border-violet-200 bg-violet-50/90 px-4 py-4 shadow-sm dark:border-violet-900/40 dark:bg-violet-950/20"><p className="text-2xl font-black text-violet-950 dark:text-violet-100">AI</p><p className="mt-1 text-xs font-bold uppercase tracking-[0.22em] text-violet-700 dark:text-violet-300">Smarter operations</p></div>
                            </div>
                        </Reveal>
                        <Reveal delay={120} className="lg:pl-4"><HeroVisual /></Reveal>
                    </div>
                </section>

                <section className="px-4 py-8 sm:px-6 lg:px-8">
                    <div className="mx-auto grid max-w-7xl gap-5 sm:grid-cols-2 xl:grid-cols-4">
                        <Reveal><MetricCard value="98%" label="Visibility across occupancy, collections, and resident operations." tone="border-cyan-200 bg-cyan-50/90 dark:border-cyan-900/40 dark:bg-cyan-950/20" valueTone="text-cyan-950 dark:text-cyan-100" /></Reveal>
                        <Reveal delay={70}><MetricCard value="2.5x" label="Faster lease and tenant workflow coordination." tone="border-emerald-200 bg-emerald-50/90 dark:border-emerald-900/40 dark:bg-emerald-950/20" valueTone="text-emerald-950 dark:text-emerald-100" /></Reveal>
                        <Reveal delay={140}><MetricCard value="24/7" label="Operational awareness across owners and residents." tone="border-amber-200 bg-amber-50/90 dark:border-amber-900/40 dark:bg-amber-950/20" valueTone="text-amber-950 dark:text-amber-100" /></Reveal>
                        <Reveal delay={210}><MetricCard value="1 App" label="Payments, maintenance, community, and service discovery together." tone="border-violet-200 bg-violet-50/90 dark:border-violet-900/40 dark:bg-violet-950/20" valueTone="text-violet-950 dark:text-violet-100" /></Reveal>
                    </div>
                </section>

                <section id="feature-zone" className="px-4 py-20 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-7xl">
                        <Reveal className="mx-auto max-w-3xl text-center">
                            <p className="text-xs font-black uppercase tracking-[0.32em] text-sky-700 dark:text-sky-300">Built around real workflows</p>
                            <h2 className="mt-4 bg-[linear-gradient(135deg,#0f172a,#2563eb,#0ea5e9)] bg-clip-text text-4xl font-black tracking-tight text-transparent dark:bg-[linear-gradient(135deg,#ffffff,#7dd3fc,#a78bfa)] dark:bg-clip-text sm:text-5xl">A product story that makes sense for both owners and tenants</h2>
                            <p className="mt-5 text-lg leading-8 text-slate-600 dark:text-slate-400">
                                The landing page should explain the value quickly, feel premium, and still connect directly to what users actually do inside the app.
                            </p>
                            <div className="mt-8 inline-flex rounded-full border border-slate-200 bg-white p-1.5 shadow-lg shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
                                <button onClick={() => setActiveTab('owners')} className={`rounded-full px-6 py-3 text-sm font-black uppercase tracking-[0.18em] transition ${activeTab === 'owners' ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}>Owners</button>
                                <button onClick={() => setActiveTab('tenants')} className={`rounded-full px-6 py-3 text-sm font-black uppercase tracking-[0.18em] transition ${activeTab === 'tenants' ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}>Tenants</button>
                            </div>
                        </Reveal>
                        <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                            {displayedFeatures.map((feature, index) => (
                                <Reveal key={feature.title} delay={index * 90}>
                                    <FeaturePanel {...feature} />
                                </Reveal>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="px-4 py-20 sm:px-6 lg:px-8">
                    <div className="mx-auto grid max-w-7xl gap-10 rounded-[2.8rem] border border-slate-200 bg-white p-8 shadow-[0_30px_80px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-900/70 lg:grid-cols-[1fr_1fr] lg:p-12">
                        <Reveal>
                            <p className="text-xs font-black uppercase tracking-[0.32em] text-emerald-600 dark:text-emerald-300">How it fits together</p>
                            <h3 className="mt-4 text-4xl font-black tracking-tight text-slate-950 dark:text-white">One product, many connected moments</h3>
                            <p className="mt-5 text-base leading-8 text-slate-600 dark:text-slate-400">
                                Nilayam is strongest when the experience feels connected: onboarding flows into daily operations, payments flow into reporting, and resident interactions flow into trust and retention.
                            </p>
                        </Reveal>
                        <div className="grid gap-5">
                            {[
                                'Launch owner operations with portfolio, units, and financial visibility.',
                                'Give residents a modern rent, maintenance, and document experience.',
                                'Use community, announcements, and services to extend beyond basic rent collection.',
                                'Turn operational data into faster action with AI-assisted signals and forecasts.'
                            ].map((item, index) => (
                                <Reveal key={item} delay={index * 70}>
                                    <div className="flex items-start gap-4 rounded-[1.7rem] border border-slate-200 bg-slate-50 px-5 py-5 dark:border-slate-800 dark:bg-slate-950/70">
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white dark:bg-white dark:text-slate-950">0{index + 1}</div>
                                        <p className="pt-1 text-sm leading-7 text-slate-700 dark:text-slate-300">{item}</p>
                                    </div>
                                </Reveal>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="px-4 pb-24 pt-6 sm:px-6 lg:px-8">
                    <Reveal className="mx-auto max-w-7xl overflow-hidden rounded-[2.8rem] bg-[linear-gradient(135deg,#0f172a,#1d4ed8,#0f766e)] p-8 text-white shadow-[0_35px_90px_rgba(15,23,42,0.28)] sm:p-10 lg:p-14">
                        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
                            <div className="max-w-3xl">
                                <p className="text-xs font-black uppercase tracking-[0.3em] text-sky-100">Ready to launch</p>
                                <h3 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">Property management that looks and feels like a serious product</h3>
                                <p className="mt-5 text-base leading-8 text-blue-50/85 sm:text-lg">
                                    A refined landing experience, a focused brand voice, and a clearer product narrative make the app feel more credible before users even sign in.
                                </p>
                            </div>
                            <div className="flex flex-col gap-4 sm:flex-row lg:flex-col">
                                <Button onClick={() => navigate(session ? '/dashboard-router' : '/auth')} size="lg">{session ? text('landing.cta_dashboard', 'Enter Dashboard') : text('landing.cta_start', 'Start Free')}</Button>
                                <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="rounded-full border border-white/20 px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-white/90 transition hover:bg-white/10">Back To Top</button>
                            </div>
                        </div>
                    </Reveal>
                </section>
            </main>

            <footer className="border-t border-slate-200/80 bg-white/70 px-4 py-8 text-sm text-slate-500 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-400 sm:px-6 lg:px-8">
                <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                        <LogoIcon className="h-5 w-5" />
                        <span className={`font-bold text-slate-700 dark:text-slate-200 ${translated ? 'font-black' : 'font-righteous'}`}>{text('app.name', 'Nilayam')}</span>
                        <span className="hidden h-4 w-px bg-slate-300 dark:bg-slate-700 md:block" />
                        <span>A product of Siddhi Dynamics LLP</span>
                    </div>
                    <div>&copy; {new Date().getFullYear()} All rights reserved.</div>
                </div>
            </footer>

            <style>{`
                @keyframes floatSoft { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
                @keyframes floatMid { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-14px); } }
                @keyframes floatFast { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
                .animate-float-soft { animation: floatSoft 6.5s ease-in-out infinite; }
                .animate-float-mid { animation: floatMid 7.5s ease-in-out infinite; }
                .animate-float-fast { animation: floatFast 4.6s ease-in-out infinite; }
            `}</style>
        </div>
    );
};

export default LandingPage;
