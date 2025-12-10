import { useAuthStore } from '@/store/authStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authService } from '@/services/authService';
import { useEffect, useCallback, useRef } from 'react';
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
  const hasLoggedOutRef = useRef(false);

  // Only fetch user data if we have a token but no user data yet
  // Skip if user is already loaded (e.g., from login response)
  const shouldFetchUser = isAuthenticated && !user && !!localStorage.getItem('access_token');

  const { data: currentUser, isLoading: queryLoading, isError, error } = useQuery({
    queryKey: ['currentUser'],
    queryFn: authService.getCurrentUser,
    enabled: shouldFetchUser,
    retry: 1, // Retry once in case of transient network issues
    retryDelay: 1000,
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

  // If query failed with 401 and axios interceptor couldn't refresh the token,
  // the interceptor will handle the redirect. Only logout here if we get a 401
  // and haven't already logged out to prevent loops.
  useEffect(() => {
    if (isError && isAuthenticated && !hasLoggedOutRef.current) {
      // Check if it's actually a 401 error (session truly expired)
      const is401 = (error as any)?.response?.status === 401;
      if (is401) {
        hasLoggedOutRef.current = true;
        logout();
      }
    }
  }, [isError, isAuthenticated, logout, error]);

  // Reset the logout ref when user logs in again
  useEffect(() => {
    if (isAuthenticated && user) {
      hasLoggedOutRef.current = false;
    }
  }, [isAuthenticated, user]);

  // Combined loading state:
  // - Store is loading (during login)
  // - Query is loading (fetching user data) - only if we actually need to fetch
  const isLoading = storeLoading || (queryLoading && shouldFetchUser);

  return {
    user: user || currentUser,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshUser,
  };
};