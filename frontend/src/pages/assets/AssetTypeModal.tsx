import { Fragment, useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { assetService } from '@/services/assetService';
import Button from '@/components/common/Button';
import EmojiPicker from '@/components/common/EmojiPicker';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/utils/helpers';

interface AssetTypeModalProps {
  open: boolean;
  onClose: () => void;
  assetType?: any;
}

interface AssetTypeFormData {
  name: string;
  description: string;
  is_hardware: boolean;
  requires_serial: boolean;
  icon: string;
  color: string;
}

export default function AssetTypeModal({ open, onClose, assetType }: AssetTypeModalProps) {
  const queryClient = useQueryClient();
  const isEdit = !!assetType;

  const [formData, setFormData] = useState<AssetTypeFormData>({
    name: '',
    description: '',
    is_hardware: true,
    requires_serial: true,
    icon: '📦',
    color: '#6366f1',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens/closes or assetType changes
  useEffect(() => {
    if (open && assetType) {
      setFormData({
        name: assetType.name || '',
        description: assetType.description || '',
        is_hardware: assetType.is_hardware ?? true,
        requires_serial: assetType.requires_serial ?? true,
        icon: assetType.icon || '📦',
        color: assetType.color || '#6366f1',
      });
      setErrors({});
    } else if (open && !assetType) {
      setFormData({
        name: '',
        description: '',
        is_hardware: true,
        requires_serial: true,
        icon: '📦',
        color: '#6366f1',
      });
      setErrors({});
    }
  }, [open, assetType]);

  const createMutation = useMutation({
    mutationFn: (data: any) => assetService.createAssetType(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-types'] });
      toast.success('Asset type created successfully');
      onClose();
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Failed to create asset type'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      assetService.updateAssetType(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-types'] });
      toast.success('Asset type updated successfully');
      onClose();
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Failed to update asset type'));
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      is_hardware: formData.is_hardware,
      requires_serial: formData.requires_serial,
      icon: formData.icon,
      color: formData.color,
    };

    if (isEdit && assetType) {
      updateMutation.mutate({ id: assetType.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleChange = (field: keyof AssetTypeFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="absolute right-0 top-0 pr-4 pt-4">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="sm:flex sm:items-start">
                  <div className="w-full mt-3 text-center sm:mt-0 sm:text-left">
                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                      {isEdit ? 'Edit Asset Type' : 'Create Asset Type'}
                    </Dialog.Title>

                    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                      {/* Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => handleChange('name', e.target.value)}
                          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-accent-500 focus:ring-accent-500 sm:text-sm ${
                            errors.name ? 'border-red-300' : ''
                          }`}
                          placeholder="e.g., Laptop, Server, Software License"
                        />
                        {errors.name && (
                          <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                        )}
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Description
                        </label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => handleChange('description', e.target.value)}
                          rows={2}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-accent-500 focus:ring-accent-500 sm:text-sm"
                          placeholder="Describe this asset type..."
                        />
                      </div>

                      {/* Icon and Color */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Icon
                          </label>
                          <EmojiPicker
                            value={formData.icon}
                            onChange={(emoji) => handleChange('icon', emoji)}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Color
                          </label>
                          <input
                            type="color"
                            value={formData.color}
                            onChange={(e) => handleChange('color', e.target.value)}
                            className="mt-1 block w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
                          />
                        </div>
                      </div>

                      {/* Checkboxes */}
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.is_hardware}
                            onChange={(e) => handleChange('is_hardware', e.target.checked)}
                            className="h-4 w-4 text-accent-600 focus:ring-purple-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">Hardware (physical asset)</span>
                        </label>

                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.requires_serial}
                            onChange={(e) => handleChange('requires_serial', e.target.checked)}
                            className="h-4 w-4 text-accent-600 focus:ring-purple-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">Requires Serial Number</span>
                        </label>
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse gap-3">
                        <Button
                          type="submit"
                          variant="primary"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? 'Saving...' : isEdit ? 'Update' : 'Create'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={onClose}
                          disabled={isSubmitting}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
