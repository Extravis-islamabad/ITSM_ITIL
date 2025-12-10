import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { knowledgeService } from '@/services/knowledgeService';
import { KnowledgeCategory } from '@/types';
import { PlusIcon, PencilIcon, TrashIcon, FolderIcon } from '@heroicons/react/24/outline';
import { Card, CardBody } from '@/components/common/Card';
import Button from '@/components/common/Button';
import Badge from '@/components/common/Badge';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import CategoryModal from '@/components/knowledge/CategoryModal';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/utils/helpers';

export default function CategoriesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<KnowledgeCategory | null>(null);

  const queryClient = useQueryClient();

  // Fetch categories
  const { data: categories, isLoading } = useQuery({
    queryKey: ['knowledge-categories'],
    queryFn: () => knowledgeService.getCategories({}),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => knowledgeService.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-categories'] });
      toast.success('Category deleted successfully');
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Failed to delete category'));
    },
  });

  const handleEdit = (category: KnowledgeCategory) => {
    setSelectedCategory(category);
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedCategory(null);
  };

  // Organize categories into parent-child structure
  const organizeCategories = (cats: any[] | undefined) => {
    if (!cats) return [];
    const parentCategories = cats.filter(c => !c.parent_id);
    return parentCategories.map(parent => ({
      ...parent,
      children: cats.filter(c => c.parent_id === parent.id)
    }));
  };

  const organizedCategories = organizeCategories(categories);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Knowledge Base Categories</h1>
          <p className="mt-1 text-sm text-gray-500">
            Organize your articles into categories
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setIsModalOpen(true)}
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          New Category
        </Button>
      </div>

      {/* Categories List */}
      <Card>
        <CardBody>
          {isLoading ? (
            <LoadingSpinner />
          ) : !categories || categories.length === 0 ? (
            <div className="text-center py-12">
              <FolderIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No categories</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a new category
              </p>
              <div className="mt-6">
                <Button
                  variant="primary"
                  onClick={() => setIsModalOpen(true)}
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  New Category
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {organizedCategories.map((parent: any) => (
                <div key={parent.id} className="border border-gray-200 rounded-lg">
                  {/* Parent Category */}
                  <div className="flex items-center justify-between p-4 bg-gray-50">
                    <div className="flex items-center gap-4 flex-1">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: parent.color || '#8b5cf6' }}
                      >
                        <span className="text-xl">{parent.icon || '📁'}</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{parent.name}</h3>
                        {parent.description && (
                          <p className="text-sm text-gray-500">{parent.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant="primary">{parent.article_count || 0} articles</Badge>
                        {!parent.is_active && <Badge variant="secondary">Inactive</Badge>}
                        {!parent.is_public && <Badge variant="warning">Private</Badge>}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleEdit(parent)}
                        className="p-2 text-accent-600 hover:bg-accent-50 rounded"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(parent.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Child Categories */}
                  {parent.children && parent.children.length > 0 && (
                    <div className="border-t border-gray-200">
                      {parent.children.map((child: any) => (
                        <div
                          key={child.id}
                          className="flex items-center justify-between p-4 pl-16 hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-4 flex-1">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: child.color || '#a855f7' }}
                            >
                              <span className="text-sm">{child.icon || '📄'}</span>
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{child.name}</h4>
                              {child.description && (
                                <p className="text-sm text-gray-500">{child.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-4">
                              <Badge variant="secondary">{child.article_count || 0} articles</Badge>
                              {!child.is_active && <Badge variant="secondary">Inactive</Badge>}
                              {!child.is_public && <Badge variant="warning">Private</Badge>}
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => handleEdit(child)}
                              className="p-2 text-accent-600 hover:bg-accent-50 rounded"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(child.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Category Modal */}
      <CategoryModal
        open={isModalOpen}
        onClose={handleModalClose}
        category={selectedCategory}
        categories={categories || []}
      />
    </div>
  );
}
