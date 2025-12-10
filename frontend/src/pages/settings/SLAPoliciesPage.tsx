import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { slaPolicyService, SLAPolicy, SLAPolicyCreateRequest } from '@/services/slaPolicyService';
import { Card, CardBody } from '@/components/common/Card';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal';
import Input from '@/components/common/Input';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import { PlusIcon, PencilIcon, TrashIcon, ClockIcon, CheckIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { getErrorMessage } from '@/utils/helpers';

interface SLAPolicyFormData {
  name: string;
  description?: string;
  response_time: number;
  resolution_time: number;
  business_hours_only: boolean;
  is_active: boolean;
  is_default: boolean;
}

export default function SLAPoliciesPage() {
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<SLAPolicy | null>(null);

  const { data: policies, isLoading } = useQuery({
    queryKey: ['sla-policies'],
    queryFn: () => slaPolicyService.getSLAPolicies(),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SLAPolicyFormData>({
    defaultValues: {
      business_hours_only: true,
      is_active: true,
      is_default: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: SLAPolicyCreateRequest) => slaPolicyService.createSLAPolicy(data),
    onSuccess: () => {
      toast.success('SLA policy created successfully');
      setIsCreateModalOpen(false);
      reset();
      queryClient.invalidateQueries({ queryKey: ['sla-policies'] });
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Failed to create SLA policy'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: SLAPolicyCreateRequest }) =>
      slaPolicyService.updateSLAPolicy(id, data),
    onSuccess: () => {
      toast.success('SLA policy updated successfully');
      setEditingPolicy(null);
      reset();
      queryClient.invalidateQueries({ queryKey: ['sla-policies'] });
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Failed to update SLA policy'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => slaPolicyService.deleteSLAPolicy(id),
    onSuccess: () => {
      toast.success('SLA policy deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['sla-policies'] });
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Failed to delete SLA policy'));
    },
  });

  const handleEdit = (policy: SLAPolicy) => {
    setEditingPolicy(policy);
    reset({
      name: policy.name,
      description: policy.description,
      response_time: policy.response_time,
      resolution_time: policy.resolution_time,
      business_hours_only: policy.business_hours_only,
      is_active: policy.is_active,
      is_default: policy.is_default,
    });
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this SLA policy?')) {
      deleteMutation.mutate(id);
    }
  };

  const onSubmit = (data: SLAPolicyFormData) => {
    if (editingPolicy) {
      updateMutation.mutate({ id: editingPolicy.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} minutes`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours < 24) return `${hours}h ${mins}m`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SLA Policies</h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure service level agreement policies for tickets
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
          <PlusIcon className="h-5 w-5 mr-2" />
          Create SLA Policy
        </Button>
      </div>

      <Card>
        <CardBody>
          {isLoading ? (
            <LoadingSpinner />
          ) : !policies || policies.length === 0 ? (
            <EmptyState
              icon={<ClockIcon />}
              title="No SLA policies found"
              description="Get started by creating your first SLA policy"
              action={
                <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Create SLA Policy
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {policies.map((policy) => (
                <div
                  key={policy.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-accent-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        {policy.name}
                        {policy.is_default && (
                          <span className="badge bg-blue-100 text-blue-800 text-xs">
                            Default
                          </span>
                        )}
                      </h3>
                      {policy.description && (
                        <p className="text-sm text-gray-500 mt-1">{policy.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {policy.is_active ? (
                        <span className="badge bg-green-100 text-green-800 text-xs">
                          Active
                        </span>
                      ) : (
                        <span className="badge bg-gray-100 text-gray-800 text-xs">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Response Time:</span>
                      <span className="font-medium text-gray-900">
                        {formatTime(policy.response_time)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Resolution Time:</span>
                      <span className="font-medium text-gray-900">
                        {formatTime(policy.resolution_time)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Business Hours Only:</span>
                      <span className="font-medium text-gray-900">
                        {policy.business_hours_only ? (
                          <CheckIcon className="h-4 w-4 text-green-600" />
                        ) : (
                          <span className="text-gray-400">No</span>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-3 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(policy)}
                      className="flex-1"
                    >
                      <PencilIcon className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(policy.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Modal
        open={isCreateModalOpen || editingPolicy !== null}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingPolicy(null);
          reset();
        }}
        title={editingPolicy ? 'Edit SLA Policy' : 'Create SLA Policy'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Name"
            {...register('name', { required: 'Name is required' })}
            error={errors.name?.message}
            placeholder="e.g., High Priority SLA"
            required
          />

          <div>
            <label className="form-label">Description</label>
            <textarea
              className="form-input"
              rows={3}
              {...register('description')}
              placeholder="Optional description..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Response Time (minutes)</label>
              <Input
                type="number"
                {...register('response_time', {
                  required: 'Response time is required',
                  valueAsNumber: true,
                  min: { value: 1, message: 'Must be at least 1 minute' },
                })}
                error={errors.response_time?.message}
                placeholder="e.g., 60"
                required
              />
            </div>

            <div>
              <label className="form-label">Resolution Time (minutes)</label>
              <Input
                type="number"
                {...register('resolution_time', {
                  required: 'Resolution time is required',
                  valueAsNumber: true,
                  min: { value: 1, message: 'Must be at least 1 minute' },
                })}
                error={errors.resolution_time?.message}
                placeholder="e.g., 480"
                required
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                {...register('business_hours_only')}
                className="form-checkbox h-4 w-4 text-accent-600 rounded border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700">Business hours only</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                {...register('is_active')}
                className="form-checkbox h-4 w-4 text-accent-600 rounded border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700">Active</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                {...register('is_default')}
                className="form-checkbox h-4 w-4 text-accent-600 rounded border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700">
                Set as default policy
              </span>
            </label>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Times are in minutes. For example, 480 minutes = 8 hours.
              If "Business hours only" is enabled, SLA calculations will only count business hours.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsCreateModalOpen(false);
                setEditingPolicy(null);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={createMutation.isPending || updateMutation.isPending}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingPolicy ? 'Update Policy' : 'Create Policy'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
