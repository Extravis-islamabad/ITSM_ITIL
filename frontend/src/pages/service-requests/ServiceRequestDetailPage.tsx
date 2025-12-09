import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import { Card, CardBody } from '@/components/common/Card';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import axiosInstance from '@/lib/axios';
import { formatDate, formatRelativeTime } from '@/utils/helpers';
import toast from 'react-hot-toast';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { isAgentOrHigher, isTeamLeadOrHigher } from '@/utils/roleHelpers';
import { ticketService } from '@/services/ticketService';

export default function ServiceRequestDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalDecision, setApprovalDecision] = useState<'approve' | 'reject' | null>(null);
  const [approvalComments, setApprovalComments] = useState('');
  const [newComment, setNewComment] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState<number | null>(null);

  // Role checks
  const isStaff = user ? isAgentOrHigher(user) : false;
  const isLeadOrAbove = user ? isTeamLeadOrHigher(user) : false;

  const { data: request, isLoading } = useQuery({
  queryKey: ['service-request', id],
  queryFn: async () => {
    const res = await axiosInstance.get(`/service-requests/${id}`);
    return res.data;
  },
});



  const { data: activities } = useQuery({
    queryKey: ['service-request-activities', id],
    queryFn: async () => {
      const res = await axiosInstance.get(`/tickets/${id}/activities`);
      return res.data;
    },
  });

  const { data: comments } = useQuery({
    queryKey: ['service-request-comments', id],
    queryFn: async () => {
      const res = await axiosInstance.get(`/tickets/${id}/comments`);
      return res.data;
    },
  });

  // Fetch users for assignment dropdown
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => axiosInstance.get('/users').then((res) => res.data),
    enabled: isStaff,
  });

  // Permission check for agent actions
  const isAssignedToMe = request?.assignee_id === user?.id;
  const isUnassigned = !request?.assignee_id;
  const canPerformAgentActions = isStaff && (isLeadOrAbove || isAssignedToMe || isUnassigned);
  const isApproved = request?.approval_status === 'approved';

  // Assign mutation
  const assignMutation = useMutation({
    mutationFn: (assigneeId: number) => ticketService.assignTicket(Number(id), assigneeId),
    onSuccess: () => {
      toast.success('Request assigned successfully');
      setIsAssigning(false);
      setSelectedAssignee(null);
      queryClient.invalidateQueries({ queryKey: ['service-request', id] });
      queryClient.invalidateQueries({ queryKey: ['service-request-activities', id] });
    },
    onError: () => toast.error('Failed to assign request'),
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => ticketService.updateTicket(Number(id), { status }),
    onSuccess: () => {
      toast.success('Status updated successfully');
      setNewStatus('');
      queryClient.invalidateQueries({ queryKey: ['service-request', id] });
      queryClient.invalidateQueries({ queryKey: ['service-request-activities', id] });
    },
    onError: () => toast.error('Failed to update status'),
  });

  const approvalMutation = useMutation({
    mutationFn: async (data: { approved: boolean; comments: string }) => {
      const res = await axiosInstance.post(`/service-requests/${id}/approve`, data);
      return res.data;
    },
    onSuccess: () => {
      toast.success(approvalDecision === 'approve' ? 'Request approved' : 'Request rejected');
      setShowApprovalModal(false);
      setApprovalComments('');
      queryClient.invalidateQueries({ queryKey: ['service-request', id] });
      queryClient.invalidateQueries({ queryKey: ['service-request-activities', id] });
    },
    onError: () => {
      toast.error('Failed to process approval');
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async (data: { comment: string; is_internal: boolean }) => {
      const res = await axiosInstance.post(`/tickets/${id}/comments`, data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Comment added');
      setNewComment('');
      setIsInternalComment(false);
      queryClient.invalidateQueries({ queryKey: ['service-request-comments', id] });
      queryClient.invalidateQueries({ queryKey: ['service-request-activities', id] });
    },
    onError: () => {
      toast.error('Failed to add comment');
    },
  });

  const handleAddComment = () => {
    if (newComment.trim().length < 1) {
      toast.error('Please enter a comment');
      return;
    }
    addCommentMutation.mutate({
      comment: newComment,
      is_internal: isInternalComment,
    });
  };

  const handleApprovalSubmit = () => {
    if (approvalComments.trim().length < 5) {
      toast.error('Please provide comments (minimum 5 characters)');
      return;
    }
    approvalMutation.mutate({
      approved: approvalDecision === 'approve',
      comments: approvalComments,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Service request not found</p>
      </div>
    );
  }

  const getApprovalBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="badge bg-yellow-100 text-yellow-800">⏳ Pending Approval</span>;
      case 'approved':
        return <span className="badge bg-green-100 text-green-800">✅ Approved</span>;
      case 'rejected':
        return <span className="badge bg-red-100 text-red-800">❌ Rejected</span>;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string }> = {
      NEW: { bg: 'bg-blue-100', text: 'text-blue-800' },
      OPEN: { bg: 'bg-purple-100', text: 'text-purple-800' },
      IN_PROGRESS: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      PENDING: { bg: 'bg-orange-100', text: 'text-orange-800' },
      RESOLVED: { bg: 'bg-green-100', text: 'text-green-800' },
      CLOSED: { bg: 'bg-gray-100', text: 'text-gray-800' },
      CANCELLED: { bg: 'bg-red-100', text: 'text-red-800' },
    };

    const config = statusConfig[status] || statusConfig.NEW;
    return (
      <span className={`badge ${config.bg} ${config.text}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/service-requests')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{request.ticket_number}</h1>
              {getApprovalBadge(request.approval_status)}
              {getStatusBadge(request.status)}
            </div>
            <p className="text-sm text-gray-600 mt-1">{request.title}</p>
          </div>
        </div>

        {request.can_approve && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setApprovalDecision('reject');
                setShowApprovalModal(true);
              }}
            >
              <XCircleIcon className="h-5 w-5 mr-2" />
              Reject
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setApprovalDecision('approve');
                setShowApprovalModal(true);
              }}
            >
              <CheckCircleIcon className="h-5 w-5 mr-2" />
              Approve
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardBody>
              <h2 className="text-lg font-semibold mb-4">Description</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{request.description}</p>
            </CardBody>
          </Card>

          {/* Comments */}
          <Card>
            <CardBody>
              <h2 className="text-lg font-semibold mb-4">Comments ({comments?.length || 0})</h2>

              {/* Add Comment Form */}
              <div className="mb-6 border-b pb-4">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows={3}
                  className="form-input w-full mb-2"
                />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={isInternalComment}
                      onChange={(e) => setIsInternalComment(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-gray-600">Internal note (only visible to staff)</span>
                  </label>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || addCommentMutation.isPending}
                    isLoading={addCommentMutation.isPending}
                  >
                    Add Comment
                  </Button>
                </div>
              </div>

              {/* Comments List */}
              {comments && comments.length > 0 ? (
                <div className="space-y-4">
                  {comments.map((comment: any) => (
                    <div key={comment.id} className="flex gap-3">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-accent-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-accent-600">
                            {comment.user_name?.charAt(0) || 'U'}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{comment.user_name}</span>
                          <span className="text-xs text-gray-500">
                            {formatRelativeTime(comment.created_at)}
                          </span>
                          {comment.is_internal && (
                            <span className="badge bg-yellow-100 text-yellow-800 text-xs">Internal</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 mt-1">{comment.comment}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No comments yet</p>
              )}
            </CardBody>
          </Card>

          {/* Activity Timeline */}
          <Card>
            <CardBody>
              <h2 className="text-lg font-semibold mb-4">Activity Timeline</h2>
              <div className="space-y-4">
                {activities?.map((activity: any) => {
                  const getActivityIcon = (type: string) => {
                    switch (type) {
                      case 'created': return '🎫';
                      case 'approval_decision': return activity.description.includes('approved') ? '✅' : '❌';
                      case 'assigned': return '👤';
                      case 'commented': return '💬';
                      case 'updated': return '✏️';
                      default: return '📝';
                    }
                  };

                  return (
                    <div key={activity.id} className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-lg">
                          {getActivityIcon(activity.activity_type)}
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">{activity.description}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(activity.created_at, 'PPp')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Request Information */}
          <Card>
            <CardBody>
              <h3 className="font-semibold mb-4">Request Information</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500">Request Number</p>
                  <p className="text-sm font-medium">{request.ticket_number}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Created</p>
                  <p className="text-sm font-medium">{formatDate(request.created_at, 'PPp')}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Requester</p>
                  <p className="text-sm font-medium">{request.requester_name || 'Unknown'}</p>
                </div>
                {request.category_name && (
                  <div>
                    <p className="text-xs text-gray-500">Category</p>
                    <p className="text-sm font-medium">{request.category_name}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500">Priority</p>
                  <span className={`badge ${
                    request.priority === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                    request.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                    request.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {request.priority}
                  </span>
                </div>

                {/* Linked Assets */}
                {request.linked_assets && request.linked_assets.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">
                      Linked Assets ({request.linked_assets.length})
                    </p>
                    <div className="space-y-2">
                      {request.linked_assets.map((asset: any) => (
                        <Link
                          key={asset.id}
                          to={`/assets/${asset.asset_id}`}
                          className="block p-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {asset.asset_tag}
                              </p>
                              <p className="text-xs text-gray-600 truncate">
                                {asset.asset_name}
                              </p>
                            </div>
                            {asset.status && (
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                asset.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                                asset.status === 'IN_MAINTENANCE' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {asset.status}
                              </span>
                            )}
                          </div>
                          {asset.asset_type_name && (
                            <p className="text-xs text-gray-500 mt-1">
                              {asset.asset_type_name}
                            </p>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {request.approved_at && (
                  <div>
                    <p className="text-xs text-gray-500">Approved At</p>
                    <p className="text-sm font-medium">{formatDate(request.approved_at, 'PPp')}</p>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Actions - Only show for approved requests and staff */}
          {isApproved && canPerformAgentActions && (
            <Card>
              <CardBody>
                <h3 className="font-semibold mb-4">Actions</h3>
                <div className="space-y-4">
                  {/* Status Change */}
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Change Status</p>
                    <div className="flex gap-2">
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        className="form-input flex-1 text-sm"
                      >
                        <option value="">Select status...</option>
                        <option value="OPEN">Open</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="PENDING">Pending</option>
                        <option value="RESOLVED">Resolved</option>
                        <option value="CLOSED">Closed</option>
                      </select>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => newStatus && updateStatusMutation.mutate(newStatus)}
                        disabled={!newStatus || updateStatusMutation.isPending}
                        isLoading={updateStatusMutation.isPending}
                      >
                        Update
                      </Button>
                    </div>
                  </div>

                  {/* Assignment */}
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Assignment</p>
                    {!isAssigning ? (
                      <div className="space-y-2">
                        {request.assignee_name ? (
                          <p className="text-sm font-medium">{request.assignee_name}</p>
                        ) : (
                          <p className="text-sm text-gray-400 italic">Unassigned</p>
                        )}
                        <div className="flex gap-2">
                          {!isAssignedToMe && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => user && assignMutation.mutate(user.id)}
                              disabled={assignMutation.isPending}
                              isLoading={assignMutation.isPending}
                            >
                              <UserPlusIcon className="h-4 w-4 mr-1" />
                              Assign to Me
                            </Button>
                          )}
                          {isLeadOrAbove && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setIsAssigning(true)}
                            >
                              Reassign
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <select
                          value={selectedAssignee || ''}
                          onChange={(e) => setSelectedAssignee(Number(e.target.value) || null)}
                          className="form-input w-full text-sm"
                        >
                          <option value="">Select user...</option>
                          {usersData?.items?.map((u: any) => (
                            <option key={u.id} value={u.id}>
                              {u.full_name}
                            </option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => selectedAssignee && assignMutation.mutate(selectedAssignee)}
                            disabled={!selectedAssignee || assignMutation.isPending}
                            isLoading={assignMutation.isPending}
                          >
                            Assign
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setIsAssigning(false);
                              setSelectedAssignee(null);
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Assignment Info (read-only for non-staff or pending requests) */}
          {request.assignee_name && !(isApproved && canPerformAgentActions) && (
            <Card>
              <CardBody>
                <h3 className="font-semibold mb-4">Assignment</h3>
                <div>
                  <p className="text-xs text-gray-500">Assigned To</p>
                  <p className="text-sm font-medium">{request.assignee_name}</p>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      {/* Approval Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {approvalDecision === 'approve' ? 'Approve Request' : 'Reject Request'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="form-label">Comments (min 5 characters) *</label>
                <textarea
                  value={approvalComments}
                  onChange={(e) => setApprovalComments(e.target.value)}
                  placeholder={
                    approvalDecision === 'approve'
                      ? 'Provide approval notes...'
                      : 'Provide reason for rejection...'
                  }
                  rows={4}
                  className="form-input w-full"
                />
                <p className="text-xs text-gray-500 mt-1">{approvalComments.length}/5 characters</p>
              </div>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowApprovalModal(false);
                    setApprovalComments('');
                    setApprovalDecision(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant={approvalDecision === 'approve' ? 'primary' : 'danger'}
                  onClick={handleApprovalSubmit}
                  disabled={approvalComments.trim().length < 5 || approvalMutation.isPending}
                  isLoading={approvalMutation.isPending}
                >
                  {approvalDecision === 'approve' ? 'Approve' : 'Reject'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}