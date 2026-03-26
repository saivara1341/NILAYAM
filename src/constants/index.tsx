
import React from 'react';import { PropertyType } from '@/types';
import {
  Home,
  Building2,
  Building,
  FileText,
  Bot,
  Users,
  UserCircle,
  CircleDollarSign,
  Wrench,
  Store,
  LayoutDashboard,
  ClipboardList,
  BarChart3,
  MessageSquare,
  Eye,
  EyeOff,
  Bell,
  Wallet,
  CreditCard,
  BadgeCheck,
  CheckCircle2,
  Zap,
  Briefcase,
  UserPlus,
  Phone,
  Tag,
  MapPin,
  QrCode,
  Landmark,
  Fingerprint,
  Menu,
  Plug,
  Droplet,
  Truck,
  Hammer,
  PlusCircle,
  Camera,
  Video,
  Search,
  Percent,
  Mail,
  ArrowLeft,
  Sparkles,
  Layers,
  CloudUpload,
  Trash2,
  Pencil,
  Target,
  Mic,
  TrendingUp,
  ShoppingBag,
  CalendarDays,
  Settings,
} from 'lucide-react';

export const TrendingUpIcon = TrendingUp;
export const ShoppingBagIcon = ShoppingBag;
export const MicIcon = Mic;
export const TagIcon = Tag;
export const CameraIcon = Camera;
export const CalendarDaysIcon = CalendarDays;

export const Menu3ArrowsIcon = Menu;
export const TranslateIcon = (props: any) => <Zap {...props} />; // Placeholder for Translate if not found
export const HomeIcon = Home;
export const BuildingIcon = Building2;
export const PropertiesIcon = Building;
export const LeaseIcon = FileText;
export const BotIcon = Bot;
export const UsersIcon = Users;
export const UserCircleIcon = UserCircle;
export const DollarSignIcon = CircleDollarSign;
export const WrenchIcon = Wrench;
export const StoreIcon = Store;
export const DashboardIcon = LayoutDashboard;
export const TenantTrackingIcon = ClipboardList;
export const FinancialAnalyticsIcon = BarChart3;
export const AiCommunicationIcon = MessageSquare;
export const EyeIcon = Eye;
export const EyeOffIcon = EyeOff;
export const BellIcon = Bell;
export const PersonalPortalIcon = Wallet;
export const CreditCardIcon = CreditCard;
export const BadgeCheckIcon = BadgeCheck;
export const CheckCircleIcon = CheckCircle2;
export const LogoIcon = Home;
export const InsightsIcon = BarChart3;
export const BrainCircuitIcon = Bot;
export const MegaphoneIcon = Bell;
export const BedIcon = (props: any) => <Home {...props} />; // Better to use lucide
export const BathIcon = (props: any) => <Droplet {...props} />; 
export const SquareFootIcon = Layers;
export const LayersIcon = Layers;
export const CloudUploadIcon = CloudUpload;
export const TrashIcon = Trash2;
export const PencilIcon = Pencil;
export const SparklesIcon = Sparkles;
export const MessageSquareIcon = MessageSquare;
export const ShieldCheckIcon = BadgeCheck;
export const ShieldLockIcon = (props: any) => <BadgeCheck {...props} />;
export const FileTextIcon = FileText;
export const ZapIcon = Zap;
export const TargetIcon = Target;
export const PlusCircleIcon = PlusCircle;
export const ClipboardIcon = ClipboardList;
export const VideoIcon = Video;
export const SearchIcon = Search;
export const BadgePercentIcon = Percent;
export const MailIcon = Mail;
export const ArrowLeftIcon = ArrowLeft;
export const BriefcaseIcon = Briefcase;
export const MessageCircleIcon = MessageSquare;
export const UserPlusIcon = UserPlus;
export const PhoneIcon = Phone;
export const MapPinIcon = MapPin;
export const QrCodeIcon = QrCode;
export const BankIcon = Landmark;
export const FingerprintIcon = Fingerprint;
export const MenuIcon = Menu;
export const PlugIcon = Plug;
export const DropletIcon = Droplet;
export const TruckIcon = Truck;
export const HammerIcon = Hammer;


export const SettingsIcon = Settings;

export const formatPropertyType = (type: string | undefined) => {
    if (!type) return 'Property';
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
};

