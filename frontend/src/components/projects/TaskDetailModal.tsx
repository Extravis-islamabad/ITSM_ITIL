import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X,
  CheckSquare,
  Bug,
  Star,
  TrendingUp,
  BookOpen,
  Clock,
  Calendar,
  User,
  MessageSquare,
  Paperclip,
  Send,
  Edit2,
  Trash2,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import projectService from '@/services/projectService';
import {
  TaskDetail,
  TaskType,
  TaskStatus,
  TaskPriority,
  TaskUpdate,
  getTaskStatusColor,
  getTaskPriorityColor,
  getTaskTypeColor,
  formatTaskStatus,
} from '@/types/project';

interface Props {
  projectId: number;
  taskId: number;
  onClose: () => void;
}

export default function TaskDetailModal({ projectId, taskId, onClose }: Props) {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<TaskUpdate>({});

  const { data: task, isLoading } = useQuery({
    queryKey: ['task-detail', projectId, taskId],
    queryFn: () => projectService.getTask(projectId, taskId),
  });

  const updateMutation = useMutation({
    mutationFn: (data: TaskUpdate) => projectService.updateTask(projectId, taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-detail', projectId, taskId] });
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
      setIsEditing(false);
      toast.success('Task updated');
    },
    onError: () => {
      toast.error('Failed to update task');
    },
  });

  const commentMutation = useMutation({
    mutationFn: (content: string) => projectService.addTaskComment(projectId, taskId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-detail', projectId, taskId] });
      setNewComment('');
      toast.success('Comment added');
    },
    onError: () => {
      toast.error('Failed to add comment');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => projectService.deleteTask(projectId, taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
      toast.success('Task deleted');
      onClose();
    },
    onError: () => {
      toast.error('Failed to delete task');
    },
  });

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      commentMutation.mutate(newComment.trim());
    }
  };

  if (isLoading || !task) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl mx-4 p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl mx-4 my-8">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start gap-3">
            <span className={`inline-flex items-center px-2 py-1 rounded text-sm ${getTaskTypeColor(task.task_type)}`}>
              {task.task_type}
            </span>
            <div>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {task.task_number}
              </span>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {task.title}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <Edit2 className="w-5 h-5 text-gray-500" />
            </button>
            <button
              onClick={() => {
                if (confirm('Are you sure you want to delete this task?')) {
                  deleteMutation.mutate();
                }
              }}
              className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
            >
              <Trash2 className="w-5 h-5 text-red-500" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="flex">
          {/* Main content */}
          <div className="flex-1 p-6 max-h-[70vh] overflow-y-auto">
            {/* Description */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </h3>
              <div className="text-gray-600 dark:text-gray-400 prose dark:prose-invert max-w-none">
                {task.description || <span className="italic">No description provided</span>}
              </div>
            </div>

            {/* Activity & Comments */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                Activity
              </h3>

              {/* Comment form */}
              <form onSubmit={handleSubmitComment} className="mb-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim() || commentMutation.isPending}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>

              {/* Comments list */}
              <div className="space-y-4">
                {task.comments?.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-sm font-medium">
                      {comment.user?.full_name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900 dark:text-white text-sm">
                          {comment.user?.full_name || 'Unknown'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {format(new Date(comment.created_at), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Activities */}
                {task.activities?.map((activity) => (
                  <div key={activity.id} className="flex gap-3 text-sm text-gray-500 dark:text-gray-400">
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="flex-1 py-1">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {activity.user?.full_name || 'System'}
                      </span>{' '}
                      {activity.description}{' '}
                      <span className="text-xs">
                        {format(new Date(activity.created_at), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-72 border-l border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-900">
            <div className="space-y-6">
              {/* Status */}
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Status
                </label>
                {isEditing ? (
                  <select
                    value={editData.status || task.status}
                    onChange={(e) => setEditData({ ...editData, status: e.target.value as TaskStatus })}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                  >
                    {Object.values(TaskStatus).map((s) => (
                      <option key={s} value={s}>{formatTaskStatus(s)}</option>
                    ))}
                  </select>
                ) : (
                  <div className={`mt-1 inline-flex items-center px-2.5 py-1 rounded-full text-sm ${getTaskStatusColor(task.status)}`}>
                    {formatTaskStatus(task.status)}
                  </div>
                )}
              </div>

              {/* Priority */}
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Priority
                </label>
                {isEditing ? (
                  <select
                    value={editData.priority || task.priority}
                    onChange={(e) => setEditData({ ...editData, priority: e.target.value as TaskPriority })}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                  >
                    {Object.values(TaskPriority).map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                ) : (
                  <div className={`mt-1 inline-flex items-center px-2.5 py-1 rounded-full text-sm ${getTaskPriorityColor(task.priority)}`}>
                    {task.priority}
                  </div>
                )}
              </div>

              {/* Assignee */}
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Assignee
                </label>
                <div className="mt-1 flex items-center gap-2">
                  {task.assignee ? (
                    <>
                      <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-xs font-medium text-primary-700 dark:text-primary-300">
                        {task.assignee.full_name.charAt(0)}
                      </div>
                      <span className="text-sm text-gray-900 dark:text-white">
                        {task.assignee.full_name}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-gray-500">Unassigned</span>
                  )}
                </div>
              </div>

              {/* Reporter */}
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Reporter
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs font-medium">
                    {task.reporter?.full_name?.charAt(0) || '?'}
                  </div>
                  <span className="text-sm text-gray-900 dark:text-white">
                    {task.reporter?.full_name || 'Unknown'}
                  </span>
                </div>
              </div>

              {/* Story Points */}
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Story Points
                </label>
                {isEditing ? (
                  <input
                    type="number"
                    value={editData.story_points ?? task.story_points ?? ''}
                    onChange={(e) => setEditData({ ...editData, story_points: e.target.value ? Number(e.target.value) : undefined })}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                    min="0"
                  />
                ) : (
                  <div className="mt-1 text-sm text-gray-900 dark:text-white">
                    {task.story_points ?? '-'}
                  </div>
                )}
              </div>

              {/* Due Date */}
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Due Date
                </label>
                <div className="mt-1 text-sm text-gray-900 dark:text-white">
                  {task.due_date ? format(new Date(task.due_date), 'MMM d, yyyy') : '-'}
                </div>
              </div>

              {/* Created */}
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Created
                </label>
                <div className="mt-1 text-sm text-gray-900 dark:text-white">
                  {format(new Date(task.created_at), 'MMM d, yyyy h:mm a')}
                </div>
              </div>

              {/* Save button when editing */}
              {isEditing && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => updateMutation.mutate(editData)}
                    disabled={updateMutation.isPending}
                    className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  >
                    {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
