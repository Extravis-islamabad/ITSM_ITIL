/**
 * Role-Protected Route Component
 * Restricts access to routes based on user roles
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  isAdmin,
  isManagerOrHigher,
  isTeamLeadOrHigher,
  isAgentOrHigher,
  getUserRole,
} from '@/utils/roleHelpers';

export type RequiredRole =
  | 'any'           // Any authenticated user
  | 'agent+'        // Agent or higher
  | 'teamlead+'     // Team Lead or higher
  | 'manager+'      // Manager or higher
  | 'admin';        // Admin only

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  requiredRole: RequiredRole;
  redirectTo?: string;
}

export default function RoleProtectedRoute({
  children,
  requiredRole,
  redirectTo = '/access-denied'
}: RoleProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();

  // Show loading spinner while auth state is being determined
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If authenticated but no user data (edge case - shouldn't happen with proper loading state)
  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }

  const userRole = getUserRole(user);

  // Check if user has required role
  let hasAccess = false;

  switch (requiredRole) {
    case 'any':
      hasAccess = !!userRole;
      break;
    case 'agent+':
      hasAccess = isAgentOrHigher(user);
      break;
    case 'teamlead+':
      hasAccess = isTeamLeadOrHigher(user);
      break;
    case 'manager+':
      hasAccess = isManagerOrHigher(user);
      break;
    case 'admin':
      hasAccess = isAdmin(user);
      break;
    default:
      hasAccess = false;
  }

  if (!hasAccess) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}

/**
 * Helper component for inline role checks
 */
interface RoleGateProps {
  children: React.ReactNode;
  requiredRole: RequiredRole;
  fallback?: React.ReactNode;
}

export function RoleGate({ children, requiredRole, fallback = null }: RoleGateProps) {
  const { user, isLoading } = useAuth();

  // While loading, show fallback to prevent flash of content
  if (isLoading || !user) {
    return <>{fallback}</>;
  }

  let hasAccess = false;

  switch (requiredRole) {
    case 'any':
      hasAccess = !!getUserRole(user);
      break;
    case 'agent+':
      hasAccess = isAgentOrHigher(user);
      break;
    case 'teamlead+':
      hasAccess = isTeamLeadOrHigher(user);
      break;
    case 'manager+':
      hasAccess = isManagerOrHigher(user);
      break;
    case 'admin':
      hasAccess = isAdmin(user);
      break;
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}
