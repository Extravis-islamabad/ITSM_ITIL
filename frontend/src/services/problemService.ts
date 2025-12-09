import axiosInstance from '@/lib/axios';
import { ProblemCreate, ProblemUpdate } from '@/types/problem';

export const problemService = {
  // Problems
  async getProblems(params?: {
    page?: number;
    page_size?: number;
    status?: string;
    priority?: string;
    assigned_to_id?: number;
    assigned_group_id?: number;
    search?: string;
    sort_by?: string;
    sort_order?: string;
  }) {
    const response = await axiosInstance.get('/problems', { params });
    return response.data;
  },

  async getProblem(id: number) {
    const response = await axiosInstance.get(`/problems/${id}`);
    return response.data;
  },

  async createProblem(data: ProblemCreate) {
    const response = await axiosInstance.post('/problems', data);
    return response.data;
  },

  async updateProblem(id: number, data: ProblemUpdate) {
    const response = await axiosInstance.put(`/problems/${id}`, data);
    return response.data;
  },

  async deleteProblem(id: number) {
    const response = await axiosInstance.delete(`/problems/${id}`);
    return response.data;
  },

  async updateStatus(id: number, status: string) {
    const response = await axiosInstance.post(`/problems/${id}/status`, null, {
      params: { new_status: status }
    });
    return response.data;
  },

  async updateRCA(id: number, data: {
    rca_method: string;
    root_cause: string;
    investigation_notes?: string;
  }) {
    const response = await axiosInstance.post(`/problems/${id}/rca`, data);
    return response.data;
  },

  async updateWorkaround(id: number, data: {
    workaround_description: string;
    workaround_steps?: string;
  }) {
    const response = await axiosInstance.post(`/problems/${id}/workaround`, data);
    return response.data;
  },

  async updateSolution(id: number, data: {
    permanent_solution_description: string;
    solution_implementation_plan?: string;
  }) {
    const response = await axiosInstance.post(`/problems/${id}/solution`, data);
    return response.data;
  },

  async assignProblem(id: number, data: {
    assigned_to_id?: number;
    assigned_group_id?: number;
  }) {
    const response = await axiosInstance.post(`/problems/${id}/assign`, null, {
      params: data
    });
    return response.data;
  },

  async linkIncident(id: number, data: {
    ticket_id: number;
    link_reason?: string;
  }) {
    const response = await axiosInstance.post(`/problems/${id}/incidents`, data);
    return response.data;
  },

  async addComment(id: number, data: {
    comment: string;
    is_internal: boolean;
  }) {
    const response = await axiosInstance.post(`/problems/${id}/comments`, data);
    return response.data;
  },

  // Known Errors
  async getKnownErrors(params?: {
    page?: number;
    page_size?: number;
    search?: string;
    is_active?: boolean;
  }) {
    const response = await axiosInstance.get('/problems/known-errors', { params });
    return response.data;
  },

  async getKnownError(id: number) {
    const response = await axiosInstance.get(`/problems/known-errors/${id}`);
    return response.data;
  },

  async createKnownError(data: any) {
    const response = await axiosInstance.post('/problems/known-errors', data);
    return response.data;
  },

  async updateKnownError(id: number, data: any) {
    const response = await axiosInstance.put(`/problems/known-errors/${id}`, data);
    return response.data;
  },

  async markKnownErrorHelpful(id: number) {
    const response = await axiosInstance.post(`/problems/known-errors/${id}/helpful`);
    return response.data;
  },
};
