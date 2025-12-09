import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { problemService } from '@/services/problemService';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal';
import toast from 'react-hot-toast';

interface AddWorkaroundModalProps {
  problemId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddWorkaroundModal({ problemId, onClose, onSuccess }: AddWorkaroundModalProps) {
  const [formData, setFormData] = useState({
    workaround_description: '',
    workaround_steps: '',
  });

  const mutation = useMutation({
    mutationFn: () => problemService.updateWorkaround(problemId, formData),
    onSuccess: () => {
      toast.success('Workaround added successfully');
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to add workaround');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <Modal open={true} onClose={onClose} title="Add Workaround" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="workaround_description" className="block text-sm font-medium text-gray-700">
            Workaround Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="workaround_description"
            rows={4}
            value={formData.workaround_description}
            onChange={(e) => setFormData({ ...formData, workaround_description: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Describe the temporary workaround"
            required
          />
        </div>

        <div>
          <label htmlFor="workaround_steps" className="block text-sm font-medium text-gray-700">
            Steps to Apply Workaround
          </label>
          <textarea
            id="workaround_steps"
            rows={6}
            value={formData.workaround_steps}
            onChange={(e) => setFormData({ ...formData, workaround_steps: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="1. Step one&#10;2. Step two&#10;3. Step three"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving...' : 'Add Workaround'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
