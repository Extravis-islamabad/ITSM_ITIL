import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { problemService } from '@/services/problemService';
import { ProblemStatus, getProblemStatusLabel } from '@/types/problem';
import Button from '@/components/common/Button';
import Select from '@/components/common/Select';
import Modal from '@/components/common/Modal';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/utils/helpers';

interface StatusUpdateModalProps {
  problemId: number;
  currentStatus: ProblemStatus;
  onClose: () => void;
  onSuccess: () => void;
}

export default function StatusUpdateModal({ problemId, currentStatus, onClose, onSuccess }: StatusUpdateModalProps) {
  const [newStatus, setNewStatus] = useState<ProblemStatus>(currentStatus);

  const mutation = useMutation({
    mutationFn: () => problemService.updateStatus(problemId, newStatus),
    onSuccess: () => {
      toast.success('Status updated successfully');
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Failed to update status'));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newStatus === currentStatus) {
      toast.error('Please select a different status');
      return;
    }
    mutation.mutate();
  };

  return (
    <Modal open={true} onClose={onClose} title="Update Problem Status">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="current_status" className="block text-sm font-medium text-gray-700">
            Current Status
          </label>
          <input
            type="text"
            id="current_status"
            value={getProblemStatusLabel(currentStatus)}
            disabled
            className="mt-1 block w-full border border-gray-300 bg-gray-50 rounded-md shadow-sm py-2 px-3 text-gray-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="new_status" className="block text-sm font-medium text-gray-700">
            New Status <span className="text-red-500">*</span>
          </label>
          <Select
            id="new_status"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value as ProblemStatus)}
            required
          >
            {Object.values(ProblemStatus).map((status) => (
              <option key={status} value={status}>
                {getProblemStatusLabel(status)}
              </option>
            ))}
          </Select>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            Status changes are automatically logged in the problem's activity history.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending || newStatus === currentStatus}>
            {mutation.isPending ? 'Updating...' : 'Update Status'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
