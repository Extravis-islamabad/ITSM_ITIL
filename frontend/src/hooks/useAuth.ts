import { useAuthStore } from '@/store/authStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authService } from '@/services/authService';
import { useEffect, useCallback } from 'react';
import { User } from '@/types';

interface UseAuthReturn {
  user: User | null | undefined;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export const useAuth = (): UseAuthReturn => {
  const { user, isAuthenticated, isLoading: storeLoading, login, logout, setUser } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: currentUser, isLoading: queryLoading, isError, refetch } = useQuery({
    queryKey: ['currentUser'],
    queryFn: authService.getCurrentUser,
    enabled: isAuthenticated && !user,
    retry: false, // Don't retry on auth failures - axios interceptor handles token refresh
    staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
  });

  const refreshUser = useCallback(async () => {
    try {
      const updatedUser = await authService.getCurrentUser();
      setUser(updatedUser);
      queryClient.setQueryData(['currentUser'], updatedUser);
    } catch {
      // Silent fail
    }
  }, [setUser, queryClient]);

  useEffect(() => {
    if (currentUser) {
      setUser(currentUser);
    }
  }, [currentUser, setUser]);

  // If query failed (likely 401), the axios interceptor should have handled logout
  // But if we're still here with an error, clear auth state
  useEffect(() => {
    if (isError && isAuthenticated) {
      logout();
    }
  }, [isError, isAuthenticated, logout]);

  // Combined loading state:
  // - Store is loading (during login)
  // - Query is loading (fetching user data)
  // - Authenticated but no user yet (initial page load with token - need to wait for user data)
  const isLoading = storeLoading || queryLoading || (isAuthenticated && !user && !isError);

  return {
    user: user || currentUser,
    isAuthenticated: isAuthenticated && !isError,
    isLoading,
    login,
    logout,
    refreshUser,
  };
};