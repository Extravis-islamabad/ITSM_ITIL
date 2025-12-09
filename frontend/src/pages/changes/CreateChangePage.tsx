import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { changeService } from '@/services/changeService';
import axiosInstance from '@/lib/axios';
import { Card, CardBody } from '@/components/common/Card';
import Input from '@/components/common/Input';
import Select from '@/components/common/Select';
import Button from '@/components/common/Button';
import toast from 'react-hot-toast';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';


const changeSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  change_type: z.enum(['STANDARD', 'NORMAL', 'EMERGENCY']),
  risk: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  impact: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  category_id: z.number().optional(),
  owner_id: z.number(),
  implementer_id: z.number().optional(),
  reason_for_change: z.string().min(20, 'Reason must be at least 20 characters'),
  implementation_plan: z.string().min(50, 'Implementation plan must be at least 50 characters'),
  rollback_plan: z.string().min(50, 'Rollback plan must be at least 50 characters'),
  testing_plan: z.string().optional(),
  business_justification: z.string().min(20, 'Business justification required'),
  affected_services: z.string().optional(),
  affected_users_count: z.number().min(0).default(0),
  planned_start: z.string().optional(),
  planned_end: z.string().optional(),
  requires_cab_approval: z.boolean().default(true),
  tasks: z.array(z.object({
    title: z.string(),
    description: z.string().optional(),
    sequence: z.number(),
    assigned_to_id: z.number().optional(),
  })).optional(),
});

type ChangeFormData = z.infer<typeof changeSchema>;

