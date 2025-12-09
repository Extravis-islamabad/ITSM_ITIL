import axiosInstance from '@/lib/axios';

export interface SLAPolicy {
  id: number;
  name: string;
  description?: string;
  response_time: number;
  resolution_time: number;
  priority_times?: Record<string, any>;
  business_hours_only: boolean;
  conditions?: Record<string, any>;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at?: string;
}

export interface SLAPolicyCreateRequest {
  name: string;
  description?: string;
  response_time: number;
  resolution_time: number;
  priority_times?: Record<string, any>;
  business_hours_only?: boolean;
  conditions?: Record<string, any>;
  is_active?: boolean;
  is_default?: boolean;
}

export interface SLAPolicyUpdateRequest {
  name?: string;
  description?: string;
  response_time?: number;
  resolution_time?: number;
  priority_times?: Record<string, any>;
  business_hours_only?: boolean;
  conditions?: Record<string, any>;
  is_active?: boolean;
  is_default?: boolean;
}

export const slaPolicyService = {
  getSLAPolicies: async (isActive?: boolean): Promise<SLAPolicy[]> => {
    const response = await axiosInstance.get<SLAPolicy[]>('/sla-policies', {
      params: { is_active: isActive },
    });
    return response.data;
  },

  getSLAPolicy: async (id: number): Promise<SLAPolicy> => {
    const response = await axiosInstance.get<SLAPolicy>(`/sla-policies/${id}`);
    return response.data;
  },

  getDefaultSLAPolicy: async (): Promise<SLAPolicy> => {
    const response = await axiosInstance.get<SLAPolicy>('/sla-policies/default/policy');
    return response.data;
  },

  createSLAPolicy: async (data: SLAPolicyCreateRequest): Promise<SLAPolicy> => {
    const response = await axiosInstance.post<SLAPolicy>('/sla-policies', data);
    return response.data;
  },

  updateSLAPolicy: async (id: number, data: SLAPolicyUpdateRequest): Promise<SLAPolicy> => {
    const response = await axiosInstance.put<SLAPolicy>(`/sla-policies/${id}`, data);
    return response.data;
  },

  deleteSLAPolicy: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/sla-policies/${id}`);
  },
};
