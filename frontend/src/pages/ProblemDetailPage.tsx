import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { problemService } from '@/services/problemService';
import {
  getProblemStatusColor,
  getProblemPriorityColor,
  getProblemStatusLabel,
  getRCAMethodLabel,
} from '@/types/problem';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { formatDistanceToNow, format } from 'date-fns';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  LinkIcon,
  ChatBubbleLeftIcon,
  DocumentTextIcon,
  LightBulbIcon,
  WrenchScrewdriverIcon,
  BeakerIcon,
} from '@heroicons/react/24/outline';
import AddRCAModal from '@/components/problems/AddRCAModal';
import AddWorkaroundModal from '@/components/problems/AddWorkaroundModal';
import AddSolutionModal from '@/components/problems/AddSolutionModal';
import LinkIncidentModal from '@/components/problems/LinkIncidentModal';
import AddCommentModal from '@/components/problems/AddCommentModal';
import StatusUpdateModal from '@/components/problems/StatusUpdateModal';

export default function ProblemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showRCAModal, setShowRCAModal] = useState(false);
  const [showWorkaroundModal, setShowWorkaroundModal] = useState(false);
  const [showSolutionModal, setShowSolutionModal] = useState(false);
  const [showLinkIncidentModal, setShowLinkIncidentModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  const { data: problem, isLoading, error } = useQuery({
    queryKey: ['problem', id],
    queryFn: () => problemService.getProblem(Number(id)),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => problemService.deleteProblem(Number(id)),
    onSuccess: () => {
      toast.success('Problem deleted successfully');
      navigate('/problems');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete problem');
    },
  });

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this problem?')) {
      deleteMutation.mutate();
    }
  };

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ['problem', id] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !problem) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Problem not found</h3>
          <p className="mt-1 text-sm text-gray-500">
            The problem you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <div className="mt-6">
            <Button onClick={() => navigate('/problems')}>Back to Problems</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link to="/problems" className="hover:text-gray-700">Problems</Link>
          <span>/</span>
          <span className="text-gray-900">{problem.problem_number}</span>
        </div>

        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{problem.title}</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getProblemStatusColor(problem.status)}`}>
                {getProblemStatusLabel(problem.status)}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getProblemPriorityColor(problem.priority)}`}>
                {problem.priority}
              </span>
            </div>
            <p className="text-sm text-gray-600">
              Created {formatDistanceToNow(new Date(problem.created_at), { addSuffix: true })}
              {problem.assigned_to && (
                <> • Assigned to <span className="font-medium">{problem.assigned_to.full_name}</span></>
              )}
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowStatusModal(true)}>
              Update Status
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DocumentTextIcon className="h-5 w-5 text-gray-400" />
              Description
            </h2>
            <p className="text-gray-700 whitespace-pre-wrap">{problem.description}</p>
          </div>

          {/* Symptoms */}
          {problem.symptoms && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
                Symptoms
              </h2>
              <p className="text-gray-700 whitespace-pre-wrap">{problem.symptoms}</p>
            </div>
          )}

          {/* Root Cause Analysis */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <BeakerIcon className="h-5 w-5 text-purple-500" />
                Root Cause Analysis
              </h2>
              {!problem.root_cause && (
                <Button size="sm" onClick={() => setShowRCAModal(true)}>
                  Add RCA
                </Button>
              )}
            </div>

            {problem.root_cause ? (
              <div className="space-y-4">
                {problem.rca_method && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Method:</span>
                    <p className="mt-1 text-gray-900">{getRCAMethodLabel(problem.rca_method)}</p>
                  </div>
                )}
                <div>
                  <span className="text-sm font-medium text-gray-500">Root Cause:</span>
                  <p className="mt-1 text-gray-900 whitespace-pre-wrap">{problem.root_cause}</p>
                </div>
                {problem.investigation_notes && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Investigation Notes:</span>
                    <p className="mt-1 text-gray-700 whitespace-pre-wrap">{problem.investigation_notes}</p>
                  </div>
                )}
                {problem.root_cause_found_at && (
                  <p className="text-xs text-gray-500">
                    Found {format(new Date(problem.root_cause_found_at), 'PPP')}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No root cause analysis has been performed yet.</p>
            )}
          </div>

          {/* Workaround */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <WrenchScrewdriverIcon className="h-5 w-5 text-blue-500" />
                Workaround
              </h2>
              {!problem.has_workaround && (
                <Button size="sm" onClick={() => setShowWorkaroundModal(true)}>
                  Add Workaround
                </Button>
              )}
            </div>

            {problem.has_workaround ? (
              <div className="space-y-4">
                <div>
                  <span className="text-sm font-medium text-gray-500">Description:</span>
                  <p className="mt-1 text-gray-900 whitespace-pre-wrap">{problem.workaround_description}</p>
                </div>
                {problem.workaround_steps && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Steps:</span>
                    <p className="mt-1 text-gray-700 whitespace-pre-wrap">{problem.workaround_steps}</p>
                  </div>
                )}
                {problem.workaround_available_at && (
                  <p className="text-xs text-gray-500">
                    Available since {format(new Date(problem.workaround_available_at), 'PPP')}
                  </p>
                )}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    ✓ Workaround is available for affected users
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No workaround has been identified yet.</p>
            )}
          </div>

          {/* Permanent Solution */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <LightBulbIcon className="h-5 w-5 text-green-500" />
                Permanent Solution
              </h2>
              {!problem.has_permanent_solution && problem.root_cause && (
                <Button size="sm" onClick={() => setShowSolutionModal(true)}>
                  Add Solution
                </Button>
              )}
            </div>

            {problem.has_permanent_solution ? (
              <div className="space-y-4">
                <div>
                  <span className="text-sm font-medium text-gray-500">Solution:</span>
                  <p className="mt-1 text-gray-900 whitespace-pre-wrap">{problem.permanent_solution_description}</p>
                </div>
                {problem.solution_implementation_plan && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Implementation Plan:</span>
                    <p className="mt-1 text-gray-700 whitespace-pre-wrap">{problem.solution_implementation_plan}</p>
                  </div>
                )}
                {problem.related_change_id && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-800">
                      <Link to={`/changes/${problem.related_change_id}`} className="font-medium hover:underline">
                        Related Change Request →
                      </Link>
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">
                {!problem.root_cause
                  ? 'Complete root cause analysis before adding a permanent solution.'
                  : 'No permanent solution has been defined yet.'}
              </p>
            )}
          </div>

          {/* Related Incidents */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <LinkIcon className="h-5 w-5 text-gray-400" />
                Related Incidents ({problem.incident_count})
              </h2>
              <Button size="sm" onClick={() => setShowLinkIncidentModal(true)}>
                Link Incident
              </Button>
            </div>

            {problem.related_incidents && problem.related_incidents.length > 0 ? (
              <div className="space-y-2">
                {problem.related_incidents.map((link: any) => (
                  <div key={link.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <Link
                        to={`/incidents/${link.ticket_id}`}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                      >
                        Incident #{link.ticket_id}
                      </Link>
                      {link.link_reason && (
                        <p className="text-xs text-gray-600 mt-1">{link.link_reason}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(link.linked_at), { addSuffix: true })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No incidents linked to this problem yet.</p>
            )}
          </div>

          {/* Comments */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <ChatBubbleLeftIcon className="h-5 w-5 text-gray-400" />
                Comments
              </h2>
              <Button size="sm" onClick={() => setShowCommentModal(true)}>
                Add Comment
              </Button>
            </div>

            {problem.comments && problem.comments.length > 0 ? (
              <div className="space-y-4">
                {problem.comments.map((comment: any) => (
                  <div key={comment.id} className="border-l-4 border-gray-200 pl-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {comment.user?.full_name || 'Unknown'}
                      </span>
                      {comment.is_internal && (
                        <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded">
                          Internal
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.comment}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No comments yet.</p>
            )}
          </div>
        </div>

        {/* Right Column - Metadata & Timeline */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Problem Information</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs font-medium text-gray-500">Problem Number</dt>
                <dd className="mt-1 text-sm text-gray-900">{problem.problem_number}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">Impact</dt>
                <dd className="mt-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {problem.impact}
                  </span>
                </dd>
              </div>
              {problem.category && (
                <div>
                  <dt className="text-xs font-medium text-gray-500">Category</dt>
                  <dd className="mt-1 text-sm text-gray-900">{problem.category.name}</dd>
                </div>
              )}
              {problem.assigned_group && (
                <div>
                  <dt className="text-xs font-medium text-gray-500">Assigned Group</dt>
                  <dd className="mt-1 text-sm text-gray-900">{problem.assigned_group.name}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs font-medium text-gray-500">Affected Users</dt>
                <dd className="mt-1 text-sm text-gray-900">{problem.affected_users_count}</dd>
              </div>
            </dl>
          </div>

          {/* Timeline */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ClockIcon className="h-4 w-4 text-gray-400" />
              Timeline
            </h3>
            <div className="space-y-3">
              <TimelineItem
                label="Identified"
                date={problem.identified_at}
                icon={<ExclamationTriangleIcon className="h-4 w-4" />}
                color="text-red-500"
              />
              {problem.investigation_started_at && (
                <TimelineItem
                  label="Investigation Started"
                  date={problem.investigation_started_at}
                  icon={<BeakerIcon className="h-4 w-4" />}
                  color="text-yellow-500"
                />
              )}
              {problem.root_cause_found_at && (
                <TimelineItem
                  label="Root Cause Found"
                  date={problem.root_cause_found_at}
                  icon={<LightBulbIcon className="h-4 w-4" />}
                  color="text-purple-500"
                />
              )}
              {problem.workaround_available_at && (
                <TimelineItem
                  label="Workaround Available"
                  date={problem.workaround_available_at}
                  icon={<WrenchScrewdriverIcon className="h-4 w-4" />}
                  color="text-blue-500"
                />
              )}
              {problem.resolved_at && (
                <TimelineItem
                  label="Resolved"
                  date={problem.resolved_at}
                  icon={<CheckCircleIcon className="h-4 w-4" />}
                  color="text-green-500"
                />
              )}
              {problem.closed_at && (
                <TimelineItem
                  label="Closed"
                  date={problem.closed_at}
                  icon={<CheckCircleIcon className="h-4 w-4" />}
                  color="text-gray-500"
                />
              )}
            </div>
          </div>

          {/* Known Error */}
          {problem.known_error && (
            <div className="bg-indigo-50 border border-indigo-200 shadow rounded-lg p-6">
              <h3 className="text-sm font-semibold text-indigo-900 mb-2">Known Error</h3>
              <p className="text-sm text-indigo-700 mb-3">
                This problem has been documented as a known error.
              </p>
              <Link
                to={`/problems/known-errors/${problem.known_error.id}`}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
              >
                View Known Error Details →
              </Link>
            </div>
          )}

          {/* Activity Log */}
          {problem.activities && problem.activities.length > 0 && (
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {problem.activities.slice(0, 5).map((activity: any) => (
                  <div key={activity.id} className="text-sm">
                    <p className="text-gray-900">{activity.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {activity.user?.full_name} • {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showRCAModal && (
        <AddRCAModal
          problemId={Number(id)}
          onClose={() => setShowRCAModal(false)}
          onSuccess={() => {
            setShowRCAModal(false);
            refetch();
          }}
        />
      )}

      {showWorkaroundModal && (
        <AddWorkaroundModal
          problemId={Number(id)}
          onClose={() => setShowWorkaroundModal(false)}
          onSuccess={() => {
            setShowWorkaroundModal(false);
            refetch();
          }}
        />
      )}

      {showSolutionModal && (
        <AddSolutionModal
          problemId={Number(id)}
          onClose={() => setShowSolutionModal(false)}
          onSuccess={() => {
            setShowSolutionModal(false);
            refetch();
          }}
        />
      )}

      {showLinkIncidentModal && (
        <LinkIncidentModal
          problemId={Number(id)}
          onClose={() => setShowLinkIncidentModal(false)}
          onSuccess={() => {
            setShowLinkIncidentModal(false);
            refetch();
          }}
        />
      )}

      {showCommentModal && (
        <AddCommentModal
          problemId={Number(id)}
          onClose={() => setShowCommentModal(false)}
          onSuccess={() => {
            setShowCommentModal(false);
            refetch();
          }}
        />
      )}

      {showStatusModal && (
        <StatusUpdateModal
          problemId={Number(id)}
          currentStatus={problem.status}
          onClose={() => setShowStatusModal(false)}
          onSuccess={() => {
            setShowStatusModal(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}

function TimelineItem({ label, date, icon, color }: { label: string; date: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className={`mt-0.5 ${color}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500">{format(new Date(date), 'PPp')}</p>
      </div>
    </div>
  );
}
