import axiosInstance from '@/lib/axios';

export interface UserFilters {
  page?: number;
  page_size?: number;
  search?: string;
  department_id?: number;
  role_id?: number;
  is_active?: boolean;
}

export const userService = {
  getUsers: async (filters: UserFilters = {}) => {
    const params = new URLSearchParams();
    
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.page_size) params.append('page_size', filters.page_size.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.department_id) params.append('department_id', filters.department_id.toString());
    if (filters.role_id) params.append('role_id', filters.role_id.toString());
    if (filters.is_active !== undefined) params.append('is_active', filters.is_active.toString());
    
    const response = await axiosInstance.get(`/users?${params.toString()}`);
    return response.data;
  },

  createUser: async (userData: any) => {
    const response = await axiosInstance.post('/users', userData);
    return response.data;
  },

  updateUser: async (id: number, userData: any) => {
    const response = await axiosInstance.put(`/users/${id}`, userData);
    return response.data;
  },

  deleteUser: async (id: number) => {
    const response = await axiosInstance.delete(`/users/${id}`);
    return response.data;
  },

  getUser: async (id: number) => {
    const response = await axiosInstance.get(`/users/${id}`);
    return response.data;
  },
};