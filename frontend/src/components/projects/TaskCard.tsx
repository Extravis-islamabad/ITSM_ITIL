import {
  CheckSquare,
  Bug,
  Star,
  TrendingUp,
  BookOpen,
  MessageSquare,
} from 'lucide-react';
import {
  Task,
  TaskType,
  TaskPriority,
  getTaskTypeColor,
} from '@/types/project';

interface Props {
  task: Task;
  onClick: () => void;
}

const TaskTypeIcon = ({ type }: { type: TaskType }) => {
  const iconProps = { className: 'w-4 h-4' };

  switch (type) {
    case TaskType.BUG:
      return <Bug {...iconProps} />;
    case TaskType.FEATURE:
      return <Star {...iconProps} />;
    case TaskType.IMPROVEMENT:
      return <TrendingUp {...iconProps} />;
    case TaskType.STORY:
      return <BookOpen {...iconProps} />;
    default:
      return <CheckSquare {...iconProps} />;
  }
};

const getPriorityIndicator = (priority: TaskPriority) => {
  const colors: Record<TaskPriority, string> = {
    [TaskPriority.LOW]: 'bg-gray-400',
    [TaskPriority.MEDIUM]: 'bg-blue-500',
    [TaskPriority.HIGH]: 'bg-orange-500',
    [TaskPriority.CRITICAL]: 'bg-red-500',
  };
  return colors[priority] || 'bg-gray-400';
};

export default function TaskCard({ task, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3 cursor-pointer hover:shadow-md hover:border-primary-500 transition-all"
    >
      {/* Task type and priority indicator */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs ${getTaskTypeColor(task.task_type)}`}>
            <TaskTypeIcon type={task.task_type} />
          </span>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {task.task_number}
          </span>
        </div>
        <div className={`w-2 h-2 rounded-full ${getPriorityIndicator(task.priority)}`} title={task.priority} />
      </div>

      {/* Title */}
      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2 line-clamp-2">
        {task.title}
      </h4>

      {/* Footer */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          {/* Story points */}
          {task.story_points && (
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-xs font-medium text-gray-600 dark:text-gray-300">
              {task.story_points}
            </span>
          )}

          {/* Comments count */}
          {task.comment_count > 0 && (
            <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <MessageSquare className="w-3 h-3" />
              {task.comment_count}
            </span>
          )}

          {/* Subtasks count */}
          {task.subtask_count > 0 && (
            <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <CheckSquare className="w-3 h-3" />
              {task.subtask_count}
            </span>
          )}
        </div>

        {/* Assignee */}
        {task.assignee && (
          <div
            className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-xs font-medium text-primary-700 dark:text-primary-300"
            title={task.assignee.full_name}
          >
            {task.assignee.full_name.charAt(0)}
          </div>
        )}
      </div>

      {/* Due date warning */}
      {task.due_date && new Date(task.due_date) < new Date() && task.status !== 'DONE' && (
        <div className="mt-2 text-xs text-red-600 dark:text-red-400">
          Overdue
        </div>
      )}
    </div>
  );
}
