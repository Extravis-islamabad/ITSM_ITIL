import axiosInstance from '@/lib/axios';

export type IntegrationType = 'JIRA' | 'TRELLO' | 'ASANA';
export type IntegrationStatus = 'ACTIVE' | 'INACTIVE' | 'ERROR' | 'PENDING';
export type ImportStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'PARTIALLY_COMPLETED';

export interface Integration {
  id: number;
  name: string;
  integration_type: IntegrationType;
  status: IntegrationStatus;
  api_url?: string;
  jira_project_key?: string;
  trello_board_id?: string;
  asana_workspace_id?: string;
  asana_project_id?: string;
  auto_sync: boolean;
  sync_interval_minutes: number;
  import_attachments: boolean;
  import_comments: boolean;
  last_sync_at?: string;
  last_error?: string;
  created_at: string;
  field_mappings?: Record<string, any>;
  status_mappings?: Record<string, string>;
  priority_mappings?: Record<string, string>;
}

export interface IntegrationCreate {
  name: string;
  integration_type: IntegrationType;
  api_url?: string;
  api_key?: string;
  api_secret?: string;
  username?: string;
  jira_project_key?: string;
  trello_board_id?: string;
  asana_workspace_id?: string;
  asana_project_id?: string;
  auto_sync?: boolean;
  sync_interval_minutes?: number;
  import_attachments?: boolean;
  import_comments?: boolean;
  field_mappings?: Record<string, any>;
  status_mappings?: Record<string, string>;
  priority_mappings?: Record<string, string>;
}

export interface IntegrationUpdate extends Partial<IntegrationCreate> {
  status?: IntegrationStatus;
}

export interface ImportJob {
  id: number;
  integration_id: number;
  status: ImportStatus;
  import_type: string;
  total_items: number;
  processed_items: number;
  successful_items: number;
  failed_items: number;
  skipped_items: number;
  started_at?: string;
  completed_at?: string;
  error_log?: Array<{ external_id?: string; external_key?: string; error: string }>;
  created_at: string;
}

export interface ImportedItem {
  id: number;
  external_id: string;
  external_key?: string;
  external_url?: string;
  ticket_id?: number;
  status: string;
  error_message?: string;
  created_at: string;
}

export interface ImportRequest {
  project_key?: string;
  board_id?: string;
  project_id?: string;
}

export interface PreviewItem {
  external_id: string;
  external_key?: string;
  title: string;
  status?: string;
  priority?: string;
  type?: string;
  labels?: string[];
  completed?: boolean;
  assignee?: string;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  user?: string;
  email?: string;
  username?: string;
  error?: string;
}

export const integrationService = {
  // Get all integrations
  getIntegrations: async (type?: IntegrationType, status?: IntegrationStatus): Promise<Integration[]> => {
    const params: Record<string, string> = {};
    if (type) params.integration_type = type;
    if (status) params.status = status;
    const response = await axiosInstance.get<Integration[]>('/integrations', { params });
    return response.data;
  },

  // Get integration by ID
  getIntegration: async (id: number): Promise<Integration> => {
    const response = await axiosInstance.get<Integration>(`/integrations/${id}`);
    return response.data;
  },

  // Create integration
  createIntegration: async (data: IntegrationCreate): Promise<Integration> => {
    const response = await axiosInstance.post<Integration>('/integrations', data);
    return response.data;
  },

  // Update integration
  updateIntegration: async (id: number, data: IntegrationUpdate): Promise<Integration> => {
    const response = await axiosInstance.put<Integration>(`/integrations/${id}`, data);
    return response.data;
  },

  // Delete integration
  deleteIntegration: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/integrations/${id}`);
  },

  // Test connection
  testConnection: async (id: number): Promise<ConnectionTestResult> => {
    const response = await axiosInstance.post<ConnectionTestResult>(`/integrations/${id}/test`);
    return response.data;
  },

  // Get projects/boards from integration
  getProjects: async (id: number): Promise<{ projects?: any[]; boards?: any[]; workspaces?: any[] }> => {
    const response = await axiosInstance.get(`/integrations/${id}/projects`);
    return response.data;
  },

  // Get Asana projects
  getAsanaProjects: async (id: number, workspaceId?: string): Promise<{ projects: any[] }> => {
    const params = workspaceId ? { workspace_id: workspaceId } : {};
    const response = await axiosInstance.get(`/integrations/${id}/asana/projects`, { params });
    return response.data;
  },

  // Get Trello lists
  getTrelloLists: async (id: number, boardId?: string): Promise<{ lists: any[] }> => {
    const params = boardId ? { board_id: boardId } : {};
    const response = await axiosInstance.get(`/integrations/${id}/trello/lists`, { params });
    return response.data;
  },

  // Preview import
  previewImport: async (id: number, request: ImportRequest): Promise<{ total: number; preview_count: number; items: PreviewItem[] }> => {
    const response = await axiosInstance.post(`/integrations/${id}/preview`, request);
    return response.data;
  },

  // Start import
  startImport: async (id: number, request: ImportRequest): Promise<ImportJob> => {
    const response = await axiosInstance.post<ImportJob>(`/integrations/${id}/import`, request);
    return response.data;
  },

  // Get import jobs
  getImportJobs: async (integrationId: number): Promise<ImportJob[]> => {
    const response = await axiosInstance.get<ImportJob[]>(`/integrations/${integrationId}/imports`);
    return response.data;
  },

  // Get import job
  getImportJob: async (jobId: number): Promise<ImportJob> => {
    const response = await axiosInstance.get<ImportJob>(`/integrations/imports/${jobId}`);
    return response.data;
  },

  // Get imported items
  getImportedItems: async (jobId: number, statusFilter?: string, skip = 0, limit = 50): Promise<{ total: number; items: ImportedItem[] }> => {
    const params: Record<string, any> = { skip, limit };
    if (statusFilter) params.status_filter = statusFilter;
    const response = await axiosInstance.get(`/integrations/imports/${jobId}/items`, { params });
    return response.data;
  },

  // Get default mappings
  getDefaultMappings: async (type: IntegrationType): Promise<{ status_mappings: Record<string, string>; priority_mappings: Record<string, string> }> => {
    const response = await axiosInstance.get('/integrations/mappings/defaults', { params: { integration_type: type } });
    return response.data;
  },
};
