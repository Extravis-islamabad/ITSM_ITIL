// User types
export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  phone?: string;
  employee_id?: string;
  role: string;
  role_id: number;
  department?: string;
  department_id?: number;
  manager?: string;
  is_superuser: boolean;
  is_active: boolean;
  avatar_url?: string;
  timezone: string;
  language: string;
  created_at: string;
  last_login?: string;
  permissions?: Permission[];
}

export interface Permission {
  module: string;
  action: string;
  scope: string;
}

export interface Role {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  role_type: string;
  level: number;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface RoleDetail extends Role {
  permissions: PermissionDetail[];
  user_count: number;
}

export interface PermissionDetail {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  module: string;
  action: string;
  scope: string;
  is_active: boolean;
}

// Auth types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  updateToken: (token: string) => void;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// Department types
export interface Department {
  id: number;
  name: string;
  code: string;
  description?: string;
  parent_id?: number;
  is_active: boolean;
}

// Common types
export type StatusType = 'success' | 'error' | 'warning' | 'info';

export interface FilterParams {
  search?: string;
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// Ticket types
export type TicketType = 'INCIDENT' | 'REQUEST' | 'PROBLEM' | 'CHANGE' | 'incident' | 'request' | 'problem' | 'change';
export type TicketStatus = 'NEW' | 'OPEN' | 'IN_PROGRESS' | 'PENDING' | 'RESOLVED' | 'CLOSED' | 'CANCELLED' | 'new' | 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed' | 'cancelled';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'low' | 'medium' | 'high' | 'critical';
export type TicketImpact = 'LOW' | 'MEDIUM' | 'HIGH' | 'low' | 'medium' | 'high';
export type TicketUrgency = 'LOW' | 'MEDIUM' | 'HIGH' | 'low' | 'medium' | 'high';

export interface Ticket {
  id: number;
  ticket_number: string;
  title: string;
  description: string;
  ticket_type: TicketType;
  status: TicketStatus;
  priority: TicketPriority;
  impact: TicketImpact;
  urgency: TicketUrgency;
  requester_id: number;
  requester_name?: string;
  assignee_id?: number;
  assignee_name?: string;
  category_id?: number;
  category_name?: string;
  subcategory_id?: number;
  subcategory_name?: string;
  assigned_group_id?: number;
  group_name?: string;
  sla_policy_id?: number;
  created_at: string;
  updated_at?: string;
  response_due?: string;
  resolution_due?: string;
  response_breached: boolean;
  resolution_breached: boolean;
}

export interface LinkedAsset {
  id: number;
  asset_id: number;
  asset_tag: string;
  asset_name: string;
  asset_type_name?: string;
  status?: string;
  notes?: string;
}

export interface TicketDetail extends Ticket {
  resolution_notes?: string;
  resolved_at?: string;
  resolved_by_id?: number;
  closed_at?: string;
  closed_by_id?: number;
  closure_code?: string;
  source?: string;
  linked_assets?: LinkedAsset[];
  // Date override fields (Manager+ only)
  created_at_override?: string;
  resolved_at_override?: string;
  closed_at_override?: string;
  override_reason?: string;
  override_by_id?: number;
}

export interface TicketComment {
  id: number;
  ticket_id: number;
  user_id: number;
  user_name?: string;
  comment: string;
  is_internal: boolean;
  created_at: string;
  updated_at?: string;
}

export interface TicketActivity {
  id: number;
  ticket_id: number;
  user_id?: number;
  user_name?: string;
  activity_type: string;
  description: string;
  old_value?: any;
  new_value?: any;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  is_active: boolean;
  subcategories?: Subcategory[];
}

export interface Subcategory {
  id: number;
  category_id: number;
  name: string;
  description?: string;
  is_active: boolean;
}

export interface TicketStats {
  total: number;
  open: number;
  my_tickets: number;
  unassigned: number;
  critical: number;
}

// Knowledge Base types
export type ArticleStatus = 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED';

export interface KnowledgeCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  parent_id?: number;
  sort_order: number;
  is_active: boolean;
  is_public: boolean;
  article_count?: number;
  created_at: string;
  updated_at?: string;
  subcategories?: KnowledgeCategory[];
  articles?: KnowledgeArticle[];
}

export interface KnowledgeArticle {
  id: number;
  title: string;
  slug: string;
  summary?: string;
  content: string;
  category_id?: number;
  category_name?: string;
  tags?: string;
  status: ArticleStatus;
  is_featured: boolean;
  is_faq: boolean;
  author_id: number;
  author_name?: string;
  last_reviewed_by_id?: number;
  last_reviewed_at?: string;
  published_at?: string;
  archived_at?: string;
  meta_title?: string;
  meta_description?: string;
  view_count: number;
  helpful_count: number;
  not_helpful_count: number;
  created_at: string;
  updated_at?: string;
  related_articles?: KnowledgeArticle[];
}

export interface ArticleRating {
  id: number;
  article_id: number;
  user_id?: number;
  is_helpful: boolean;
  feedback?: string;
  created_at: string;
}

export interface ArticleSearchParams {
  query?: string;
  search?: string;
  category_id?: number;
  tags?: string;
  status?: ArticleStatus;
  is_featured?: boolean;
  is_faq?: boolean;
  page?: number;
  page_size?: number;
}

export interface KnowledgeAnalytics {
  total_articles: number;
  published_articles: number;
  draft_articles: number;
  total_views: number;
  total_ratings: number;
  helpful_percentage: number;
  popular_articles: KnowledgeArticle[];
  recent_articles: KnowledgeArticle[];
}

// Asset Management types
export type AssetStatus = 'NEW' | 'ACTIVE' | 'IN_MAINTENANCE' | 'RETIRED' | 'DISPOSED' | 'LOST' | 'STOLEN';
export type AssetCondition = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED';
export type RelationshipType = 'DEPENDS_ON' | 'PART_OF' | 'CONNECTED_TO' | 'INSTALLED_ON' | 'USES';
export type ContractType = 'WARRANTY' | 'MAINTENANCE' | 'SUPPORT' | 'LEASE';

export interface AssetType {
  id: number;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  parent_id?: number;
  is_hardware: boolean;
  requires_serial: boolean;
  is_active: boolean;
  asset_count?: number;
  created_at: string;
  updated_at?: string;
}

export interface Asset {
  id: number;
  asset_tag: string;
  name: string;
  description?: string;

