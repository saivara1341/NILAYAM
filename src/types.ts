
export enum UserRole {
    Owner = 'owner',
    Tenant = 'tenant',
    Admin = 'admin'
}

export type SubscriptionTier = 'basic' | 'pro';

export interface BankDetails {
    accountHolder: string;
    accountNumber: string;
    ifsc: string;
    bankName: string;
}

export interface PaymentMethods {
    upiId?: string;
    qrCodeUrl?: string;
    bankDetails?: BankDetails;
}

export interface Profile {
    id: string;
    role: UserRole | null;
    full_name: string;
    avatar_url?: string;
    phone_number?: string;
    aadhaar_number?: string;
    bio?: string;
    subscription_tier?: SubscriptionTier;
    payment_methods?: PaymentMethods;
    is_verified?: boolean;
    id_proof_url?: string;
}

export enum OccupancyStatus {
    Occupied = 'Occupied',
    Vacant = 'Vacant',
}

export enum PropertyType {
    APARTMENT_COMPLEX = 'APARTMENT_COMPLEX',
    GATED_COMMUNITY_VILLA = 'GATED_COMMUNITY_VILLA',
    INDEPENDENT_HOUSE = 'INDEPENDENT_HOUSE',
    ROW_HOUSES = 'ROW_HOUSES',
    STANDALONE_BUILDING = 'STANDALONE_BUILDING',
    MULTI_STOREY_BUILDING = 'MULTI_STOREY_BUILDING',
    OFFICE_BUILDING = 'OFFICE_BUILDING',
    RETAIL_SHOWROOM = 'RETAIL_SHOWROOM',
    SHOPPING_MALL = 'SHOPPING_MALL',
    MIXED_USE_COMPLEX = 'MIXED_USE_COMPLEX',
    WAREHOUSE = 'WAREHOUSE',
    FACTORY = 'FACTORY',
    UNIVERSITY_CAMPUS = 'UNIVERSITY_CAMPUS',
    SCHOOL_CAMPUS = 'SCHOOL_CAMPUS',
    HOSPITAL_COMPLEX = 'HOSPITAL_COMPLEX',
    HOTEL = 'HOTEL',
    RESORT = 'RESORT',
    PG_HOSTEL = 'PG_HOSTEL',
    SERVICED_APARTMENT = 'SERVICED_APARTMENT',
    AGRICULTURAL_LAND = 'AGRICULTURAL_LAND',
    COMMERCIAL_PLOT = 'COMMERCIAL_PLOT',
    RESIDENTIAL_PLOT = 'RESIDENTIAL_PLOT',
}

export interface CommunityFeatures {
    enable_chat: boolean;
    enable_polls: boolean;
    enable_gate_pass: boolean;
    enable_amenities: boolean;
}

export interface Building {
    id: string;
    name: string;
    address: string;
    property_type?: PropertyType;
    cctv_url?: string;
    images?: string[];
    google_map_url?: string;
    threed_model_url?: string;
    panorama_url?: string;
    coordinates?: { lat: number; lng: number };
    community_features?: CommunityFeatures;
}

export interface BuildingData {
    name: string;
    address: string;
    property_type?: PropertyType;
    cctv_url?: string;
    images?: string[];
    google_map_url?: string;
    threed_model_url?: string;
    panorama_url?: string;
    coordinates?: { lat: number; lng: number };
    community_features?: CommunityFeatures;
}

export interface House {
    id: string;
    building_id: string;
    house_number: string;
    rent_amount: number;
    tenant_name: string | null;
    tenant_phone_number: string | null;
    tenant_id: string | null;
    lease_end_date: string | null;
    is_listed_on_marketplace: boolean;
    parking_slot?: string;
}

export interface UnitData {
    house_number: string;
    rent_amount: number;
    security_deposit?: number;
    parking_slot?: string;
}

export interface DashboardSummary {
    totalProperties: number;
    totalUnits: number;
    occupancyRate: number;
    totalRevenue: number;
    outstandingPayments: number;
    maintenanceRequests: number;
}

export interface FinancialDataPoint {
    month: string;
    income: number;
    expenses: number;
}

export interface OccupancyDataPoint {
    name: OccupancyStatus;
    value: number;
}

export interface Property extends Building {
    unit_count: number;
}

export interface Tenant {
    id: string;
    name: string | null;
    phone_number: string | null;
    building_name: string | null;
    house_number: string | null;
    tenant_score?: number;
}

export type TransactionType = 'income' | 'expense';

