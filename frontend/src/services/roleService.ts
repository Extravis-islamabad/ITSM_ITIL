import axiosInstance from '@/lib/axios';
import { Role, RoleDetail, PermissionDetail, PaginatedResponse, ApiResponse } from '@/types';

export interface RoleCreateRequest {
  name: string;
  display_name: string;
  description?: string;
  role_type: string;
  level?: number;
  permission_ids?: number[];
}

export interface RoleUpdateRequest {
  display_name?: string;
  description?: string;
  level?: number;
  is_active?: boolean;
  permission_ids?: number[];
}

export interface RoleFilters {
  role_type?: string;
  is_active?: boolean;
  page?: number;
  page_size?: number;
}

export const roleService = {
  getRoles: async (filters?: RoleFilters): Promise<PaginatedResponse<Role>> => {
    const response = await axiosInstance.get<PaginatedResponse<Role>>('/roles', {
      params: filters,
    });
    return response.data;
  },

  getRole: async (id: number): Promise<RoleDetail> => {
    const response = await axiosInstance.get<RoleDetail>(`/roles/${id}`);
    return response.data;
  },

  createRole: async (data: RoleCreateRequest): Promise<Role> => {
    const response = await axiosInstance.post<Role>('/roles', data);
    return response.data;
  },

  updateRole: async (id: number, data: RoleUpdateRequest): Promise<Role> => {
    const response = await axiosInstance.put<Role>(`/roles/${id}`, data);
    return response.data;
  },

  deleteRole: async (id: number): Promise<ApiResponse<null>> => {
    const response = await axiosInstance.delete<ApiResponse<null>>(`/roles/${id}`);
    return response.data;
  },

  getAllPermissions: async (): Promise<PermissionDetail[]> => {
    const response = await axiosInstance.get<PermissionDetail[]>('/roles/permissions');
    return response.data;
  },
};