export default function CreateChangePage() {
  const navigate = useNavigate();

  const { data: categories } = useQuery({
  queryKey: ['categories', 'CHANGE'],
  queryFn: async () => {
    const res = await axiosInstance.get('/categories', {
      params: { category_type: 'CHANGE' }  // ✅ Filter for CHANGE categories
    });
    return res.data;
  },
});

  const { data: users } = useQuery({
    queryKey: ['users-active'],
    queryFn: async () => {
      const res = await axiosInstance.get('/users?is_active=true&page_size=100');
      return res.data.items;
    },
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<ChangeFormData>({
    resolver: zodResolver(changeSchema),
    defaultValues: {
      change_type: 'NORMAL',
      risk: 'MEDIUM',
      impact: 'MEDIUM',
      requires_cab_approval: true,
      affected_users_count: 0,
      tasks: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'tasks',
  });

  const changeType = watch('change_type');

  const createMutation = useMutation({
    mutationFn: changeService.createChange,
    onSuccess: (data) => {
      toast.success(`Change ${data.change_number} created successfully`);
      navigate(`/changes/${data.id}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to create change');
    },
  });

  const onSubmit = (data: ChangeFormData) => {
    createMutation.mutate(data);
  };

  const categoryOptions = categories?.map((cat: any) => ({
    value: cat.id,
    label: cat.name,
  })) || [];

  const userOptions = users?.map((user: any) => ({
    value: user.id,
    label: user.full_name,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => navigate('/changes')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Change Request</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create a new change request for review and approval
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardBody>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
            
            <div className="space-y-4">
              <Input
                label="Title"
                error={errors.title?.message}
                {...register('title')}
                placeholder="Brief description of the change"
                required
              />

              <div>
                <label className="form-label">Description</label>
                <textarea
                  className={`form-input ${errors.description ? 'form-input-error' : ''}`}
                  rows={4}
                  {...register('description')}
                  placeholder="Detailed description of what will change..."
                  required
                />
                {errors.description && (
                  <p className="form-error">{errors.description.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select
                  label="Change Type"
                  options={[
                    { value: 'STANDARD', label: 'Standard' },
                    { value: 'NORMAL', label: 'Normal' },
                    { value: 'EMERGENCY', label: 'Emergency' },
                  ]}
                  {...register('change_type')}
                  required
                />

                <Select
                  label="Risk Level"
                  options={[
                    { value: 'LOW', label: 'Low' },
                    { value: 'MEDIUM', label: 'Medium' },
                    { value: 'HIGH', label: 'High' },
                    { value: 'CRITICAL', label: 'Critical' },
                  ]}
                  {...register('risk')}
                  required
                />

                <Select
                  label="Impact"
                  options={[
                    { value: 'LOW', label: 'Low' },
                    { value: 'MEDIUM', label: 'Medium' },
                    { value: 'HIGH', label: 'High' },
                  ]}
                  {...register('impact')}
                  required
                />
              </div>

              <Select
                label="Category"
                options={categoryOptions}
                {...register('category_id', { valueAsNumber: true })}
                placeholder="Select a category"
              />
            </div>
          </CardBody>
        </Card>

        {/* Assignment */}
        <Card>
          <CardBody>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Assignment</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Change Owner"
                options={userOptions}
                {...register('owner_id', { valueAsNumber: true })}
                placeholder="Select owner"
                required
              />

              <Select
                label="Implementer"
                options={userOptions}
                {...register('implementer_id', { valueAsNumber: true })}
                placeholder="Select implementer"
              />
            </div>
          </CardBody>
        </Card>

        {/* Justification */}
        <Card>
          <CardBody>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Justification</h3>
            
            <div className="space-y-4">
              <div>
                <label className="form-label">Reason for Change</label>
                <textarea
                  className={`form-input ${errors.reason_for_change ? 'form-input-error' : ''}`}
                  rows={3}
                  {...register('reason_for_change')}
                  placeholder="Why is this change necessary?"
                  required
                />
                {errors.reason_for_change && (
                  <p className="form-error">{errors.reason_for_change.message}</p>
                )}
              </div>

              <div>
                <label className="form-label">Business Justification</label>
                <textarea
                  className={`form-input ${errors.business_justification ? 'form-input-error' : ''}`}
                  rows={3}
                  {...register('business_justification')}
                  placeholder="What business value does this change provide?"
                  required
                />
                {errors.business_justification && (
                  <p className="form-error">{errors.business_justification.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Affected Services"
                  {...register('affected_services')}
                  placeholder="e.g., Email, File Server"
                />

                <Input
                  label="Affected Users Count"
                  type="number"
                  {...register('affected_users_count', { valueAsNumber: true })}
                  placeholder="0"
                />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Implementation Plan */}
        <Card>
          <CardBody>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Implementation Details</h3>
            
            <div className="space-y-4">
              <div>
                <label className="form-label">Implementation Plan</label>
                <textarea
                  className={`form-input ${errors.implementation_plan ? 'form-input-error' : ''}`}
                  rows={5}
                  {...register('implementation_plan')}
                  placeholder="Step-by-step plan for implementing this change..."
                  required
                />
                {errors.implementation_plan && (
                  <p className="form-error">{errors.implementation_plan.message}</p>
                )}
              </div>

              <div>
                <label className="form-label">Rollback Plan</label>
                <textarea
                  className={`form-input ${errors.rollback_plan ? 'form-input-error' : ''}`}
                  rows={5}
                  {...register('rollback_plan')}
                  placeholder="How to revert if something goes wrong..."
                  required
                />
                {errors.rollback_plan && (
                  <p className="form-error">{errors.rollback_plan.message}</p>
                )}
              </div>

              <div>
                <label className="form-label">Testing Plan</label>
                <textarea
                  className={`form-input ${errors.testing_plan ? 'form-input-error' : ''}`}
                  rows={4}
                  {...register('testing_plan')}
                  placeholder="How will you verify the change is successful?"
                />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Schedule */}
        <Card>
          <CardBody>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Schedule</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Planned Start</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  {...register('planned_start')}
                />
              </div>

              <div>
                <label className="form-label">Planned End</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  {...register('planned_end')}
                />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Implementation Tasks */}
        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Implementation Tasks</h3>
              <Button
                type="button"
                variant="outline"
                onClick={() => append({ title: '', description: '', sequence: fields.length + 1 })}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </div>

            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-4 items-start p-4 border border-gray-200 rounded-lg">
                  <div className="flex-1 space-y-3">
                    <Input
                      label={`Task ${index + 1} Title`}
                      {...register(`tasks.${index}.title`)}
                      placeholder="Task title"
                    />
                    <Input
                      label="Description"
                      {...register(`tasks.${index}.description`)}
                      placeholder="Task description"
                    />
                    <Select
                      label="Assign To"
                      options={userOptions}
                      {...register(`tasks.${index}.assigned_to_id`, { valueAsNumber: true })}
                      placeholder="Select assignee"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => remove(index)}
                    className="mt-8"
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              ))}

              {fields.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No tasks added. Click "Add Task" to create implementation tasks.
                </p>
              )}
            </div>
          </CardBody>
        </Card>

        {/* CAB Approval */}
        <Card>
          <CardBody>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                {...register('requires_cab_approval')}
                className="h-4 w-4 text-primary-600 rounded"
              />
              <label className="text-sm font-medium text-gray-700">
                This change requires CAB (Change Advisory Board) approval
              </label>
            </div>
            {changeType === 'EMERGENCY' && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  <strong>Note:</strong> Emergency changes require expedited CAB approval and post-implementation review.
                </p>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/changes')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={createMutation.isPending}
            disabled={createMutation.isPending}
            className="bg-gradient-to-r from-primary-600 to-accent-600"
          >
            Create Change Request
          </Button>
        </div>
      </form>
    </div>
  );
}