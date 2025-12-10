import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Play,
  CheckCircle,
  Calendar,
  Target,
  Clock,
  Trash2,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import projectService from '@/services/projectService';
import {
  Sprint,
  SprintStatus,
  getSprintStatusColor,
} from '@/types/project';
import CreateSprintModal from './CreateSprintModal';
import { getErrorMessage } from '@/utils/helpers';

interface Props {
  projectId: number;
}

export default function ProjectSprints({ projectId }: Props) {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: sprints, isLoading } = useQuery({
    queryKey: ['project-sprints', projectId],
    queryFn: () => projectService.getSprints(projectId),
  });

  const startSprintMutation = useMutation({
    mutationFn: (sprintId: number) => projectService.startSprint(projectId, sprintId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-sprints', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Sprint started');
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Failed to start sprint'));
    },
  });

  const completeSprintMutation = useMutation({
    mutationFn: (sprintId: number) => projectService.completeSprint(projectId, sprintId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-sprints', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Sprint completed');
    },
    onError: () => {
      toast.error('Failed to complete sprint');
    },
  });

  const deleteSprintMutation = useMutation({
    mutationFn: (sprintId: number) => projectService.deleteSprint(projectId, sprintId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-sprints', projectId] });
      toast.success('Sprint deleted');
    },
    onError: () => {
      toast.error('Failed to delete sprint');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const activeSprints = sprints?.filter((s: Sprint) => s.status === SprintStatus.ACTIVE) || [];
  const planningSprints = sprints?.filter((s: Sprint) => s.status === SprintStatus.PLANNING) || [];
  const completedSprints = sprints?.filter((s: Sprint) => s.status === SprintStatus.COMPLETED) || [];

  const renderSprint = (sprint: Sprint) => {
    const progress = sprint.task_count > 0
      ? Math.round((sprint.completed_task_count / sprint.task_count) * 100)
      : 0;

    return (
      <div
        key={sprint.id}
        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {sprint.name}
              </h3>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs ${getSprintStatusColor(sprint.status)}`}>
                {sprint.status}
              </span>
            </div>
            {sprint.goal && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <Target className="w-4 h-4 inline mr-1" />
                {sprint.goal}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {sprint.status === SprintStatus.PLANNING && (
              <button
                onClick={() => startSprintMutation.mutate(sprint.id)}
                disabled={startSprintMutation.isPending}
                className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
              >
                <Play className="w-4 h-4 mr-1" />
                Start Sprint
              </button>
            )}
            {sprint.status === SprintStatus.ACTIVE && (
              <button
                onClick={() => completeSprintMutation.mutate(sprint.id)}
                disabled={completeSprintMutation.isPending}
                className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Complete Sprint
              </button>
            )}
            <button
              onClick={() => {
                if (confirm('Are you sure you want to delete this sprint? Tasks will be moved to backlog.')) {
                  deleteSprintMutation.mutate(sprint.id);
                }
              }}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 hover:text-red-500"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dates */}
        <div className="flex items-center gap-6 mb-4 text-sm text-gray-600 dark:text-gray-400">
          {sprint.start_date && (
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>
                {format(new Date(sprint.start_date), 'MMM d')}
                {sprint.end_date && ` - ${format(new Date(sprint.end_date), 'MMM d, yyyy')}`}
              </span>
            </div>
          )}
          {sprint.started_at && (
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>Started {format(new Date(sprint.started_at), 'MMM d')}</span>
            </div>
          )}
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-600 dark:text-gray-400">
              {sprint.completed_task_count} of {sprint.task_count} tasks complete
            </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {progress}%
            </span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {sprint.task_count}
            </div>
            <div className="text-xs text-gray-500">Tasks</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
            <div className="text-2xl font-bold text-green-600">
              {sprint.completed_task_count}
            </div>
            <div className="text-xs text-gray-500">Completed</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
            <div className="text-2xl font-bold text-blue-600">
              {sprint.total_story_points}
            </div>
            <div className="text-xs text-gray-500">Story Points</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 h-full overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Sprints</h2>
          <p className="text-sm text-gray-500">Manage your project sprints</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create Sprint
        </button>
      </div>

      {/* Active Sprints */}
      {activeSprints.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
            Active Sprint
          </h3>
          <div className="space-y-4">
            {activeSprints.map(renderSprint)}
          </div>
        </div>
      )}

      {/* Planning Sprints */}
      {planningSprints.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
            Planning ({planningSprints.length})
          </h3>
          <div className="space-y-4">
            {planningSprints.map(renderSprint)}
          </div>
        </div>
      )}

      {/* Completed Sprints */}
      {completedSprints.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
            Completed ({completedSprints.length})
          </h3>
          <div className="space-y-4">
            {completedSprints.map(renderSprint)}
          </div>
        </div>
      )}

      {/* Empty state */}
      {(!sprints || sprints.length === 0) && (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No sprints yet
          </h3>
          <p className="text-gray-500 mb-4">
            Create your first sprint to start organizing your work
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Sprint
          </button>
        </div>
      )}

      {/* Create Sprint Modal */}
      {showCreateModal && (
        <CreateSprintModal
          projectId={projectId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            queryClient.invalidateQueries({ queryKey: ['project-sprints', projectId] });
          }}
        />
      )}
    </div>
  );
}
