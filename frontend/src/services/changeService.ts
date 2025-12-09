import axiosInstance from '@/lib/axios';

export interface ChangeTask {
  title: string;
  description?: string;
  sequence: number;
  assigned_to_id?: number;
}

export interface ChangeCreateRequest {
  title: string;
  description: string;
  change_type: 'STANDARD' | 'NORMAL' | 'EMERGENCY';
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
  category_id?: number;
  owner_id: number;
  implementer_id?: number;
  reason_for_change: string;
  implementation_plan: string;
  rollback_plan: string;
  testing_plan?: string;
  business_justification: string;
  affected_services?: string;
  affected_users_count: number;
  planned_start?: string;
  planned_end?: string;
  requires_cab_approval: boolean;
  tasks?: ChangeTask[];
}

export const changeService = {
  createChange: async (data: ChangeCreateRequest) => {
    const response = await axiosInstance.post('/changes', data);
    return response.data;
  },

  getChanges: async (params?: any) => {
    const response = await axiosInstance.get('/changes', { params });
    return response.data;
  },

  getChange: async (id: number) => {
    const response = await axiosInstance.get(`/changes/${id}`);
    return response.data;
  },

  updateChange: async (id: number, data: any) => {
    const response = await axiosInstance.put(`/changes/${id}`, data);
    return response.data;
  },

  submitForApproval: async (id: number) => {
    const response = await axiosInstance.post(`/changes/${id}/submit`);
    return response.data;
  },

  approveChange: async (id: number, approved: boolean, comments: string) => {
    const response = await axiosInstance.post(`/changes/${id}/approve`, {
      approved,
      comments,
    });
    return response.data;
  },

  startImplementation: async (id: number) => {
    const response = await axiosInstance.post(`/changes/${id}/start`);
    return response.data;
  },

  completeImplementation: async (id: number, notes: string) => {
    const response = await axiosInstance.post(`/changes/${id}/complete`, null, {
      params: { notes },
    });
    return response.data;
  },

  getTasks: async (id: number) => {
    const response = await axiosInstance.get(`/changes/${id}/tasks`);
    return response.data;
  },

  getActivities: async (id: number) => {
    const response = await axiosInstance.get(`/changes/${id}/activities`);
    return response.data;
  },

  getCalendar: async (days: number = 30) => {
    const response = await axiosInstance.get('/changes/calendar/upcoming', {
      params: { days },
    });
    return response.data;
  },
};