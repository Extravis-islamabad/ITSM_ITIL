import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardBody } from '@/components/common/Card';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import axiosInstance from '@/lib/axios';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/utils/helpers';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

interface ServiceTemplate {
  id: number;
  name: string;
  description: string;
  category_id: number | null;
  category_name: string | null;
  icon: string;
  estimated_days: number;
  requires_approval: boolean;
  is_active: boolean;
}

interface Category {
  id: number;
  name: string;
}

const EMOJI_OPTIONS = [
  '📋', '💻', '🖥️', '📱', '🔧', '🔐', '📧', '🌐',
  '📁', '🖨️', '💾', '🔌', '📶', '🛡️', '👤', '🏢',
  '📊', '🎫', '⚙️', '🔑', '📦', '🚀', '💡', '📞'
];

export default function ServiceTemplatesPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ServiceTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_id: '' as string | number,
    icon: '📋',
    estimated_days: 3,
    requires_approval: false,
  });

  const { data: templates, isLoading } = useQuery({
    queryKey: ['service-templates-admin'],
    queryFn: async () => {
      const res = await axiosInstance.get('/service-requests/templates/all');
      return res.data as ServiceTemplate[];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ['categories-for-templates'],
    queryFn: async () => {
      const res = await axiosInstance.get('/categories');
      return res.data as Category[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const params = new URLSearchParams();
      params.append('name', data.name);
      params.append('description', data.description);
      if (data.category_id) params.append('category_id', String(data.category_id));
      params.append('icon', data.icon);
      params.append('estimated_days', String(data.estimated_days));
      params.append('requires_approval', String(data.requires_approval));

      const res = await axiosInstance.post(`/service-requests/templates?${params}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Template created successfully');
      queryClient.invalidateQueries({ queryKey: ['service-templates-admin'] });
      queryClient.invalidateQueries({ queryKey: ['service-request-templates'] });
      handleCloseModal();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to create template'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof formData & { is_active?: boolean } }) => {
      const params = new URLSearchParams();
      params.append('name', data.name);
      params.append('description', data.description);
      if (data.category_id) params.append('category_id', String(data.category_id));
      params.append('icon', data.icon);
      params.append('estimated_days', String(data.estimated_days));
      params.append('requires_approval', String(data.requires_approval));
      if (data.is_active !== undefined) params.append('is_active', String(data.is_active));

      const res = await axiosInstance.put(`/service-requests/templates/${id}?${params}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Template updated successfully');
      queryClient.invalidateQueries({ queryKey: ['service-templates-admin'] });
      queryClient.invalidateQueries({ queryKey: ['service-request-templates'] });
      handleCloseModal();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to update template'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await axiosInstance.delete(`/service-requests/templates/${id}`);
    },
    onSuccess: () => {
      toast.success('Template deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['service-templates-admin'] });
      queryClient.invalidateQueries({ queryKey: ['service-request-templates'] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to delete template'));
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: number; is_active: boolean }) => {
      const params = new URLSearchParams();
      params.append('is_active', String(is_active));
      const res = await axiosInstance.put(`/service-requests/templates/${id}?${params}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Template status updated');
      queryClient.invalidateQueries({ queryKey: ['service-templates-admin'] });
      queryClient.invalidateQueries({ queryKey: ['service-request-templates'] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to update template status'));
    },
  });

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setFormData({
      name: '',
      description: '',
      category_id: '',
      icon: '📋',
      estimated_days: 3,
      requires_approval: false,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (template: ServiceTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description,
      category_id: template.category_id || '',
      icon: template.icon || '📋',
      estimated_days: template.estimated_days,
      requires_approval: template.requires_approval,
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTemplate(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.description.trim()) {
      toast.error('Name and description are required');
      return;
    }

    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (template: ServiceTemplate) => {
    if (window.confirm(`Are you sure you want to delete "${template.name}"?`)) {
      deleteMutation.mutate(template.id);
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Request Templates</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage templates that appear in the service catalog when users create new requests
          </p>
        </div>
        <Button variant="primary" onClick={handleOpenCreate}>
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Template
        </Button>
      </div>

      <Card>
        <CardBody>
          {templates?.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Templates Yet</h3>
              <p className="text-gray-500 mb-6">
                Create your first service request template to get started
              </p>
              <Button variant="primary" onClick={handleOpenCreate}>
                <PlusIcon className="h-5 w-5 mr-2" />
                Create Template
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                      Template
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                      Category
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                      Est. Days
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                      Approval
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {templates?.map((template) => (
                    <tr key={template.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{template.icon}</span>
                          <div>
                            <div className="font-medium text-gray-900">{template.name}</div>
                            <div className="text-sm text-gray-500 line-clamp-1">{template.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {template.category_name || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {template.estimated_days} days
                      </td>
                      <td className="px-6 py-4">
                        {template.requires_approval ? (
                          <span className="badge bg-yellow-100 text-yellow-800">Required</span>
                        ) : (
                          <span className="badge bg-gray-100 text-gray-600">Not Required</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleActiveMutation.mutate({ id: template.id, is_active: !template.is_active })}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                            template.is_active
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {template.is_active ? (
                            <>
                              <CheckCircleIcon className="h-4 w-4" />
                              Active
                            </>
                          ) : (
                            <>
                              <XCircleIcon className="h-4 w-4" />
                              Inactive
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(template)}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(template)}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        open={showModal}
        onClose={handleCloseModal}
        title={editingTemplate ? 'Edit Template' : 'Create Template'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">Icon</label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setFormData({ ...formData, icon: emoji })}
                  className={`text-2xl p-2 rounded border-2 transition-colors ${
                    formData.icon === emoji
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="form-label">Name *</label>
            <input
              type="text"
              className="form-input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., New Laptop Request"
              required
            />
          </div>

          <div>
            <label className="form-label">Description *</label>
            <textarea
              className="form-input"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what this template is for..."
              required
            />
          </div>

          <div>
            <label className="form-label">Category (Optional)</label>
            <select
              className="form-input"
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value ? Number(e.target.value) : '' })}
            >
              <option value="">No Category</option>
              {categories?.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Estimated Days</label>
              <input
                type="number"
                min="1"
                className="form-input"
                value={formData.estimated_days}
                onChange={(e) => setFormData({ ...formData, estimated_days: parseInt(e.target.value) || 1 })}
              />
            </div>

            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.requires_approval}
                  onChange={(e) => setFormData({ ...formData, requires_approval: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                <span className="text-sm text-gray-700">Requires Manager Approval</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={createMutation.isPending || updateMutation.isPending}
            >
              {editingTemplate ? 'Update Template' : 'Create Template'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
