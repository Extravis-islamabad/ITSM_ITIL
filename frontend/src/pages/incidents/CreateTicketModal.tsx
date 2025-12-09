import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ticketService, TicketCreateRequest } from '@/services/ticketService';
import { categoryService } from '@/services/categoryService';
import { slaPolicyService } from '@/services/slaPolicyService';
import { assetService } from '@/services/assetService';
import Modal from '@/components/common/Modal';
import Input from '@/components/common/Input';
import Select from '@/components/common/Select';
import Button from '@/components/common/Button';
import toast from 'react-hot-toast';
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

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

interface CreateTicketModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateTicketModal({ open, onClose, onSuccess }: CreateTicketModalProps) {
  const [selectedAssets, setSelectedAssets] = useState<number[]>([]);
  const [assetSearch, setAssetSearch] = useState('');

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getCategories(),
    enabled: open,
  });

  const { data: slaPolicies } = useQuery({
    queryKey: ['sla-policies'],
    queryFn: () => slaPolicyService.getSLAPolicies(true),
    enabled: open,
  });

  const { data: assetsData } = useQuery({
    queryKey: ['assets-for-ticket'],
    queryFn: () => assetService.getAssets({ page: 1, page_size: 500, status: 'ACTIVE' }),
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TicketFormData>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      priority: 'MEDIUM',
      impact: 'MEDIUM',
      urgency: 'MEDIUM',
      asset_ids: [],
    },
  });

  const categoryId = watch('category_id');

  useEffect(() => {
    if (categoryId) {
      setValue('subcategory_id', undefined);
    }
  }, [categoryId, setValue]);

  // Reset selected assets when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedAssets([]);
      setAssetSearch('');
    }
  }, [open]);

  const toggleAsset = (assetId: number) => {
    setSelectedAssets(prev => {
      const newSelection = prev.includes(assetId)
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId];
      setValue('asset_ids', newSelection);
      return newSelection;
    });
  };

  const removeAsset = (assetId: number) => {
    setSelectedAssets(prev => {
      const newSelection = prev.filter(id => id !== assetId);
      setValue('asset_ids', newSelection);
      return newSelection;
    });
  };

  const createMutation = useMutation({
    mutationFn: (data: TicketCreateRequest) => ticketService.createTicket(data),
    onSuccess: (data) => {
      toast.success(`Incident ${data.ticket_number} created successfully`);
      reset();
      setSelectedAssets([]);
      setAssetSearch('');
      onClose();
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to create incident');
    },
  });

  const onSubmit = (data: TicketFormData) => {
    createMutation.mutate({
      ...data,
      asset_ids: selectedAssets.length > 0 ? selectedAssets : undefined,
      ticket_type: 'INCIDENT',
    });
  };

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

  // Filter assets based on search
  const filteredAssets = (assetsData?.items || []).filter((asset: any) => {
    if (!assetSearch) return true;
    const searchLower = assetSearch.toLowerCase();
    return (
      asset.name?.toLowerCase().includes(searchLower) ||
      asset.asset_tag?.toLowerCase().includes(searchLower) ||
      asset.serial_number?.toLowerCase().includes(searchLower)
    );
  });

  // Get selected asset details for display
  const selectedAssetDetails = (assetsData?.items || []).filter((asset: any) =>
    selectedAssets.includes(asset.id)
  );

  return (
    <Modal open={open} onClose={onClose} title="Create New Incident" size="xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
            rows={4}
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

        <div>
          <Select
            label="SLA Policy"
            options={slaPolicyOptions}
            placeholder="Select SLA policy (optional)"
            {...register('sla_policy_id', { valueAsNumber: true })}
          />
        </div>

        {/* Multi-select Assets Section */}
        <div>
          <label className="form-label">Affected Assets (optional)</label>

          {/* Selected Assets Display */}
          {selectedAssetDetails.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {selectedAssetDetails.map((asset: any) => (
                <span
                  key={asset.id}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm"
                >
                  <span className="font-medium">{asset.asset_tag}</span>
                  <span className="text-blue-600">- {asset.name}</span>
                  <button
                    type="button"
                    onClick={() => removeAsset(asset.id)}
                    className="ml-1 hover:text-blue-900"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Asset Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={assetSearch}
              onChange={(e) => setAssetSearch(e.target.value)}
              placeholder="Search assets by name, tag, or serial number..."
              className="form-input pl-9"
            />
          </div>

          {/* Asset List */}
          <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
            {filteredAssets.length === 0 ? (
              <div className="p-3 text-sm text-gray-500 text-center">
                {assetSearch ? 'No assets found matching your search' : 'No active assets available'}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredAssets.slice(0, 20).map((asset: any) => (
                  <label
                    key={asset.id}
                    className="flex items-center gap-3 p-2 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedAssets.includes(asset.id)}
                      onChange={() => toggleAsset(asset.id)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{asset.asset_tag}</span>
                        <span className="text-gray-500">-</span>
                        <span className="text-gray-700 truncate">{asset.name}</span>
                      </div>
                      {asset.serial_number && (
                        <div className="text-xs text-gray-500">S/N: {asset.serial_number}</div>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      asset.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                      asset.status === 'IN_MAINTENANCE' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {asset.status}
                    </span>
                  </label>
                ))}
                {filteredAssets.length > 20 && (
                  <div className="p-2 text-sm text-gray-500 text-center bg-gray-50">
                    Showing first 20 results. Refine your search to see more.
                  </div>
                )}
              </div>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {selectedAssets.length} asset{selectedAssets.length !== 1 ? 's' : ''} selected
          </p>
        </div>

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

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={createMutation.isPending}
            disabled={createMutation.isPending}
          >
            Create Incident
          </Button>
        </div>
      </form>
    </Modal>
  );
}