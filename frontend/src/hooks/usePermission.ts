import { useAuth } from './useAuth';
import { hasPermission as checkPermission } from '@/utils/helpers';

export const usePermission = () => {
  const { user } = useAuth();

  const hasPermission = (module: string, action: string): boolean => {
    if (!user) return false;
    if (user.is_superuser) return true;
    return checkPermission(user.permissions, module, action);
  };

  const canCreate = (module: string) => hasPermission(module, 'create');
  const canRead = (module: string) => hasPermission(module, 'read');
  const canUpdate = (module: string) => hasPermission(module, 'update');
  const canDelete = (module: string) => hasPermission(module, 'delete');
  const canApprove = (module: string) => hasPermission(module, 'approve');

  return {
    hasPermission,
    canCreate,
    canRead,
    canUpdate,
    canDelete,
    canApprove,
  };
};