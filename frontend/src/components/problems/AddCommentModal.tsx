import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { problemService } from '@/services/problemService';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal';
import toast from 'react-hot-toast';

interface AddCommentModalProps {
  problemId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddCommentModal({ problemId, onClose, onSuccess }: AddCommentModalProps) {
  const [formData, setFormData] = useState({
    comment: '',
    is_internal: false,
  });

  const mutation = useMutation({
    mutationFn: () => problemService.addComment(problemId, formData),
    onSuccess: () => {
      toast.success('Comment added successfully');
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to add comment');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <Modal open={true} onClose={onClose} title="Add Comment">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="comment" className="block text-sm font-medium text-gray-700">
            Comment <span className="text-red-500">*</span>
          </label>
          <textarea
            id="comment"
            rows={4}
            value={formData.comment}
            onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Enter your comment..."
            required
          />
        </div>

        <div className="flex items-center">
          <input
            id="is_internal"
            type="checkbox"
            checked={formData.is_internal}
            onChange={(e) => setFormData({ ...formData, is_internal: e.target.checked })}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
          <label htmlFor="is_internal" className="ml-2 block text-sm text-gray-900">
            Internal comment (not visible to end users)
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving...' : 'Add Comment'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
