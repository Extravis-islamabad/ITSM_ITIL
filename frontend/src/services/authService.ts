import axios from 'axios';
import axiosInstance from '@/lib/axios';
import { User } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface RefreshResponse {
  access_token: string;
  token_type: string;
}

export const authService = {
  // Login uses raw axios to avoid interceptor issues during authentication
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const response = await axios.post<LoginResponse>(`${API_URL}/auth/login`, {
      username,
      password,
    });
    return response.data;
  },

  logout: async (): Promise<void> => {
    try {
      await axiosInstance.post('/auth/logout');
    } catch {
      // Silent fail - user is logging out anyway
    }
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await axiosInstance.get<User>('/auth/me');
    return response.data;
  },

  // Refresh uses raw axios to avoid infinite loop in interceptor
  refreshToken: async (refreshToken: string): Promise<RefreshResponse> => {
    const response = await axios.post<RefreshResponse>(`${API_URL}/auth/refresh`, {
      refresh_token: refreshToken,
    });
    return response.data;
  },

  changePassword: async (oldPassword: string, newPassword: string): Promise<void> => {
    await axiosInstance.post('/auth/change-password', {
      old_password: oldPassword,
      new_password: newPassword,
    });
  },

  uploadAvatar: async (file: File): Promise<{ message: string; avatar_url: string }> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axiosInstance.post<{ message: string; avatar_url: string }>(
      '/auth/me/avatar',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  deleteAvatar: async (): Promise<{ message: string }> => {
    const response = await axiosInstance.delete<{ message: string }>('/auth/me/avatar');
    return response.data;
  },
};