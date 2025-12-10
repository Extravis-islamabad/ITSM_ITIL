import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoryService } from '@/services/categoryService';
import { Card, CardBody } from '@/components/common/Card';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal';
import Input from '@/components/common/Input';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import EmojiPicker from '@/components/common/EmojiPicker';
import ColorPicker from '@/components/common/ColorPicker';
import { PlusIcon, TrashIcon, TagIcon, FolderIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { getErrorMessage } from '@/utils/helpers';

interface Category {
  id: number;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  category_type?: string;
  is_active: boolean;
  subcategories?: Subcategory[];
}

interface Subcategory {
  id: number;
  name: string;
  category_id: number;
}

interface CategoryFormData {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  category_type: string;
  is_active: boolean;
}

interface SubcategoryFormData {
  name: string;
  category_id: number;
}

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubcategoryModalOpen, setIsSubcategoryModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedEmoji, setSelectedEmoji] = useState('');
  const [selectedColor, setSelectedColor] = useState('#3B82F6');

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getCategories(),
  });

  const {
    register: registerCategory,
    handleSubmit: handleCategorySubmit,
    reset: resetCategory,
    setValue: setCategoryValue,
    formState: { errors: categoryErrors },
  } = useForm<CategoryFormData>({
    defaultValues: {
      is_active: true,
      category_type: 'INCIDENT',
    },
  });

  const {
    register: registerSubcategory,
    handleSubmit: handleSubcategorySubmit,
    reset: resetSubcategory,
    setValue: setSubcategoryValue,
    formState: { errors: subcategoryErrors },
  } = useForm<SubcategoryFormData>();

  const createCategoryMutation = useMutation({
    mutationFn: (data: CategoryFormData) => categoryService.createCategory(data),
    onSuccess: () => {
      toast.success('Category created successfully');
      setIsCreateModalOpen(false);
      resetCategory();
      setSelectedEmoji('');
      setSelectedColor('#3B82F6');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Failed to create category'));
    },
  });

  const createSubcategoryMutation = useMutation({
    mutationFn: (data: SubcategoryFormData) =>
      categoryService.createSubcategory(data.category_id, { name: data.name }),
    onSuccess: () => {
      toast.success('Subcategory created successfully');
      setIsSubcategoryModalOpen(false);
      resetSubcategory();
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Failed to create subcategory'));
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: number) => categoryService.deleteCategory(id),
    onSuccess: () => {
      toast.success('Category deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Failed to delete category'));
    },
  });

  const handleDeleteCategory = (id: number) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      deleteCategoryMutation.mutate(id);
    }
  };

  const handleAddSubcategory = (category: Category) => {
    setSelectedCategory(category);
    setSubcategoryValue('category_id', category.id);
    setIsSubcategoryModalOpen(true);
  };

  const onCategorySubmit = (data: CategoryFormData) => {
    createCategoryMutation.mutate(data);
  };

  const onSubcategorySubmit = (data: SubcategoryFormData) => {
    createSubcategoryMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage ticket categories and subcategories
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Category
        </Button>
      </div>

      <Card>
        <CardBody>
          {isLoading ? (
            <LoadingSpinner />
          ) : !categories || categories.length === 0 ? (
            <EmptyState
              icon={<TagIcon />}
              title="No categories found"
              description="Get started by creating your first category"
              action={
                <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Create Category
                </Button>
              }
            />
          ) : (
            <div className="space-y-4">
              {categories.map((category: Category) => (
                <div
                  key={category.id}
                  className="border border-gray-200 rounded-lg p-4"
                  style={{ borderLeftWidth: '4px', borderLeftColor: category.color || '#E5E7EB' }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {category.icon ? (
                          <span className="text-xl">{category.icon}</span>
                        ) : (
                          <FolderIcon className="h-5 w-5 text-gray-400" />
                        )}
                        <h3 className="font-semibold text-gray-900">
                          {category.name}
                        </h3>
                        {category.color && (
                          <span
                            className="w-4 h-4 rounded-full border border-gray-200"
                            style={{ backgroundColor: category.color }}
                            title={category.color}
                          />
                        )}
                        {category.is_active ? (
                          <span className="badge bg-green-100 text-green-800 text-xs">
                            Active
                          </span>
                        ) : (
                          <span className="badge bg-gray-100 text-gray-800 text-xs">
                            Inactive
                          </span>
                        )}
                      </div>
                      {category.description && (
                        <p className="text-sm text-gray-500 mt-1 ml-7">
                          {category.description}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddSubcategory(category)}
                      >
                        <PlusIcon className="h-4 w-4 mr-1" />
                        Add Subcategory
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteCategory(category.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {category.subcategories && category.subcategories.length > 0 && (
                    <div className="ml-7 mt-3 space-y-2">
                      <p className="text-xs font-medium text-gray-500 uppercase">
                        Subcategories
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {category.subcategories.map((sub: Subcategory) => (
                          <span
                            key={sub.id}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700"
                          >
                            {sub.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Modal
        open={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetCategory();
          setSelectedEmoji('');
          setSelectedColor('#3B82F6');
        }}
        title="Create Category"
      >
        <form onSubmit={handleCategorySubmit(onCategorySubmit)} className="space-y-4">
          <Input
            label="Name"
            {...registerCategory('name', { required: 'Name is required' })}
            error={categoryErrors.name?.message}
            placeholder="e.g., Hardware, Software"
            required
          />

          <div>
            <label className="form-label">Category Type <span className="text-red-500">*</span></label>
            <select
              className="form-input"
              {...registerCategory('category_type', { required: 'Category type is required' })}
            >
              <option value="INCIDENT">Incident</option>
              <option value="SERVICE_REQUEST">Service Request</option>
              <option value="PROBLEM">Problem</option>
              <option value="CHANGE">Change</option>
              <option value="ASSET">Asset</option>
            </select>
            {categoryErrors.category_type && (
              <p className="text-red-500 text-sm mt-1">{categoryErrors.category_type.message}</p>
            )}
          </div>

          <div>
            <label className="form-label">Description</label>
            <textarea
              className="form-input"
              rows={3}
              {...registerCategory('description')}
              placeholder="Optional description..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Icon (Emoji)</label>
              <EmojiPicker
                value={selectedEmoji}
                onChange={(emoji) => {
                  setSelectedEmoji(emoji);
                  setCategoryValue('icon', emoji);
                }}
              />
            </div>

            <ColorPicker
              label="Color"
              value={selectedColor}
              onChange={(color) => {
                setSelectedColor(color);
                setCategoryValue('color', color);
              }}
            />
          </div>

          <label className="flex items-center">
            <input
              type="checkbox"
              {...registerCategory('is_active')}
              className="form-checkbox h-4 w-4 text-accent-600 rounded border-gray-300"
            />
            <span className="ml-2 text-sm text-gray-700">Active</span>
          </label>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsCreateModalOpen(false);
                resetCategory();
                setSelectedEmoji('');
                setSelectedColor('#3B82F6');
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={createCategoryMutation.isPending}
              disabled={createCategoryMutation.isPending}
            >
              Create Category
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={isSubcategoryModalOpen}
        onClose={() => {
          setIsSubcategoryModalOpen(false);
          resetSubcategory();
        }}
        title={`Add Subcategory to ${selectedCategory?.name}`}
      >
        <form onSubmit={handleSubcategorySubmit(onSubcategorySubmit)} className="space-y-4">
          <Input
            label="Subcategory Name"
            {...registerSubcategory('name', { required: 'Name is required' })}
            error={subcategoryErrors.name?.message}
            placeholder="e.g., Desktop, Laptop"
            required
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsSubcategoryModalOpen(false);
                resetSubcategory();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={createSubcategoryMutation.isPending}
              disabled={createSubcategoryMutation.isPending}
            >
              Add Subcategory
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
