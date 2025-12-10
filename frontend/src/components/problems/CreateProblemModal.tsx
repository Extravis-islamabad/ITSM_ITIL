import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { problemService } from '@/services/problemService';
import { categoryService } from '@/services/categoryService';
import { userService } from '@/services/userService';
import { ProblemCreate, ProblemPriority, ProblemImpact } from '@/types/problem';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Select from '@/components/common/Select';
import Modal from '@/components/common/Modal';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/utils/helpers';

interface CreateProblemModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateProblemModal({ onClose, onSuccess }: CreateProblemModalProps) {
  const [formData, setFormData] = useState<ProblemCreate>({
    title: '',
    description: '',
    priority: ProblemPriority.MEDIUM,
    impact: ProblemImpact.MEDIUM,
    symptoms: '',
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getCategories(true),
  });

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => userService.getUsers({ is_active: true }),
  });

  const users = usersData?.items || [];

  const createMutation = useMutation({
    mutationFn: (data: ProblemCreate) => problemService.createProblem(data),
    onSuccess: () => {
      toast.success('Problem created successfully');
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Failed to create problem'));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleChange = (field: keyof ProblemCreate, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Create New Problem"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Title <span className="text-red-500">*</span>
          </label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="Brief description of the problem"
            required
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            rows={4}
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Detailed description of the problem"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
              Priority
            </label>
            <Select
              id="priority"
              value={formData.priority}
              onChange={(e) => handleChange('priority', e.target.value as ProblemPriority)}
            >
              {Object.values(ProblemPriority).map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label htmlFor="impact" className="block text-sm font-medium text-gray-700">
              Impact
            </label>
            <Select
              id="impact"
              value={formData.impact}
              onChange={(e) => handleChange('impact', e.target.value as ProblemImpact)}
            >
              {Object.values(ProblemImpact).map((impact) => (
                <option key={impact} value={impact}>
                  {impact}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <label htmlFor="symptoms" className="block text-sm font-medium text-gray-700">
            Symptoms
          </label>
          <textarea
            id="symptoms"
            rows={3}
            value={formData.symptoms || ''}
            onChange={(e) => handleChange('symptoms', e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Observable symptoms of this problem"
          />
        </div>

        {categories && categories.length > 0 && (
          <div>
            <label htmlFor="category_id" className="block text-sm font-medium text-gray-700">
              Category
            </label>
            <Select
              id="category_id"
              value={formData.category_id || ''}
              onChange={(e) => handleChange('category_id', e.target.value ? parseInt(e.target.value) : undefined)}
            >
              <option value="">Select a category</option>
              {categories.map((category: any) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        {users && (
          <div>
            <label htmlFor="assigned_to_id" className="block text-sm font-medium text-gray-700">
              Assign To
            </label>
            <Select
              id="assigned_to_id"
              value={formData.assigned_to_id || ''}
              onChange={(e) => handleChange('assigned_to_id', e.target.value ? parseInt(e.target.value) : undefined)}
            >
              <option value="">Unassigned</option>
              {users.map((user: any) => (
                <option key={user.id} value={user.id}>
                  {user.full_name} ({user.email})
                </option>
              ))}
            </Select>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating...' : 'Create Problem'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
