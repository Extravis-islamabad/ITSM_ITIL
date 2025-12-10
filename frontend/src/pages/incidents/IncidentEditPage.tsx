import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ticketService, TicketUpdateRequest } from '@/services/ticketService';
import { categoryService } from '@/services/categoryService';
import { slaPolicyService } from '@/services/slaPolicyService';
import { assetService } from '@/services/assetService';
import { Card, CardBody } from '@/components/common/Card';
import Input from '@/components/common/Input';
import Select from '@/components/common/Select';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { isAgentOrHigher } from '@/utils/roleHelpers';
import { getErrorMessage } from '@/utils/helpers';

const ticketSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category_id: z.number().optional(),
  subcategory_id: z.number().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  impact: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  urgency: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  sla_policy_id: z.number().optional(),
  asset_ids: z.array(z.number()).optional(),
});

type TicketFormData = z.infer<typeof ticketSchema>;

export default function IncidentEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Redirect if user doesn't have agent access
  useEffect(() => {
    if (user && !isAgentOrHigher(user)) {
      toast.error('You do not have permission to edit tickets');
      navigate(`/incidents/${id}`);
    }
  }, [user, id, navigate]);

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => ticketService.getTicket(Number(id)),
    enabled: !!id,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getCategories(),
  });

  const { data: slaPolicies } = useQuery({
    queryKey: ['sla-policies'],
    queryFn: () => slaPolicyService.getSLAPolicies(true),
  });

  useQuery({
    queryKey: ['assets-for-ticket'],
    queryFn: () => assetService.getAssets({ page: 1, page_size: 500, status: 'ACTIVE' }),
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<TicketFormData>({
    resolver: zodResolver(ticketSchema),
  });

  const categoryId = watch('category_id');

  // Reset form when ticket data loads
  useEffect(() => {
    if (ticket) {
      reset({
        title: ticket.title,
        description: ticket.description,
        category_id: ticket.category_id || undefined,
        subcategory_id: ticket.subcategory_id || undefined,
        priority: ticket.priority as any,
        impact: ticket.impact as any,
        urgency: ticket.urgency as any,
        sla_policy_id: ticket.sla_policy_id || undefined,
        asset_ids: ticket.linked_assets?.map((a: any) => a.asset_id) || [],
      });
    }
  }, [ticket, reset]);

  useEffect(() => {
    if (categoryId) {
      setValue('subcategory_id', undefined);
    }
  }, [categoryId, setValue]);

  const updateMutation = useMutation({
    mutationFn: (data: TicketUpdateRequest) => ticketService.updateTicket(Number(id), data),
    onSuccess: (data) => {
      toast.success(`Incident ${data.ticket_number} updated successfully`);
      navigate(`/incidents/${id}`);
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Failed to update incident'));
    },
  });

  const onSubmit = (data: TicketFormData) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Ticket not found</p>
      </div>
    );
  }

  // Get selected category and its subcategories
  const selectedCategory = categories?.find((c: any) => c.id === categoryId);
  const subcategories = selectedCategory?.subcategories || [];

  const categoryOptions = categories?.map((cat: any) => ({
    value: cat.id,
    label: cat.name,
  })) || [];

  const subcategoryOptions = subcategories.map((sub: any) => ({
    value: sub.id,
    label: sub.name,
  }));

  const slaPolicyOptions = slaPolicies?.map((policy: any) => ({
    value: policy.id,
    label: `${policy.name}${policy.is_default ? ' (Default)' : ''}`,
  })) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate(`/incidents/${id}`)}>
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Incident</h1>
            <p className="text-sm text-gray-500 mt-1">{ticket.ticket_number}</p>
          </div>
        </div>
      </div>

      <Card>
        <CardBody>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Input
              label="Title"
              error={errors.title?.message}
              {...register('title')}
              placeholder="Brief description of the incident"
              required
            />

            <div>
              <label className="form-label">Description</label>
              <textarea
                className={`form-input ${errors.description ? 'form-input-error' : ''}`}
                rows={6}
                {...register('description')}
                placeholder="Detailed description of the incident..."
                required
              />
              {errors.description && (
                <p className="form-error">{errors.description.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label="Category"
                options={categoryOptions}
                placeholder="Select a category"
                {...register('category_id', { valueAsNumber: true })}
              />

              <Select
                label="Subcategory"
                options={subcategoryOptions}
                placeholder="Select a subcategory"
                {...register('subcategory_id', { valueAsNumber: true })}
                disabled={!categoryId || subcategoryOptions.length === 0}
              />
            </div>

            <Select
              label="SLA Policy"
              options={slaPolicyOptions}
              placeholder="Select SLA policy (optional)"
              {...register('sla_policy_id', { valueAsNumber: true })}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Select
                label="Priority"
                options={[
                  { value: 'LOW', label: 'Low' },
                  { value: 'MEDIUM', label: 'Medium' },
                  { value: 'HIGH', label: 'High' },
                  { value: 'CRITICAL', label: 'Critical' },
                ]}
                {...register('priority')}
              />

              <Select
                label="Impact"
                options={[
                  { value: 'LOW', label: 'Low' },
                  { value: 'MEDIUM', label: 'Medium' },
                  { value: 'HIGH', label: 'High' },
                ]}
                {...register('impact')}
              />

              <Select
                label="Urgency"
                options={[
                  { value: 'LOW', label: 'Low' },
                  { value: 'MEDIUM', label: 'Medium' },
                  { value: 'HIGH', label: 'High' },
                ]}
                {...register('urgency')}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Priority is automatically calculated based on Impact and Urgency.
                High Impact + High Urgency = Critical Priority.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => navigate(`/incidents/${id}`)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={updateMutation.isPending}
                disabled={updateMutation.isPending || !isDirty}
              >
                Save Changes
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
