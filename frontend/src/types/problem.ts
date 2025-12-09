export enum ProblemStatus {
  NEW = 'NEW',
  INVESTIGATING = 'INVESTIGATING',
  ROOT_CAUSE_FOUND = 'ROOT_CAUSE_FOUND',
  WORKAROUND_AVAILABLE = 'WORKAROUND_AVAILABLE',
  PERMANENT_SOLUTION_FOUND = 'PERMANENT_SOLUTION_FOUND',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

export enum ProblemPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum ProblemImpact {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum RCAMethod {
  FIVE_WHYS = 'FIVE_WHYS',
  FISHBONE = 'FISHBONE',
  FAULT_TREE = 'FAULT_TREE',
  KEPNER_TREGOE = 'KEPNER_TREGOE',
  OTHER = 'OTHER',
}

export interface Problem {
  id: number;
  problem_number: string;
  title: string;
  description: string;
  status: ProblemStatus;
  priority: ProblemPriority;
  impact: ProblemImpact;
  category_id?: number;
  subcategory_id?: number;
  assigned_to_id?: number;
  assigned_group_id?: number;
  rca_method?: RCAMethod;
  root_cause?: string;
  symptoms?: string;
  investigation_notes?: string;
  has_workaround: boolean;
  workaround_description?: string;
  workaround_steps?: string;
  has_permanent_solution: boolean;
  permanent_solution_description?: string;
  solution_implementation_plan?: string;
  related_change_id?: number;
  known_error_id?: number;
  tags?: string[];
  incident_count: number;
  affected_users_count: number;
  business_impact_description?: string;
  identified_at: string;
  investigation_started_at?: string;
  root_cause_found_at?: string;
  workaround_available_at?: string;
  resolved_at?: string;
  closed_at?: string;
  created_at: string;
  updated_at: string;

  // Related objects
  category?: any;
  subcategory?: any;
  assigned_to?: any;
  assigned_group?: any;
  related_change?: any;
  known_error?: KnownError;
  activities?: ProblemActivity[];
  comments?: ProblemComment[];
  related_incidents?: ProblemIncidentLink[];
}

export interface ProblemCreate {
  title: string;
  description: string;
  priority?: ProblemPriority;
  impact?: ProblemImpact;
  category_id?: number;
  subcategory_id?: number;
  assigned_to_id?: number;
  assigned_group_id?: number;
  symptoms?: string;
  tags?: string[];
}

export interface ProblemUpdate {
  title?: string;
  description?: string;
  status?: ProblemStatus;
  priority?: ProblemPriority;
  impact?: ProblemImpact;
  category_id?: number;
  subcategory_id?: number;
  assigned_to_id?: number;
  assigned_group_id?: number;
  symptoms?: string;
  investigation_notes?: string;
  tags?: string[];
}

export interface KnownError {
  id: number;
  known_error_number: string;
  title: string;
  description: string;
  is_active: boolean;
  problem_id: number;
  error_symptoms: string;
  root_cause: string;
  affected_cis?: any[];
  workaround_description: string;
  workaround_steps?: string;
  workaround_limitations?: string;
  permanent_solution_description?: string;
  solution_status?: string;
  solution_eta?: string;
  kb_article_id?: number;
  tags?: string[];
  views_count: number;
  helpful_count: number;
  created_at: string;
  updated_at: string;
  archived_at?: string;

  // Related objects
  problem?: Problem;
  kb_article?: any;
}

export interface ProblemIncidentLink {
  id: number;
  problem_id: number;
  ticket_id: number;
  linked_at: string;
  linked_by_id: number;
  link_reason?: string;

  // Related objects
  ticket?: any;
  linked_by?: any;
}

export interface ProblemComment {
  id: number;
  problem_id: number;
  user_id: number;
  comment: string;
  is_internal: boolean;
  created_at: string;
  updated_at: string;

  // Related objects
  user?: any;
}

export interface ProblemActivity {
  id: number;
  problem_id: number;
  user_id: number;
  activity_type: string;
  description: string;
  old_value?: string;
  new_value?: string;
  metadata?: any;
  created_at: string;

  // Related objects
  user?: any;
}

export interface ProblemListResponse {
  items: Problem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface KnownErrorListResponse {
  items: KnownError[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// Display helper functions
export const getProblemStatusColor = (status: ProblemStatus): string => {
  const colors: Record<ProblemStatus, string> = {
    [ProblemStatus.NEW]: 'bg-blue-100 text-blue-800',
    [ProblemStatus.INVESTIGATING]: 'bg-yellow-100 text-yellow-800',
    [ProblemStatus.ROOT_CAUSE_FOUND]: 'bg-purple-100 text-purple-800',
    [ProblemStatus.WORKAROUND_AVAILABLE]: 'bg-indigo-100 text-indigo-800',
    [ProblemStatus.PERMANENT_SOLUTION_FOUND]: 'bg-green-100 text-green-800',
    [ProblemStatus.RESOLVED]: 'bg-green-100 text-green-800',
    [ProblemStatus.CLOSED]: 'bg-gray-100 text-gray-800',
    [ProblemStatus.CANCELLED]: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

export const getProblemPriorityColor = (priority: ProblemPriority): string => {
  const colors: Record<ProblemPriority, string> = {
    [ProblemPriority.LOW]: 'bg-gray-100 text-gray-800',
    [ProblemPriority.MEDIUM]: 'bg-blue-100 text-blue-800',
    [ProblemPriority.HIGH]: 'bg-orange-100 text-orange-800',
    [ProblemPriority.CRITICAL]: 'bg-red-100 text-red-800',
  };
  return colors[priority] || 'bg-gray-100 text-gray-800';
};

export const getRCAMethodLabel = (method: RCAMethod): string => {
  const labels: Record<RCAMethod, string> = {
    [RCAMethod.FIVE_WHYS]: '5 Whys',
    [RCAMethod.FISHBONE]: 'Fishbone Diagram',
    [RCAMethod.FAULT_TREE]: 'Fault Tree Analysis',
    [RCAMethod.KEPNER_TREGOE]: 'Kepner-Tregoe',
    [RCAMethod.OTHER]: 'Other',
  };
  return labels[method] || method;
};

export const getProblemStatusLabel = (status: ProblemStatus): string => {
  return status.split('_').map(word =>
    word.charAt(0) + word.slice(1).toLowerCase()
  ).join(' ');
};
