/**
 * Role-Based Access Control (RBAC) Utilities
 * Provides helpers for role detection and permission-based UI rendering
 */

import { User } from '@/types';

export type UserRole = 'admin' | 'manager' | 'team_lead' | 'agent' | 'end_user';

/**
 * Get user role from user object
 */
export function getUserRole(user: User | null | undefined): UserRole | null {
  if (!user) return null;

  // Check superuser first
  if (user.is_superuser) return 'admin';

  // Normalize role name (handle various naming conventions)
  const role = (user.role || '').toLowerCase().replace(/[\s_-]+/g, '_');

  // Check for admin variations
  if (role === 'admin' || role === 'system_administrator' || role === 'administrator') return 'admin';

  // Check for manager variations
  if (role === 'manager' || role === 'it_manager' || role === 'service_manager') return 'manager';

  // Check for team lead variations
  if (role === 'team_lead' || role === 'team_leader' || role === 'lead' || role === 'teamlead') return 'team_lead';

  // Check for agent variations
  if (role === 'agent' || role === 'support_agent' || role === 'technician' || role === 'analyst') return 'agent';

  // Check for end user variations
  if (role === 'end_user' || role === 'user' || role === 'employee' || role === 'customer' || role === 'enduser') return 'end_user';

  // Fallback: check role_id if role string didn't match
  // These IDs correspond to typical role table ordering (admin=1, manager=2, etc.)
  if (user.role_id) {
    // Common pattern: lower ID = higher privilege
    if (user.role_id === 1) return 'admin';
    if (user.role_id === 2) return 'manager';
    if (user.role_id === 3) return 'team_lead';
    if (user.role_id === 4) return 'agent';
    if (user.role_id === 5) return 'end_user';
  }

  return 'end_user';
}

/**
 * Check if user has a specific role
 */
export function hasRole(user: User | null | undefined, role: UserRole): boolean {
  const userRole = getUserRole(user);
  return userRole === role;
}

/**
 * Check if user has one of multiple roles
 */
export function hasAnyRole(user: User | null | undefined, roles: UserRole[]): boolean {
  const userRole = getUserRole(user);
  if (!userRole) return false;
  return roles.includes(userRole);
}

/**
 * Check if user is admin or superuser
 */
export function isAdmin(user: User | null | undefined): boolean {
  return user?.is_superuser === true || hasRole(user, 'admin');
}

/**
 * Check if user is manager or higher
 */
export function isManagerOrHigher(user: User | null | undefined): boolean {
  return hasAnyRole(user, ['admin', 'manager']);
}

/**
 * Check if user is team lead or higher
 */
export function isTeamLeadOrHigher(user: User | null | undefined): boolean {
  return hasAnyRole(user, ['admin', 'manager', 'team_lead']);
}

/**
 * Check if user is agent or higher (excludes end users)
 */
export function isAgentOrHigher(user: User | null | undefined): boolean {
  return hasAnyRole(user, ['admin', 'manager', 'team_lead', 'agent']);
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    admin: 'System Administrator',
    manager: 'Manager',
    team_lead: 'Team Lead',
    agent: 'Support Agent',
    end_user: 'End User',
  };
  return roleNames[role] || 'User';
}

/**
 * Get role color for badges/tags
 */
export function getRoleColor(role: UserRole): string {
  const roleColors: Record<UserRole, string> = {
    admin: 'bg-red-100 text-red-800',
    manager: 'bg-purple-100 text-purple-800',
    team_lead: 'bg-blue-100 text-blue-800',
    agent: 'bg-green-100 text-green-800',
    end_user: 'bg-gray-100 text-gray-800',
  };
  return roleColors[role] || 'bg-gray-100 text-gray-800';
}

/**
 * Navigation items that should be visible for each role
 */
export const roleNavigation = {
  admin: [
    'dashboard',
    'incidents',
    'service-requests',
    'changes',
    'problems',
    'assets',
    'knowledge',
    'reports',
    'users',
    'roles',
    'settings',
  ],
  manager: [
    'dashboard',
    'incidents',
    'service-requests',
    'changes',
    'problems',
    'assets',
    'knowledge',
    'reports',
    'users',
  ],
  team_lead: [
    'dashboard',
    'incidents',
    'service-requests',
    'changes',
    'problems',
    'assets',
    'knowledge',
    'reports',
  ],
  agent: [
    'dashboard',
    'incidents',
    'service-requests',
    'changes',
    'assets',
    'knowledge',
  ],
  end_user: [
    'dashboard',
    'incidents',
    'service-requests',
    'changes',
    'knowledge',
  ],
};

/**
 * Check if navigation item should be visible for user's role
 */
export function canAccessNavItem(user: User | null | undefined, navKey: string): boolean {
  const role = getUserRole(user);
  if (!role) return false;

  const allowedNav = roleNavigation[role] || [];
  return allowedNav.includes(navKey.toLowerCase());
}

/**
 * Dashboard views for each role
 */
export type DashboardView = 'admin' | 'manager' | 'agent' | 'user';

/**
 * Get appropriate dashboard view for user role
 */
export function getDashboardView(user: User | null | undefined): DashboardView {
  const role = getUserRole(user);

  if (role === 'admin') return 'admin';
  if (role === 'manager' || role === 'team_lead') return 'manager';
  if (role === 'agent') return 'agent';
  return 'user';
}
