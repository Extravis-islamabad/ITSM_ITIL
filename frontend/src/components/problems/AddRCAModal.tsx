import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { problemService } from '@/services/problemService';
import { RCAMethod, getRCAMethodLabel } from '@/types/problem';
import Button from '@/components/common/Button';
import Select from '@/components/common/Select';
import Modal from '@/components/common/Modal';
import toast from 'react-hot-toast';

interface AddRCAModalProps {
  problemId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddRCAModal({ problemId, onClose, onSuccess }: AddRCAModalProps) {
  const [formData, setFormData] = useState({
    rca_method: RCAMethod.FIVE_WHYS,
    root_cause: '',
    investigation_notes: '',
  });

  const mutation = useMutation({
    mutationFn: () => problemService.updateRCA(problemId, formData),
    onSuccess: () => {
      toast.success('Root cause analysis added successfully');
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to add RCA');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <Modal open={true} onClose={onClose} title="Add Root Cause Analysis" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="rca_method" className="block text-sm font-medium text-gray-700">
            RCA Method <span className="text-red-500">*</span>
          </label>
          <Select
            id="rca_method"
            value={formData.rca_method}
            onChange={(e) => setFormData({ ...formData, rca_method: e.target.value as RCAMethod })}
            required
          >
            {Object.values(RCAMethod).map((method) => (
              <option key={method} value={method}>
                {getRCAMethodLabel(method)}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label htmlFor="root_cause" className="block text-sm font-medium text-gray-700">
            Root Cause <span className="text-red-500">*</span>
          </label>
          <textarea
            id="root_cause"
            rows={4}
            value={formData.root_cause}
            onChange={(e) => setFormData({ ...formData, root_cause: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Describe the root cause of this problem"
            required
          />
        </div>

        <div>
          <label htmlFor="investigation_notes" className="block text-sm font-medium text-gray-700">
            Investigation Notes
          </label>
          <textarea
            id="investigation_notes"
            rows={4}
            value={formData.investigation_notes}
            onChange={(e) => setFormData({ ...formData, investigation_notes: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Additional investigation notes..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving...' : 'Add RCA'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
