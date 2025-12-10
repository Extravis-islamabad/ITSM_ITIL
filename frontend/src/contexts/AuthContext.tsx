import { createContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/services/authService';
import { User } from '@/types';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/utils/helpers';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const isAuthenticated = !!user && !!localStorage.getItem('access_token');

  useEffect(() => {
    // Check if user is logged in on mount
    const initAuth = async () => {
      const token = localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');

      if (token && refreshToken) {
        try {
          const currentUser = await authService.getCurrentUser();
          setUser(currentUser);
        } catch (error: any) {
          // Clear invalid tokens
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');

          // Only redirect to login if we're not already there
          if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/kb')) {
            navigate('/login');
          }
        }
      } else if (token || refreshToken) {
        // If we have only one token, clear both
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      }

      setIsLoading(false);
    };

    initAuth();
  }, [navigate]);

  const login = async (username: string, password: string) => {
    try {
      const response = await authService.login(username, password);
      
      // Store tokens
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token);
      
      // Set user from response
      setUser(response.user);
      
      toast.success('Welcome back!');
      navigate('/');
    } catch (error: any) {
      toast.error(getErrorMessage(error, 'Login failed'));
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    navigate('/login');
    toast.success('Logged out successfully');
  };

  const refreshAuth = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch {
      logout();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        logout,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}