export const OWNER_NAV_LINKS = [
  { href: '/dashboard', labelKey: 'nav.dashboard', icon: <DashboardIcon className="w-5 h-5" /> },
  { href: '/properties', labelKey: 'nav.my_properties', icon: <PropertiesIcon className="w-5 h-5" /> },
  { href: '/tenants', labelKey: 'nav.tenants', icon: <UsersIcon className="w-5 h-5" /> },
  { href: '/agreements', labelKey: 'nav.agreements', icon: <LeaseIcon className="w-5 h-5" /> },
  { href: '/payments', labelKey: 'nav.payments', icon: <CreditCardIcon className="w-5 h-5" /> },
  { href: '/community', labelKey: 'nav.community', icon: <UsersIcon className="w-5 h-5" /> }, 
  { href: '/community-events', labelKey: 'nav.events', icon: <CalendarDaysIcon className="w-5 h-5" /> },
  { href: '/financials', labelKey: 'nav.financials', icon: <FinancialAnalyticsIcon className="w-5 h-5" /> },
  { href: '/maintenance', labelKey: 'nav.maintenance', icon: <WrenchIcon className="w-5 h-5" /> },
  { href: '/reports', labelKey: 'nav.reports', icon: <ClipboardIcon className="w-5 h-5" /> },
  { href: '/strategy-hub', labelKey: 'nav.strategy', icon: <BrainCircuitIcon className="w-5 h-5" /> },
  { href: '/system-health', labelKey: 'nav.ops', icon: <ShieldCheckIcon className="w-5 h-5" /> },
  { href: '/integrations', labelKey: 'nav.integrations', icon: <PlugIcon className="w-5 h-5" /> },
  { href: '/marketplace', labelKey: 'nav.marketplace', icon: <StoreIcon className="w-5 h-5" /> },
  { href: '/services', labelKey: 'nav.services', icon: <BriefcaseIcon className="w-5 h-5" /> }, 
  { href: '/crm', labelKey: 'nav.crm', icon: <TargetIcon className="w-5 h-5" /> },
  { href: '/profile', labelKey: 'nav.settings', icon: <SettingsIcon className="w-5 h-5" /> }, 
];

export const TENANT_NAV_LINKS = [
    { href: '/tenant-dashboard', labelKey: 'nav.home', icon: <HomeIcon className="w-5 h-5" /> },
    { href: '/agreements', labelKey: 'nav.agreements', icon: <LeaseIcon className="w-5 h-5" /> },
    { href: '/tenant-maintenance', labelKey: 'nav.maintenance', icon: <WrenchIcon className="w-5 h-5" /> },
    { href: '/marketplace', labelKey: 'nav.marketplace', icon: <StoreIcon className="w-5 h-5" /> },
    { href: '/feedback', labelKey: 'nav.feedback', icon: <MessageSquareIcon className="w-5 h-5" /> },
    { href: '/profile', labelKey: 'nav.settings', icon: <SettingsIcon className="w-5 h-5" /> },
];

export const TENANT_COMMUNITY_LINKS = [
    { href: '/community', labelKey: 'nav.community', icon: <UsersIcon className="w-5 h-5" />, disabled: false },
    { href: '/services', labelKey: 'nav.find_pros', icon: <BriefcaseIcon className="w-5 h-5" />, disabled: false },
    { href: '/community-events', labelKey: 'nav.events', icon: <CalendarDaysIcon className="w-5 h-5" />, disabled: false },
];

export const PROPERTY_TYPE_CATEGORIES = {
    'Residential': [
        PropertyType.APARTMENT_COMPLEX,
        PropertyType.GATED_COMMUNITY_VILLA,
        PropertyType.INDEPENDENT_HOUSE,
        PropertyType.ROW_HOUSES,
        PropertyType.STANDALONE_BUILDING,
        PropertyType.MULTI_STOREY_BUILDING,
    ],
    'Commercial': [
        PropertyType.OFFICE_BUILDING,
        PropertyType.RETAIL_SHOWROOM,
        PropertyType.SHOPPING_MALL,
        PropertyType.MIXED_USE_COMPLEX,
    ],
    'Industrial': [
        PropertyType.WAREHOUSE,
        PropertyType.FACTORY,
    ],
    'Institutional': [
        PropertyType.UNIVERSITY_CAMPUS,
        PropertyType.SCHOOL_CAMPUS,
        PropertyType.HOSPITAL_COMPLEX,
    ],
    'Hospitality': [
        PropertyType.HOTEL,
        PropertyType.RESORT,
        PropertyType.PG_HOSTEL,
        PropertyType.SERVICED_APARTMENT,
    ],
    'Land': [
        PropertyType.AGRICULTURAL_LAND,
        PropertyType.COMMERCIAL_PLOT,
        PropertyType.RESIDENTIAL_PLOT,
    ]
};
