import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { problemService } from '@/services/problemService';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Modal from '@/components/common/Modal';
import toast from 'react-hot-toast';

interface LinkIncidentModalProps {
  problemId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function LinkIncidentModal({ problemId, onClose, onSuccess }: LinkIncidentModalProps) {
  const [formData, setFormData] = useState({
    ticket_id: '',
    link_reason: '',
  });

  const mutation = useMutation({
    mutationFn: () => problemService.linkIncident(problemId, {
      ticket_id: parseInt(formData.ticket_id),
      link_reason: formData.link_reason || undefined,
    }),
    onSuccess: () => {
      toast.success('Incident linked successfully');
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to link incident');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <Modal open={true} onClose={onClose} title="Link Incident to Problem">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="ticket_id" className="block text-sm font-medium text-gray-700">
            Incident ID <span className="text-red-500">*</span>
          </label>
          <Input
            id="ticket_id"
            type="number"
            value={formData.ticket_id}
            onChange={(e) => setFormData({ ...formData, ticket_id: e.target.value })}
            placeholder="Enter incident ID"
            required
          />
        </div>

        <div>
          <label htmlFor="link_reason" className="block text-sm font-medium text-gray-700">
            Reason for Linking
          </label>
          <textarea
            id="link_reason"
            rows={3}
            value={formData.link_reason}
            onChange={(e) => setFormData({ ...formData, link_reason: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Why is this incident related to this problem?"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Linking...' : 'Link Incident'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
