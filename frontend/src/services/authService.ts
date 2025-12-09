import axios from 'axios';
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
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const response = await axios.post<LoginResponse>(`${API_URL}/auth/login`, {
      username,
      password,
    });
    return response.data;
  },

  logout: async (): Promise<void> => {
    const token = localStorage.getItem('access_token');
    if (token) {
      await axios.post(`${API_URL}/auth/logout`, null, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }
  },

  getCurrentUser: async (): Promise<User> => {
    const token = localStorage.getItem('access_token');
    const response = await axios.get<User>(`${API_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  refreshToken: async (refreshToken: string): Promise<RefreshResponse> => {
    const response = await axios.post<RefreshResponse>(`${API_URL}/auth/refresh`, {
      refresh_token: refreshToken,
    });
    return response.data;
  },

  changePassword: async (oldPassword: string, newPassword: string): Promise<void> => {
    const token = localStorage.getItem('access_token');
    await axios.post(
      `${API_URL}/auth/change-password`,
      {
        old_password: oldPassword,
        new_password: newPassword,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  },

  uploadAvatar: async (file: File): Promise<{ message: string; avatar_url: string }> => {
    const token = localStorage.getItem('access_token');
    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.post<{ message: string; avatar_url: string }>(
      `${API_URL}/auth/me/avatar`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  deleteAvatar: async (): Promise<{ message: string }> => {
    const token = localStorage.getItem('access_token');
    const response = await axios.delete<{ message: string }>(
      `${API_URL}/auth/me/avatar`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },
};