export interface Transaction {
    id: string;
    date: string;
    description: string;
    category: string;
    amount: number;
    type: TransactionType;
}

export type MaintenanceStatus = 'open' | 'in_progress' | 'closed' | 'resolved';

export interface MaintenanceRequest {
    id: string;
    description: string;
    status: MaintenanceStatus;
    created_at: string;
    building_name: string;
    house_number: string;
    image_urls?: string[];
}

export interface AiSuggestion {
    title: string;
    description: string;
    priority: 'High' | 'Medium' | 'Low';
}

export interface TodaysFocusItem {
    title: string;
    description: string;
    priority: 'High' | 'Medium' | 'Low';
    link: string | null;
}

export interface LeaseExpiry {
    house_id: string;
    tenant_name: string;
    building_name: string;
    building_id: string;
    house_number: string;
    lease_end_date: string;
}

export type ListingType = 'sale' | 'rent';
export type FurnishingStatus = 'furnished' | 'semi-furnished' | 'unfurnished';
export type PreferredTenants = 'any' | 'family' | 'bachelors' | 'company';
export type PossessionStatus = 'ready_to_move' | 'under_construction';

export interface Listing {
    id: number;
    created_at: string;
    owner_id: string;
    building_id: string;
    listing_type: ListingType;
    price: number;
    description: string;
    contact_info: string;
    image_url?: string | null;
    building_name: string;
    address: string;
    images?: string[];
    bedrooms?: number;
    bathrooms?: number;
    area_sqft?: number;
    furnishing_status?: FurnishingStatus;
    amenities?: string[];
    parking_available?: boolean;
    possession_status?: PossessionStatus;
    preferred_tenants?: PreferredTenants;
    house_number?: string;
    google_map_url?: string;
    threed_model_url?: string;
    panorama_url?: string;
    coordinates?: { lat: number; lng: number };
}

export type NewListingData = Omit<Listing, 'id' | 'created_at' | 'owner_id' | 'building_name' | 'address'> & { house_id?: string | null };

export interface VacantUnit {
    id: string;
    house_number: string;
    rent_amount: number;
    buildings: {
        id: string;
        name: string;
    } | null;
}

export interface DetailedVacantUnit extends VacantUnit {
    building_id: string;
    rent_amount: number;
    buildings: {
        id: string;
        name: string;
        address: string;
        property_type: PropertyType;
    } | null;
}

export interface Announcement {
    id: string;
    created_at: string;
    title: string;
    message: string;
    audience: 'all_tenants' | 'specific_building';
    target_id: string | null;
}

export interface TenantDocument {
    id: string;
    name: string;
    type: string;
    status: 'pending' | 'verified' | 'rejected';
    verification_notes?: string;
    uploaded_at: string;
    url?: string;
}

export interface Payment {
    id: string;
    due_date: string;
    paid_date?: string;
    amount: number;
    status: 'paid' | 'due';
}

export type ChargeCategory =
    | 'rent'
    | 'electricity'
    | 'water'
    | 'maintenance'
    | 'internet'
    | 'parking'
    | 'security_deposit'
    | 'other';

export type ChargeStatus = 'paid' | 'due' | 'overdue' | 'scheduled';

export interface ChargeLedgerEntry {
    id: string;
    tenant_id?: string | null;
    house_id: string;
    category: ChargeCategory;
    label: string;
    billing_month: string;
    amount: number;
    due_date: string;
    paid_date?: string;
    status: ChargeStatus;
    notes?: string;
    meter_reading?: number;
    units_consumed?: number;
    source: 'payment' | 'manual';
}

export type AgreementType =
    | 'residential_rental'
    | 'leave_and_license'
    | 'commercial_lease'
    | 'pg_hostel'
    | 'company_lease';

export type AgreementStatus =
    | 'draft'
    | 'active'
    | 'renewal_due'
    | 'renewal_in_progress'
    | 'vacate_notice_received'
    | 'closure_in_progress'
    | 'closed';

export interface AgreementWorkflow {
    tenant_id?: string | null;
    house_id: string;
    agreement_type: AgreementType;
    status: AgreementStatus;
    agreement_start_date?: string | null;
    agreement_end_date?: string | null;
    renewal_notice_days: number;
    vacate_notice_date?: string | null;
    vacate_reason?: string | null;
    notice_period_days?: number;
    stamp_duty_status?: 'pending' | 'completed' | 'na';
    registration_status?: 'pending' | 'completed' | 'na';
    last_updated_at: string;
}

