import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { X, FolderKanban } from 'lucide-react';
import { toast } from 'react-hot-toast';
import projectService from '@/services/projectService';
import { userService } from '@/services/userService';
import { ProjectCreate } from '@/types/project';
import { getErrorMessage } from '@/utils/helpers';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateProjectModal({ onClose, onSuccess }: Props) {
  const [formData, setFormData] = useState<ProjectCreate>({
    name: '',
    project_key: '',
    description: '',
    lead_id: undefined,
    start_date: undefined,
    end_date: undefined,
  });

  const { data: usersData } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => userService.getUsers({ page_size: 100 }),
  });

  const users = usersData?.items || [];

  const createMutation = useMutation({
    mutationFn: (data: ProjectCreate) => projectService.createProject(data),
    onSuccess: () => {
      toast.success('Project created successfully');
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Failed to create project'));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Project name is required');
      return;
    }

    if (!formData.project_key.trim()) {
      toast.error('Project key is required');
      return;
    }

    // Validate project key format and length
    if (!/^[A-Z0-9]+$/.test(formData.project_key)) {
      toast.error('Project key must contain only uppercase letters and numbers');
      return;
    }

    if (formData.project_key.length < 2) {
      toast.error('Project key must be at least 2 characters');
      return;
    }

    if (formData.project_key.length > 10) {
      toast.error('Project key must be at most 10 characters');
      return;
    }

    // Clean the data - remove undefined/empty values
    const cleanedData: ProjectCreate = {
      name: formData.name.trim(),
      project_key: formData.project_key.trim(),
      description: formData.description?.trim() || undefined,
      lead_id: formData.lead_id || undefined,
      start_date: formData.start_date || undefined,
      end_date: formData.end_date || undefined,
    };

    createMutation.mutate(cleanedData);
  };

  const handleNameChange = (name: string) => {
    setFormData({ ...formData, name });

    // Auto-generate project key from name if key is empty or was auto-generated
    if (!formData.project_key || formData.project_key === generateKey(formData.name)) {
      setFormData(prev => ({
        ...prev,
        name,
        project_key: generateKey(name),
      }));
    } else {
      setFormData(prev => ({ ...prev, name }));
    }
  };

  const generateKey = (name: string): string => {
    // Take first letters of each word, max 4 chars, min 2 chars
    let key = name
      .split(/\s+/)
      .filter(word => word.length > 0)
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 4);

    // If key is too short, take more characters from the first word
    if (key.length < 2 && name.length >= 2) {
      key = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4);
    }

    return key || 'PR';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
              <FolderKanban className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Create New Project
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Set up a new project with board and sprints
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Project Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., Website Redesign"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Project Key *
            </label>
            <input
              type="text"
              value={formData.project_key}
              onChange={(e) => setFormData({ ...formData, project_key: e.target.value.toUpperCase() })}
              placeholder="e.g., WRD"
              maxLength={10}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 uppercase"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Used for task IDs like {formData.project_key || 'KEY'}-1, {formData.project_key || 'KEY'}-2
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the project..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Project Lead
            </label>
            <select
              value={formData.lead_id || ''}
              onChange={(e) => setFormData({ ...formData, lead_id: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select a lead</option>
              {users.map((user: any) => (
                <option key={user.id} value={user.id}>
                  {user.full_name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={formData.start_date ? formData.start_date.split('T')[0] : ''}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value || undefined })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={formData.end_date ? formData.end_date.split('T')[0] : ''}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value || undefined })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
