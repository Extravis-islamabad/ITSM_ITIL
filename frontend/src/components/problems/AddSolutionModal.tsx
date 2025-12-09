import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { problemService } from '@/services/problemService';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal';
import toast from 'react-hot-toast';

interface AddSolutionModalProps {
  problemId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddSolutionModal({ problemId, onClose, onSuccess }: AddSolutionModalProps) {
  const [formData, setFormData] = useState({
    permanent_solution_description: '',
    solution_implementation_plan: '',
  });

  const mutation = useMutation({
    mutationFn: () => problemService.updateSolution(problemId, formData),
    onSuccess: () => {
      toast.success('Permanent solution added successfully');
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to add solution');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <Modal open={true} onClose={onClose} title="Add Permanent Solution" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="permanent_solution_description" className="block text-sm font-medium text-gray-700">
            Solution Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="permanent_solution_description"
            rows={4}
            value={formData.permanent_solution_description}
            onChange={(e) => setFormData({ ...formData, permanent_solution_description: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Describe the permanent solution to this problem"
            required
          />
        </div>

        <div>
          <label htmlFor="solution_implementation_plan" className="block text-sm font-medium text-gray-700">
            Implementation Plan
          </label>
          <textarea
            id="solution_implementation_plan"
            rows={6}
            value={formData.solution_implementation_plan}
            onChange={(e) => setFormData({ ...formData, solution_implementation_plan: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Outline the steps to implement this solution..."
          />
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            💡 Tip: Consider creating a Change Request to track the implementation of this solution.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving...' : 'Add Solution'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
