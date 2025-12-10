import { Fragment, useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { knowledgeService } from '@/services/knowledgeService';
import { KnowledgeCategory } from '@/types';
import Button from '@/components/common/Button';
import toast from 'react-hot-toast';
import { CATEGORY_QUICK_SELECT, DEFAULT_CATEGORY_EMOJI } from '@/constants/emojis';
import { getErrorMessage } from '@/utils/helpers';

interface CategoryModalProps {
  open: boolean;
  onClose: () => void;
  category?: KnowledgeCategory | null;
  categories: KnowledgeCategory[];
}

export default function CategoryModal({ open, onClose, category, categories }: CategoryModalProps) {
  const queryClient = useQueryClient();
  const isEdit = !!category;

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    icon: DEFAULT_CATEGORY_EMOJI,
    color: '#8b5cf6',
    parent_id: '',
    sort_order: 0,
    is_active: true,
    is_public: true,
  });

  const [autoSlug, setAutoSlug] = useState(true);

  useEffect(() => {
    if (category && isEdit) {
      setFormData({
        name: category.name,
        slug: category.slug,
        description: category.description || '',
        icon: category.icon || DEFAULT_CATEGORY_EMOJI,
        color: category.color || '#8b5cf6',
        parent_id: category.parent_id?.toString() || '',
        sort_order: category.sort_order,
        is_active: category.is_active,
        is_public: category.is_public,
      });
      setAutoSlug(false);
    } else if (open && !category) {
      setFormData({
        name: '',
        slug: '',
        description: '',
        icon: DEFAULT_CATEGORY_EMOJI,
        color: '#8b5cf6',
        parent_id: '',
        sort_order: 0,
        is_active: true,
        is_public: true,
      });
      setAutoSlug(true);
    }
  }, [open, category, isEdit]);

  const createMutation = useMutation({
    mutationFn: (data: any) => knowledgeService.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-categories'] });
      toast.success('Category created successfully!');
      onClose();
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Failed to create category'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      knowledgeService.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-categories'] });
      toast.success('Category updated successfully!');
      onClose();
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Failed to update category'));
    },
  });

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    if (field === 'name' && autoSlug) {
      const slug = knowledgeService.generateSlug(value);
      setFormData(prev => ({ ...prev, slug }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    if (!formData.slug.trim()) {
      toast.error('Slug is required');
      return;
    }

    const payload = {
      ...formData,
      parent_id: formData.parent_id ? Number(formData.parent_id) : null,
    };

    if (isEdit && category) {
      updateMutation.mutate({ id: category.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // Available parent categories (exclude current category if editing)
  const availableParents = categories.filter(
    c => !category || c.id !== category.id
  );

  const commonColors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

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
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
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
                      {isEdit ? 'Edit Category' : 'Create New Category'}
                    </Dialog.Title>

                    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            className="form-input"
                            placeholder="Category name"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Slug <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.slug}
                            onChange={(e) => {
                              handleChange('slug', e.target.value);
                              setAutoSlug(false);
                            }}
                            className="form-input"
                            placeholder="url-slug"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => handleChange('description', e.target.value)}
                          className="form-input"
                          rows={2}
                          placeholder="Category description"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Icon
                          </label>
                          <div className="flex gap-2 flex-wrap mb-2">
                            {CATEGORY_QUICK_SELECT.map(icon => (
                              <button
                                key={icon}
                                type="button"
                                onClick={() => handleChange('icon', icon)}
                                className={`w-10 h-10 flex items-center justify-center rounded border-2 ${
                                  formData.icon === icon ? 'border-primary-500' : 'border-gray-200'
                                }`}
                              >
                                {icon}
                              </button>
                            ))}
                          </div>
                          <input
                            type="text"
                            value={formData.icon}
                            onChange={(e) => handleChange('icon', e.target.value)}
                            className="form-input text-center"
                            placeholder="Or enter custom emoji"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Color
                          </label>
                          <div className="flex gap-2 flex-wrap mb-2">
                            {commonColors.map(color => (
                              <button
                                key={color}
                                type="button"
                                onClick={() => handleChange('color', color)}
                                className={`w-10 h-10 rounded border-2 ${
                                  formData.color === color ? 'border-gray-900' : 'border-gray-200'
                                }`}
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                          <input
                            type="color"
                            value={formData.color}
                            onChange={(e) => handleChange('color', e.target.value)}
                            className="form-input"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Parent Category
                          </label>
                          <select
                            value={formData.parent_id}
                            onChange={(e) => handleChange('parent_id', e.target.value)}
                            className="form-input"
                          >
                            <option value="">None (Top level)</option>
                            {availableParents.filter(c => !c.parent_id).map(cat => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Sort Order
                          </label>
                          <input
                            type="number"
                            value={formData.sort_order}
                            onChange={(e) => handleChange('sort_order', Number(e.target.value))}
                            className="form-input"
                            min="0"
                          />
                        </div>
                      </div>

                      <div className="flex gap-6">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.is_active}
                            onChange={(e) => handleChange('is_active', e.target.checked)}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Active</span>
                        </label>

                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.is_public}
                            onChange={(e) => handleChange('is_public', e.target.checked)}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Public (visible in portal)</span>
                        </label>
                      </div>

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
