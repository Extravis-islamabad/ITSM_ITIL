import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roleService } from '@/services/roleService';
import { PlusIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { Card, CardBody } from '@/components/common/Card';
import Button from '@/components/common/Button';
import Badge from '@/components/common/Badge';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import RoleModal from './RoleModal';
import { Role } from '@/types';
import { formatDate } from '@/utils/helpers';
import toast from 'react-hot-toast';
import { usePermission } from '@/hooks/usePermission';

export default function RolesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  
  const queryClient = useQueryClient();
  const { canCreate, canUpdate, canDelete } = usePermission();

  const { data, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => roleService.getRoles({ page_size: 100 }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => roleService.deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Role deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || error.response?.data?.message || 'Failed to delete role');
    },
  });

  const handleEdit = (role: Role) => {
    setSelectedRole(role);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this role?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedRole(null);
  };

  const getRoleTypeColor = (type: string): 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'secondary' => {
    const colors: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'secondary'> = {
      admin: 'danger',
      manager: 'warning',
      team_lead: 'info',
      agent: 'success',
      end_user: 'secondary',
      cab_member: 'primary',
    };
    return colors[type] || 'secondary';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roles & Permissions</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage user roles and their permissions
          </p>
        </div>
        {canCreate('roles') && (
          <Button
            variant="primary"
            onClick={() => setIsModalOpen(true)}
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Role
          </Button>
        )}
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full">
            <LoadingSpinner />
          </div>
        ) : !data?.items || data.items.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon={<ShieldCheckIcon />}
              title="No roles found"
              description="Get started by creating a new role"
              action={
                canCreate('roles') && (
                  <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Add Role
                  </Button>
                )
              }
            />
          </div>
        ) : (
          data.items.map((role) => (
            <Card key={role.id} className="hover:shadow-lg transition-shadow">
              <CardBody>
                <div className="flex items-start justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <ShieldCheckIcon className="h-10 w-10 text-accent-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {role.display_name}
                      </h3>
                      <Badge variant={getRoleTypeColor(role.role_type)}>
                        {role.role_type.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                  {role.is_system && (
                    <Badge variant="secondary">System</Badge>
                  )}
                </div>

                <p className="mt-3 text-sm text-gray-500 line-clamp-2">
                  {role.description || 'No description provided'}
                </p>

                <div className="mt-4 flex items-center justify-between text-sm">
                  <div className="flex items-center text-gray-500">
                    <span className="font-medium">Level:</span>
                    <span className="ml-2">{role.level}</span>
                  </div>
                  <div className="flex items-center">
                    <Badge variant={role.is_active ? 'success' : 'secondary'}>
                      {role.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>

                <div className="mt-2 text-xs text-gray-500">
                  Created {formatDate(role.created_at, 'PP')}
                </div>

                {!role.is_system && (
                  <div className="mt-4 flex gap-2 pt-4 border-t border-gray-200">
                    {canUpdate('roles') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(role)}
                        className="flex-1"
                      >
                        Edit
                      </Button>
                    )}
                    {canDelete('roles') && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(role.id)}
                        className="flex-1"
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                )}
              </CardBody>
            </Card>
          ))
        )}
      </div>

      {/* Role Modal */}
      <RoleModal
        open={isModalOpen}
        onClose={handleModalClose}
        role={selectedRole}
      />
    </div>
  );
}