import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import projectService from '@/services/projectService';
import {
  Task,
  BoardColumn,
  Sprint,
  TaskStatus,
} from '@/types/project';
import TaskCard from './TaskCard';
import TaskDetailModal from './TaskDetailModal';
import {
  ArrowPathIcon,
  ClockIcon,
  PlayIcon,
  PauseIcon,
  CheckCircleIcon,
  XCircleIcon,
  InboxIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { getErrorMessage } from '@/utils/helpers';

interface Props {
  projectId: number;
  columns: BoardColumn[];
  activeSprint?: Sprint;
}

interface KanbanColumnStyle {
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
}

const getColumnStyle = (statusKey: string, color: string): KanbanColumnStyle => {
  // Default styles based on common status names
  const statusStyles: Record<string, KanbanColumnStyle> = {
    BACKLOG: {
      color: 'text-gray-700',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      icon: <InboxIcon className="h-4 w-4" />,
    },
    TODO: {
      color: 'text-blue-700',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      icon: <ClockIcon className="h-4 w-4" />,
    },
    IN_PROGRESS: {
      color: 'text-amber-700',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      icon: <PlayIcon className="h-4 w-4" />,
    },
    IN_REVIEW: {
      color: 'text-purple-700',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      icon: <PauseIcon className="h-4 w-4" />,
    },
    DONE: {
      color: 'text-emerald-700',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      icon: <CheckCircleIcon className="h-4 w-4" />,
    },
    CANCELLED: {
      color: 'text-red-700',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      icon: <XCircleIcon className="h-4 w-4" />,
    },
  };

  // Return style based on status key or generate from color
  if (statusStyles[statusKey]) {
    return statusStyles[statusKey];
  }

  // Fallback: generate style based on column color
  const colorMap: Record<string, KanbanColumnStyle> = {
    gray: { color: 'text-gray-700', bgColor: 'bg-gray-50', borderColor: 'border-gray-200', icon: <InboxIcon className="h-4 w-4" /> },
    blue: { color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', icon: <ClockIcon className="h-4 w-4" /> },
    yellow: { color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-200', icon: <PlayIcon className="h-4 w-4" /> },
    amber: { color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-200', icon: <PlayIcon className="h-4 w-4" /> },
    purple: { color: 'text-purple-700', bgColor: 'bg-purple-50', borderColor: 'border-purple-200', icon: <PauseIcon className="h-4 w-4" /> },
    green: { color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200', icon: <CheckCircleIcon className="h-4 w-4" /> },
    emerald: { color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200', icon: <CheckCircleIcon className="h-4 w-4" /> },
    red: { color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-200', icon: <XCircleIcon className="h-4 w-4" /> },
    cyan: { color: 'text-cyan-700', bgColor: 'bg-cyan-50', borderColor: 'border-cyan-200', icon: <ArrowPathIcon className="h-4 w-4" /> },
  };

  return colorMap[color] || colorMap.gray;
};

export default function ProjectKanbanBoard({ projectId, columns, activeSprint }: Props) {
  const queryClient = useQueryClient();
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Fetch tasks for active sprint or all tasks
  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['project-tasks', projectId, activeSprint?.id],
    queryFn: () =>
      projectService.getTasks(projectId, {
        page_size: 200,
        sprint_id: activeSprint?.id,
      }),
  });

  const tasks: Task[] = tasksData?.items || [];

  // Move task mutation
  const moveTaskMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: number; status: TaskStatus }) =>
      projectService.moveTask(projectId, taskId, { status }),
    onSuccess: () => {
      toast.success('Task moved successfully');
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Failed to move task'));
    },
  });

  // Group tasks by status
  const tasksByStatus: Record<string, Task[]> = {};
  columns.forEach((col) => {
    tasksByStatus[col.status_key] = tasks.filter(
      (t) => t.status === col.status_key
    );
  });

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id.toString());
    setTimeout(() => {
      (e.target as HTMLElement).style.opacity = '0.5';
    }, 0);
  };

  const handleDragOver = (e: React.DragEvent, statusKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(statusKey);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, statusKey: string) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (draggedTask && draggedTask.status !== statusKey) {
      moveTaskMutation.mutate({
        taskId: draggedTask.id,
        status: statusKey as TaskStatus,
      });
    }
    setDraggedTask(null);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.target as HTMLElement).style.opacity = '1';
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  return (
    <div className="h-full overflow-hidden flex flex-col">
      {/* Sprint info bar */}
      {activeSprint ? (
        <div className="bg-primary-50 border-b border-primary-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <PlayIcon className="h-4 w-4 text-primary-600" />
                <span className="font-semibold text-primary-900">
                  {activeSprint.name}
                </span>
              </div>
              {activeSprint.goal && (
                <span className="text-sm text-primary-700">
                  Goal: {activeSprint.goal}
                </span>
              )}
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="h-4 w-4 text-emerald-600" />
                <span className="text-gray-700">
                  <span className="font-semibold text-emerald-600">{activeSprint.completed_task_count}</span>
                  <span className="text-gray-400"> / </span>
                  <span>{activeSprint.task_count} tasks</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-700">
                  <span className="font-semibold text-primary-600">{activeSprint.completed_story_points}</span>
                  <span className="text-gray-400"> / </span>
                  <span>{activeSprint.total_story_points} points</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3">
          <div className="flex items-center gap-2">
            <ExclamationTriangleIcon className="h-4 w-4 text-amber-600" />
            <span className="text-amber-800 text-sm">
              No active sprint. Go to Sprints tab to start one.
            </span>
          </div>
        </div>
      )}

      {/* Kanban columns */}
      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex gap-4 min-h-[600px]">
          {columns.map((column) => {
            const columnTasks = tasksByStatus[column.status_key] || [];
            const isOver = dragOverColumn === column.status_key;
            const style = getColumnStyle(column.status_key, column.color);

            return (
              <div
                key={column.id}
                className="flex-shrink-0 w-80"
                onDragOver={(e) => handleDragOver(e, column.status_key)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.status_key)}
              >
                {/* Column Header */}
                <div
                  className={`flex items-center justify-between px-4 py-3 rounded-t-xl ${style.bgColor} border ${style.borderColor} border-b-0`}
                >
                  <div className="flex items-center gap-2">
                    <span className={style.color}>{style.icon}</span>
                    <h3 className={`font-semibold ${style.color}`}>{column.name}</h3>
                  </div>
                  <span
                    className={`px-2.5 py-1 text-xs font-bold rounded-full ${style.bgColor} ${style.color} border ${style.borderColor}`}
                  >
                    {columnTasks.length}
                  </span>
                </div>

                {/* Column Body */}
                <div
                  className={`min-h-[500px] p-3 rounded-b-xl border transition-all duration-200 ${
                    isOver
                      ? `${style.bgColor} ${style.borderColor} border-2 border-dashed`
                      : 'bg-gray-50/50 border-gray-200'
                  }`}
                >
                  <div className="space-y-3">
                    {columnTasks.map((task) => (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task)}
                        onDragEnd={handleDragEnd}
                      >
                        <TaskCard
                          task={task}
                          onClick={() => setSelectedTaskId(task.id)}
                          isDragging={draggedTask?.id === task.id}
                        />
                      </div>
                    ))}

                    {columnTasks.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                        <div className={`w-12 h-12 rounded-full ${style.bgColor} flex items-center justify-center mb-2`}>
                          <span className={style.color}>{style.icon}</span>
                        </div>
                        <p className="text-sm">No tasks</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Task Detail Modal */}
      {selectedTaskId && (
        <TaskDetailModal
          projectId={projectId}
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
        />
      )}

      {/* Loading Overlay */}
      {(isLoading || moveTaskMutation.isPending) && (
        <div className="fixed inset-0 bg-black/10 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl px-6 py-4 flex items-center gap-3">
            <ArrowPathIcon className="w-5 h-5 text-primary-600 animate-spin" />
            <span className="text-gray-700">
              {isLoading ? 'Loading...' : 'Moving task...'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