export type ReminderChannel = 'in_app' | 'email' | 'whatsapp';
export type ReminderType = 'rent' | 'utility' | 'agreement_renewal' | 'vacate_followup';

export interface ReminderRecord {
    id: string;
    tenant_id?: string | null;
    house_id: string;
    type: ReminderType;
    title: string;
    message: string;
    scheduled_for: string;
    channel: ReminderChannel;
    status: 'scheduled' | 'sent';
    created_at: string;
    sent_at?: string;
}

export interface TenantLifecycleData {
    move_in_date?: string | null;
    advance_amount?: number;
    advance_received_on?: string | null;
    possession_handover_on?: string | null;
    agreement_acknowledged_at?: string | null;
    agreement_acceptance_note?: string | null;
    aadhaar_number?: string | null;
    tenant_score?: number;
}

export interface TenantOperationalData {
    ledger: ChargeLedgerEntry[];
    agreement: AgreementWorkflow;
    reminders: ReminderRecord[];
    lifecycle?: TenantLifecycleData;
}

export interface TenantProfile extends Tenant {
    building_id: string;
    tenant_id?: string | null;
    rent_amount: number;
    lease_end_date: string | null;
    parking_slot?: string;
    payments: Payment[];
    operations?: TenantOperationalData;
    lifecycle?: TenantLifecycleData;
}

export interface TenantDashboardData {
    tenancyDetails: {
        building_name: string;
        house_number: string;
        house_id: string;
        lease_end_date: string | null;
        rent_amount: number;
        cctv_url?: string | null;
        lifecycle?: TenantLifecycleData;
    };
    nextPayment: {
        id: string;
        due_date: string;
        amount: number;
    } | null;
    recentAnnouncements: any[];
    openMaintenanceRequests: any[];
    landlordPaymentDetails?: PaymentMethods;
    chargeLedger: ChargeLedgerEntry[];
    agreement: AgreementWorkflow | null;
    reminders: ReminderRecord[];
    lifecycle?: TenantLifecycleData;
}

export interface AppNotification {
    id: string;
    title: string;
    message: string;
    type: string;
    priority: string;
    timestamp: string;
    meta?: any;
}

export type TaskStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface TaskJob {
    id: string;
    topic: string;
    status: TaskStatus;
    payload: any;
    progress: number;
    createdAt: string;
    error?: string;
}

export type ServiceCategory =
    | 'Electrician'
    | 'Plumber'
    | 'Wholesale'
    | 'Cleaning'
    | 'Carpenter'
    | 'General'
    | 'Painter'
    | 'Security'
    | 'Pest Control'
    | 'Appliance Repair'
    | 'Interior Designer'
    | 'Laundry'
    | 'Packers & Movers'
    | 'Broadband'
    | 'Gardener'
    | 'Other';

export interface ServiceProvider {
    id: string;
    name: string;
    category: string;
    phone_number: string;
    location: string;
    rating: number;
    jobs_completed: number;
    is_verified: boolean;
    description?: string;
    availability: string;
    catalogs?: any[];
}

export interface ServiceReview {
    id: string;
    provider_id: string;
    rating: number;
    comment: string;
    reviewer_name: string;
    created_at: string;
}

export interface Visitor {
    id: string;
    name: string;
    type: string;
    building_id?: string;
    house_id?: string;
    access_code: string;
    valid_until: string;
    status: 'active' | 'expired' | 'used' | 'cancelled';
}

export interface Amenity {
    id: string;
    name: string;
    building_id: string;
    capacity: number;
    open_time: string;
    close_time: string;
}

export interface Poll {
    id: string;
    question: string;
    options: { id: string; text: string; votes: number }[];
    building_id: string;
    total_votes: number;
    status: 'active' | 'closed';
    created_by: string;
}

export interface ChatMessage {
    id: string;
    sender_name: string;
    sender_role: string;
    text: string;
    timestamp: string;
    replyTo?: {
        sender_name: string;
        text: string;
    };
}

export interface Document {
    id: string;
    name: string;
    size: number;
    created_at: string;
    publicUrl: string;
}

export interface ForecastDataPoint {
    month: string;
    predictedIncome: number;
    confidence: number;
    trend: 'up' | 'down' | 'stable';
}

export type LanguageCode = 'en' | 'te' | 'hi' | 'ta' | 'kn' | 'ml' | 'mr' | 'bn' | 'gu' | 'pa';
