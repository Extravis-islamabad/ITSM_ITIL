import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { roleService, RoleCreateRequest } from '@/services/roleService';
import Modal from '@/components/common/Modal';
import Input from '@/components/common/Input';
import Select from '@/components/common/Select';
import Button from '@/components/common/Button';
import { Role } from '@/types';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/utils/helpers';

const roleSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  display_name: z.string().min(1, 'Display name is required'),
  description: z.string().optional(),
  role_type: z.string().min(1, 'Role type is required'),
  level: z.number().min(0).max(10),
});

type RoleFormData = z.infer<typeof roleSchema>;

interface RoleModalProps {
  open: boolean;
  onClose: () => void;
  role?: Role | null;
}

export default function RoleModal({ open, onClose, role }: RoleModalProps) {
  const queryClient = useQueryClient();
  const isEdit = !!role;
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);

  const { data: permissionsData } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => roleService.getAllPermissions(),
  });

  const { data: roleDetail } = useQuery({
    queryKey: ['role', role?.id],
    queryFn: () => roleService.getRole(role!.id),
    enabled: !!role?.id,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
  });

  useEffect(() => {
    if (role) {
      reset({
        name: role.name,
        display_name: role.display_name,
        description: role.description || '',
        role_type: role.role_type,
        level: role.level,
      });
    } else {
      reset({
        name: '',
        display_name: '',
        description: '',
        role_type: 'agent',
        level: 1,
      });
      setSelectedPermissions([]);
    }
  }, [role, reset]);

  useEffect(() => {
    if (roleDetail?.permissions) {
      setSelectedPermissions(roleDetail.permissions.map(p => p.id));
    }
  }, [roleDetail]);

  const createMutation = useMutation({
    mutationFn: (data: RoleCreateRequest) => roleService.createRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Role created successfully');
      onClose();
      reset();
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Failed to create role'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => roleService.updateRole(role!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Role updated successfully');
      onClose();
      reset();
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Failed to update role'));
    },
  });

  const onSubmit = (data: RoleFormData) => {
    const payload = {
      ...data,
      permission_ids: selectedPermissions,
    };

    if (isEdit) {
      const { name, ...updateData } = payload;
      updateMutation.mutate(updateData);
    } else {
      createMutation.mutate(payload);
    }
  };

  const togglePermission = (permissionId: number) => {
    setSelectedPermissions(prev =>
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const toggleAllPermissionsForModule = (module: string) => {
    const modulePermissions = permissionsData?.filter(p => p.module === module) || [];
    const modulePermissionIds = modulePermissions.map(p => p.id);
    const allSelected = modulePermissionIds.every(id => selectedPermissions.includes(id));

    if (allSelected) {
      setSelectedPermissions(prev => prev.filter(id => !modulePermissionIds.includes(id)));
    } else {
      setSelectedPermissions(prev => [...new Set([...prev, ...modulePermissionIds])]);
    }
  };

  const groupedPermissions = permissionsData?.reduce((acc, permission) => {
    if (!acc[permission.module]) {
      acc[permission.module] = [];
    }
    acc[permission.module].push(permission);
    return acc;
  }, {} as Record<string, typeof permissionsData>);

  const roleTypeOptions = [
    { value: 'end_user', label: 'End User' },
    { value: 'agent', label: 'Agent' },
    { value: 'team_lead', label: 'Team Lead' },
    { value: 'manager', label: 'Manager' },
    { value: 'cab_member', label: 'CAB Member' },
    { value: 'admin', label: 'Administrator' },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Role' : 'Create New Role'}
      size="2xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Role Name"
            error={errors.name?.message}
            {...register('name')}
            required
            disabled={isEdit}
            helperText={isEdit ? 'Role name cannot be changed' : 'Lowercase, no spaces (e.g., support_agent)'}
          />

          <Input
            label="Display Name"
            error={errors.display_name?.message}
            {...register('display_name')}
            required
          />

          <Select
            label="Role Type"
            options={roleTypeOptions}
            error={errors.role_type?.message}
            {...register('role_type')}
            required
          />

          <Input
            label="Level"
            type="number"
            error={errors.level?.message}
            {...register('level', { valueAsNumber: true })}
            helperText="Higher level = more authority (0-10)"
            required
          />
        </div>

        <div className="col-span-2">
          <label className="form-label">Description</label>
          <textarea
            className="form-input"
            rows={3}
            {...register('description')}
            placeholder="Describe the role and its responsibilities..."
          />
          {errors.description && (
            <p className="form-error">{errors.description.message}</p>
          )}
        </div>

        {/* Permissions */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Permissions</h4>
          <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
            {groupedPermissions && Object.entries(groupedPermissions).map(([module, permissions]) => (
              <div key={module} className="border-b border-gray-200 last:border-b-0">
                <div className="bg-gray-50 px-4 py-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900 capitalize">
                    {module}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleAllPermissionsForModule(module)}
                    className="text-xs text-accent-600 hover:text-accent-700"
                  >
                    {permissions.every(p => selectedPermissions.includes(p.id))
                      ? 'Deselect All'
                      : 'Select All'}
                  </button>
                </div>
                <div className="px-4 py-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {permissions.map((permission) => (
                    <label
                      key={permission.id}
                      className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPermissions.includes(permission.id)}
                        onChange={() => togglePermission(permission.id)}
                        className="h-4 w-4 text-accent-600 focus:ring-accent-500 border-gray-300 rounded"
                      />
                      <div className="flex-1">
                        <span className="text-sm text-gray-900">
                          {permission.display_name}
                        </span>
                        {permission.scope !== 'own' && (
                          <span className="ml-2 text-xs text-gray-500">
                            ({permission.scope})
                          </span>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-sm text-gray-500">
            {selectedPermissions.length} permission(s) selected
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={createMutation.isPending || updateMutation.isPending}
          >
            {isEdit ? 'Update Role' : 'Create Role'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}