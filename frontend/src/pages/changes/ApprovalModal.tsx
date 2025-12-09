import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';
import Modal from '@/components/common/Modal';
import Button from '@/components/common/Button';
import { CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface ApprovalModalProps {
  open: boolean;
  onClose: () => void;
  change: any;
}

export default function ApprovalModal({ open, onClose, change }: ApprovalModalProps) {
  const queryClient = useQueryClient();
  const [comments, setComments] = useState('');
  const [decision, setDecision] = useState<'approve' | 'reject' | null>(null);

  const approveMutation = useMutation({
    mutationFn: async (data: { approved: boolean; comments?: string }) => {
      const res = await axiosInstance.post(`/changes/${change.id}/approve`, data);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ['changes'] });
      // Use String(change.id) to match query key format from useParams()
      queryClient.invalidateQueries({ queryKey: ['change', String(change.id)] });
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      onClose();
      setComments('');
      setDecision(null);
    },
    onError: (error: any) => {
      const detail = error.response?.data?.detail;
      // Handle FastAPI validation errors (array of objects) vs string errors
      const message = Array.isArray(detail)
        ? detail.map((e: any) => e.msg).join(', ')
        : (typeof detail === 'string' ? detail : 'Failed to process approval');
      toast.error(message);
    },
  });

  const handleApprove = () => {
    setDecision('approve');
    approveMutation.mutate({ approved: true, comments: comments || '' });
  };

  const handleReject = () => {
    if (!comments.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    setDecision('reject');
    approveMutation.mutate({ approved: false, comments });
  };

  const getRiskColor = (risk: string) => {
    const colors: any = {
      LOW: 'text-green-600 bg-green-50',
      MEDIUM: 'text-yellow-600 bg-yellow-50',
      HIGH: 'text-orange-600 bg-orange-50',
      CRITICAL: 'text-red-600 bg-red-50',
    };
    return colors[risk] || 'text-gray-600 bg-gray-50';
  };

  const getImpactColor = (impact: string) => {
    const colors: any = {
      LOW: 'text-green-600 bg-green-50',
      MEDIUM: 'text-yellow-600 bg-yellow-50',
      HIGH: 'text-red-600 bg-red-50',
    };
    return colors[impact] || 'text-gray-600 bg-gray-50';
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="CAB Approval Review"
      size="2xl"
    >
      <div className="space-y-6">
        {/* Change Summary */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div>
            <h3 className="font-semibold text-lg text-gray-900">{change?.title}</h3>
            <p className="text-sm text-gray-600">{change?.change_number}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500">Type</p>
              <p className="font-medium text-sm">{change?.change_type?.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Risk</p>
              <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${getRiskColor(change?.risk)}`}>
                {change?.risk}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-500">Impact</p>
              <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${getImpactColor(change?.impact)}`}>
                {change?.impact}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-500">Priority</p>
              <p className="font-medium text-sm">{change?.priority}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-200">
            <div>
              <p className="text-xs text-gray-500">Planned Start</p>
              <p className="font-medium text-sm">
                {change?.planned_start ? new Date(change.planned_start).toLocaleString() : 'Not scheduled'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Planned End</p>
              <p className="font-medium text-sm">
                {change?.planned_end ? new Date(change.planned_end).toLocaleString() : 'Not scheduled'}
              </p>
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Description</h4>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{change?.description}</p>
        </div>

        {/* Business Justification */}
        {change?.business_justification && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Business Justification</h4>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{change?.business_justification}</p>
          </div>
        )}

        {/* Implementation Plan */}
        {change?.implementation_plan && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Implementation Plan</h4>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{change?.implementation_plan}</p>
          </div>
        )}

        {/* Rollback Plan */}
        {change?.rollback_plan && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Rollback Plan</h4>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{change?.rollback_plan}</p>
          </div>
        )}

        {/* CAB Comments */}
        <div>
          <label htmlFor="cab-comments" className="block text-sm font-medium text-gray-700 mb-1">
            CAB Comments {decision === 'reject' && <span className="text-red-500">*</span>}
          </label>
          <textarea
            id="cab-comments"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={4}
            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Add your comments or reasons for approval/rejection..."
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={approveMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleReject}
            disabled={approveMutation.isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Reject
          </Button>
          <Button
            variant="primary"
            onClick={handleApprove}
            disabled={approveMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Approve
          </Button>
        </div>
      </div>
    </Modal>
  );
}