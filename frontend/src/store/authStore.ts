import { create } from 'zustand';
import { authService } from '@/services/authService';
import { User } from '@/types';
import toast from 'react-hot-toast';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem('access_token'),
  isLoading: false,

  login: async (username: string, password: string) => {
    try {
      set({ isLoading: true });

      const response = await authService.login(username, password);

      // Store tokens FIRST
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token);

      // Then set user and auth state together
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });

      // Small delay to ensure state is propagated before navigation
      await new Promise(resolve => setTimeout(resolve, 100));

      toast.success('Welcome back!');
    } catch (error: any) {
      set({ isLoading: false });

      // Extract error message properly
      let message = 'Login failed';
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        // Handle both string and array of validation errors
        if (typeof detail === 'string') {
          message = detail;
        } else if (Array.isArray(detail)) {
          message = detail.map((err: any) => err.msg || JSON.stringify(err)).join(', ');
        }
      }

      toast.error(message);
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    set({
      user: null,
      isAuthenticated: false,
    });
    toast.success('Logged out successfully');
  },

  checkAuth: async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      set({ isAuthenticated: false, user: null });
      return;
    }

    try {
      const user = await authService.getCurrentUser();
      set({ user, isAuthenticated: true });
    } catch (error) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      set({ user: null, isAuthenticated: false });
    }
  },

  setUser: (user: User) => {
    set({ user, isAuthenticated: true });
  },
}));