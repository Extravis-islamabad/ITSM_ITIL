import {
  CheckCircleIcon,
  BugAntIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  BookOpenIcon,
  ChatBubbleLeftIcon,
  UserCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import {
  Task,
  TaskType,
  TaskPriority,
  getTaskTypeColor,
} from '@/types/project';
import { formatRelativeTime } from '@/utils/helpers';

interface Props {
  task: Task;
  onClick: () => void;
  isDragging?: boolean;
}

const TaskTypeIcon = ({ type }: { type: TaskType }) => {
  const iconProps = { className: 'w-4 h-4' };

  switch (type) {
    case TaskType.BUG:
      return <BugAntIcon {...iconProps} />;
    case TaskType.FEATURE:
      return <SparklesIcon {...iconProps} />;
    case TaskType.IMPROVEMENT:
      return <ArrowTrendingUpIcon {...iconProps} />;
    case TaskType.STORY:
      return <BookOpenIcon {...iconProps} />;
    default:
      return <CheckCircleIcon {...iconProps} />;
  }
};

const getPriorityIndicator = (priority: TaskPriority) => {
  const colors: Record<TaskPriority, string> = {
    [TaskPriority.CRITICAL]: 'bg-red-500',
    [TaskPriority.HIGH]: 'bg-orange-500',
    [TaskPriority.MEDIUM]: 'bg-yellow-500',
    [TaskPriority.LOW]: 'bg-green-500',
  };
  return colors[priority] || 'bg-gray-400';
};

const getPriorityBadge = (priority: TaskPriority) => {
  const styles: Record<TaskPriority, string> = {
    [TaskPriority.CRITICAL]: 'text-red-700 bg-red-50',
    [TaskPriority.HIGH]: 'text-orange-700 bg-orange-50',
    [TaskPriority.MEDIUM]: 'text-yellow-700 bg-yellow-50',
    [TaskPriority.LOW]: 'text-green-700 bg-green-50',
  };
  return styles[priority] || 'text-gray-700 bg-gray-50';
};

export default function TaskCard({ task, onClick, isDragging }: Props) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'DONE';

  return (
    <div
      onClick={onClick}
      className={`group bg-white rounded-xl border border-gray-200 p-4 cursor-pointer
        hover:shadow-lg hover:border-gray-300 hover:-translate-y-0.5
        transition-all duration-200 ease-out
        ${isDragging ? 'opacity-50 scale-95' : ''}
      `}
    >
      {/* Task type and ID */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getTaskTypeColor(task.task_type)}`}>
            <TaskTypeIcon type={task.task_type} />
            {task.task_type}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className={`w-2 h-2 rounded-full ${getPriorityIndicator(task.priority)}`}
            title={task.priority}
          />
          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${getPriorityBadge(task.priority)}`}>
            {task.priority}
          </span>
        </div>
      </div>

      {/* Task number */}
      <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
        {task.task_number}
      </span>

      {/* Title */}
      <h4 className="font-medium text-gray-900 text-sm mt-2 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
        {task.title}
      </h4>

      {/* Stats row */}
      <div className="flex items-center gap-3 mb-3">
        {/* Story points */}
        {task.story_points && (
          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-primary-50 text-xs font-bold text-primary-700">
            {task.story_points} pts
          </span>
        )}

        {/* Comments count */}
        {task.comment_count > 0 && (
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <ChatBubbleLeftIcon className="w-3.5 h-3.5" />
            {task.comment_count}
          </span>
        )}

        {/* Subtasks count */}
        {task.subtask_count > 0 && (
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <CheckCircleIcon className="w-3.5 h-3.5" />
            {task.subtask_count}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          {task.assignee ? (
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-xs font-medium text-primary-700">
                  {task.assignee.full_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-xs text-gray-600 truncate max-w-[80px]">
                {task.assignee.full_name.split(' ')[0]}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-gray-400">
              <UserCircleIcon className="w-5 h-5" />
              <span className="text-xs italic">Unassigned</span>
            </div>
          )}
        </div>
        {task.created_at && (
          <span className="text-xs text-gray-400">
            {formatRelativeTime(task.created_at)}
          </span>
        )}
      </div>

      {/* Overdue Warning */}
      {isOverdue && (
        <div className="mt-2 flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
          <ExclamationTriangleIcon className="w-3 h-3" />
          Overdue
        </div>
      )}
    </div>
  );
}