  // Classification
  asset_type_id: number;
  asset_type_name?: string;
  manufacturer?: string;
  model?: string;
  serial_number?: string;

  // Status and condition
  status: AssetStatus;
  condition?: AssetCondition;

  // Location and assignment
  location?: string;
  department_id?: number;
  department_name?: string;
  assigned_to_id?: number;
  assigned_to_name?: string;
  assigned_to_email?: string;
  assigned_date?: string;

  // Financial
  purchase_date?: string;
  purchase_cost?: number;
  current_value?: number;
  supplier?: string;
  po_number?: string;

  // Warranty
  warranty_start_date?: string;
  warranty_end_date?: string;
  warranty_provider?: string;

  // Technical
  specifications?: string;
  ip_address?: string;
  mac_address?: string;
  hostname?: string;

  // Software license
  license_key?: string;
  license_expiry?: string;
  license_seats?: number;

  // Lifecycle
  deployment_date?: string;
  retirement_date?: string;
  disposal_date?: string;

  // Tracking
  notes?: string;
  qr_code?: string;
  barcode?: string;

  // Counts
  assignment_count?: number;
  contract_count?: number;
  relationship_count?: number;

  // Metadata
  created_by_id: number;
  created_by_name?: string;
  created_at: string;
  updated_at?: string;
}

export interface AssetDetail extends Asset {
  assignments: AssetAssignment[];
  contracts: AssetContract[];
  history: AssetHistory[];
  parent_relationships: AssetRelationship[];
  child_relationships: AssetRelationship[];
}

export interface AssetAssignment {
  id: number;
  asset_id: number;
  asset_name?: string;
  asset_tag?: string;
  user_id: number;
  user_name?: string;
  user_email?: string;
  assigned_by_id: number;
  assigned_by_name?: string;
  assigned_date: string;
  returned_date?: string;
  notes?: string;
  is_current: boolean;
}

export interface AssetRelationship {
  id: number;
  parent_asset_id: number;
  parent_asset_name?: string;
  parent_asset_tag?: string;
  child_asset_id: number;
  child_asset_name?: string;
  child_asset_tag?: string;
  relationship_type: RelationshipType;
  description?: string;
  created_by_id: number;
  created_by_name?: string;
  created_at: string;
}

export interface AssetHistory {
  id: number;
  asset_id: number;
  action: string;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  description?: string;
  user_id: number;
  user_name?: string;
  created_at: string;
}

export interface AssetContract {
  id: number;
  asset_id: number;
  asset_name?: string;
  asset_tag?: string;
  contract_type: string;
  provider: string;
  contract_number?: string;
  start_date: string;
  end_date: string;
  cost?: number;
  renewal_date?: string;
  auto_renew: boolean;
  terms?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  notes?: string;
  is_active: boolean;
  days_until_expiry?: number;
  is_expired?: boolean;
  created_by_id: number;
  created_by_name?: string;
  created_at: string;
  updated_at?: string;
}

export interface AssetAnalytics {
  total_assets: number;
  total_value: number;
  by_status: { [key: string]: number };
  by_type: { [key: string]: number };
  by_condition: { [key: string]: number };
  by_department: { [key: string]: number };
  assigned_count: number;
  unassigned_count: number;
  expiring_warranties: Asset[];
  expiring_contracts: AssetContract[];
  recent_acquisitions: Asset[];
}

export interface AssetQRCode {
  asset_id: number;
  asset_tag: string;
  qr_code_url: string;
  qr_code_data: string;
}

export interface AssetFilterParams extends FilterParams {
  asset_type_id?: number;
  status?: AssetStatus;
  condition?: AssetCondition;
  department_id?: number;
  assigned_to_id?: number;
  is_assigned?: boolean;
}