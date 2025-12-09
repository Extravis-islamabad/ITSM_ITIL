import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';
import { Card, CardBody } from '@/components/common/Card';
import Button from '@/components/common/Button';
import TaskList from '@/components/changes/TaskList';
import ProgressTracker from '@/components/changes/ProgressTracker';
import ApprovalModal from '@/pages/changes/ApprovalModal';
import {
  ArrowLeft,
  Calendar,
  User,
  AlertTriangle,
  CheckCircle,
  
  FileText,
  Activity,
  PlayCircle,
  StopCircle,
  Send,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ChangeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  const { data: change, isLoading } = useQuery({
    queryKey: ['change', id],
    queryFn: async () => {
      const res = await axiosInstance.get(`/changes/${id}`);
      return res.data;
    },
  });

  const submitForApprovalMutation = useMutation({
    mutationFn: async () => {
      const res = await axiosInstance.post(`/changes/${id}/submit-for-approval`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Change submitted for approval');
      queryClient.invalidateQueries({ queryKey: ['change', id] });
    },
  });

  const startImplementationMutation = useMutation({
    mutationFn: async () => {
      const res = await axiosInstance.post(`/changes/${id}/start-implementation`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Change implementation started');
      queryClient.invalidateQueries({ queryKey: ['change', id] });
    },
  });

  const completeImplementationMutation = useMutation({
    mutationFn: async (closureNotes: string) => {
      const res = await axiosInstance.post(`/changes/${id}/complete-implementation`, null, {
        params: { closure_notes: closureNotes },
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Change implementation completed');
      queryClient.invalidateQueries({ queryKey: ['change', id] });
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      const res = await axiosInstance.post(`/changes/${id}/schedule`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Change scheduled for implementation');
      queryClient.invalidateQueries({ queryKey: ['change', id] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to schedule change');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!change) {
    return <div>Change not found</div>;
  }

  const getStatusColor = (status: string) => {
    const colors: any = {
      DRAFT: 'bg-gray-100 text-gray-800',
      SUBMITTED: 'bg-blue-100 text-blue-800',
      PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      SCHEDULED: 'bg-purple-100 text-purple-800',
      IN_PROGRESS: 'bg-indigo-100 text-indigo-800',
      IMPLEMENTED: 'bg-teal-100 text-teal-800',
      CLOSED: 'bg-gray-100 text-gray-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getRiskColor = (risk: string) => {
    const colors: any = {
      LOW: 'text-green-600 bg-green-50 border-green-200',
      MEDIUM: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      HIGH: 'text-orange-600 bg-orange-50 border-orange-200',
      CRITICAL: 'text-red-600 bg-red-50 border-red-200',
    };
    return colors[risk] || 'text-gray-600 bg-gray-50 border-gray-200';
  };

  // Use server-side permission checks
  const canEdit = change.status === 'DRAFT' || change.status === 'SUBMITTED';
  const canApprove = change.can_approve; // Server checks: CAB member + not own change + pending status
  const canManage = change.can_manage;   // Server checks: Owner/Implementer/CAB member
  const canSchedule = canManage && change.status === 'APPROVED';
  const canStartImplementation = canManage && change.status === 'SCHEDULED';
  const canCompleteImplementation = canManage && change.status === 'IN_PROGRESS';
  // Allow task editing for owners/implementers when change is not closed/cancelled/implemented
  const canEditTasks = canManage && !['CLOSED', 'CANCELLED', 'IMPLEMENTED'].includes(change.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/changes')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{change.title}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(change.status)}`}>
                {change.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-sm text-gray-600">{change.change_number}</p>
          </div>
        </div>

        <div className="flex gap-2">
          {canEdit && (
            <Button
              variant="outline"
              onClick={() => submitForApprovalMutation.mutate()}
              disabled={submitForApprovalMutation.isPending}
            >
              <Send className="h-4 w-4 mr-2" />
              Submit for Approval
            </Button>
          )}
          {canApprove && (
            <Button
              variant="primary"
              onClick={() => setShowApprovalModal(true)}
              className="bg-gradient-to-r from-primary-600 to-accent-600"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Review & Approve
            </Button>
          )}
          {canSchedule && (
            <Button
              variant="primary"
              onClick={() => scheduleMutation.mutate()}
              disabled={scheduleMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Schedule
            </Button>
          )}
          {canStartImplementation && (
            <Button
              variant="primary"
              onClick={() => startImplementationMutation.mutate()}
              disabled={startImplementationMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              <PlayCircle className="h-4 w-4 mr-2" />
              Start Implementation
            </Button>
          )}
          {canCompleteImplementation && (
            <Button
              variant="primary"
              onClick={() => {
                const notes = prompt('Enter closure notes (optional):');
                if (notes !== null) {
                  completeImplementationMutation.mutate(notes);
                }
              }}
              disabled={completeImplementationMutation.isPending}
              className="bg-teal-600 hover:bg-teal-700"
            >
              <StopCircle className="h-4 w-4 mr-2" />
              Complete Implementation
            </Button>
          )}
        </div>
      </div>

      {/* Quick Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardBody>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600">Type</p>
                <p className="font-semibold text-gray-900">{change.change_type}</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg border ${getRiskColor(change.risk)}`}>
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-gray-600">Risk</p>
                <p className="font-semibold text-gray-900">{change.risk}</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <User className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600">Owner</p>
                <p className="font-semibold text-gray-900 text-sm truncate">
                  {change.owner?.full_name || 'Unassigned'}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calendar className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600">Planned Start</p>
                <p className="font-semibold text-gray-900 text-sm">
                  {change.planned_start
                    ? new Date(change.planned_start).toLocaleDateString()
                    : 'Not scheduled'}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Progress Tracker */}
      {(change.status === 'IN_PROGRESS' || change.status === 'IMPLEMENTED') && change.tasks?.length > 0 && (
        <ProgressTracker changeId={change.id} />
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-4">
          {['details', 'tasks', 'activities'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <Card>
              <CardBody>
                <h3 className="font-semibold text-gray-900 mb-3">Description</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{change.description}</p>
              </CardBody>
            </Card>

            {/* Business Justification */}
            {change.business_justification && (
              <Card>
                <CardBody>
                  <h3 className="font-semibold text-gray-900 mb-3">Business Justification</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{change.business_justification}</p>
                </CardBody>
              </Card>
            )}

            {/* Implementation Plan */}
            {change.implementation_plan && (
              <Card>
                <CardBody>
                  <h3 className="font-semibold text-gray-900 mb-3">Implementation Plan</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{change.implementation_plan}</p>
                </CardBody>
              </Card>
            )}

            {/* Rollback Plan */}
            {change.rollback_plan && (
              <Card>
                <CardBody>
                  <h3 className="font-semibold text-gray-900 mb-3">Rollback Plan</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{change.rollback_plan}</p>
                </CardBody>
              </Card>
            )}

            {/* Testing Plan */}
            {change.testing_plan && (
              <Card>
                <CardBody>
                  <h3 className="font-semibold text-gray-900 mb-3">Testing Plan</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{change.testing_plan}</p>
                </CardBody>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Schedule */}
            <Card>
              <CardBody>
                <h3 className="font-semibold text-gray-900 mb-4">Schedule</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Planned Start</p>
                    <p className="text-sm font-medium text-gray-900">
                      {change.planned_start
                        ? new Date(change.planned_start).toLocaleString()
                        : 'Not scheduled'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Planned End</p>
                    <p className="text-sm font-medium text-gray-900">
                      {change.planned_end
                        ? new Date(change.planned_end).toLocaleString()
                        : 'Not scheduled'}
                    </p>
                  </div>
                  {change.actual_start && (
                    <div className="pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-600 mb-1">Actual Start</p>
                      <p className="text-sm font-medium text-green-600">
                        {new Date(change.actual_start).toLocaleString()}
                      </p>
                    </div>
                  )}
                  {change.actual_end && (
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Actual End</p>
                      <p className="text-sm font-medium text-green-600">
                        {new Date(change.actual_end).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>

            {/* People */}
            <Card>
              <CardBody>
                <h3 className="font-semibold text-gray-900 mb-4">People</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Requester</p>
                    <p className="text-sm font-medium text-gray-900">{change.requester?.full_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Owner</p>
                    <p className="text-sm font-medium text-gray-900">{change.owner?.full_name}</p>
                  </div>
                  {change.implementer && (
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Implementer</p>
                      <p className="text-sm font-medium text-gray-900">{change.implementer.full_name}</p>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>

            {/* CAB Approval - only show if approval has actually happened */}
            {change.cab_approved_by && (
              <Card>
                <CardBody>
                  <h3 className="font-semibold text-gray-900 mb-4">CAB Approval</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      {change.cab_approved ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                      )}
                      <span
                        className={`font-medium ${
                          change.cab_approved ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {change.cab_approved ? 'Approved' : 'Rejected'}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">{change.cab_approved ? 'Approved By' : 'Rejected By'}</p>
                      <p className="text-sm font-medium text-gray-900">
                        {change.cab_approved_by?.full_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">{change.cab_approved ? 'Approved At' : 'Rejected At'}</p>
                      <p className="text-sm font-medium text-gray-900">
                        {change.cab_approved_at
                          ? new Date(change.cab_approved_at).toLocaleString()
                          : '-'}
                      </p>
                    </div>
                    {change.cab_comments && (
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Comments</p>
                        <p className="text-sm text-gray-700">{change.cab_comments}</p>
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>
            )}
          </div>
        </div>
      )}

      {activeTab === 'tasks' && (
        <Card>
          <CardBody>
            <TaskList changeId={change.id} tasks={change.tasks || []} canEdit={canEditTasks} />
          </CardBody>
        </Card>
      )}

      {activeTab === 'activities' && (
        <Card>
          <CardBody>
            <h3 className="font-semibold text-gray-900 mb-4">Activity History</h3>
            <div className="space-y-4">
              {change.activities?.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p>No activities yet</p>
                </div>
              ) : (
                change.activities?.map((activity: any) => (
                  <div key={activity.id} className="flex gap-3 pb-4 border-b border-gray-100 last:border-0">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                        <Activity className="h-4 w-4 text-primary-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{activity.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-600">{activity.user?.full_name}</span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-600">
                          {new Date(activity.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Approval Modal */}
      {showApprovalModal && (
        <ApprovalModal
          open={showApprovalModal}
          onClose={() => setShowApprovalModal(false)}
          change={change}
        />
      )}
    </div>
  );
}