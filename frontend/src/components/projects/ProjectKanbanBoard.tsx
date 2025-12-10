import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import projectService from '@/services/projectService';
import {
  Task,
  BoardColumn,
  Sprint,
  TaskStatus,
  getColumnColor,
} from '@/types/project';
import TaskCard from './TaskCard';
import TaskDetailModal from './TaskDetailModal';

interface Props {
  projectId: number;
  columns: BoardColumn[];
  activeSprint?: Sprint;
}

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
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
    },
    onError: () => {
      toast.error('Failed to move task');
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

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden flex flex-col">
      {/* Sprint info bar */}
      {activeSprint ? (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="font-medium text-blue-900 dark:text-blue-100">
                {activeSprint.name}
              </span>
              {activeSprint.goal && (
                <span className="text-sm text-blue-700 dark:text-blue-300">
                  Goal: {activeSprint.goal}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-blue-700 dark:text-blue-300">
                {activeSprint.completed_task_count} / {activeSprint.task_count} tasks
              </span>
              <span className="text-blue-700 dark:text-blue-300">
                {activeSprint.completed_story_points} / {activeSprint.total_story_points} points
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 px-6 py-3">
          <span className="text-yellow-800 dark:text-yellow-200 text-sm">
            No active sprint. Go to Sprints tab to start one.
          </span>
        </div>
      )}

      {/* Kanban columns */}
      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex gap-4 h-full min-w-max">
          {columns.map((column) => (
            <div
              key={column.id}
              className={`w-80 flex-shrink-0 flex flex-col bg-gray-100 dark:bg-gray-900 rounded-lg ${
                dragOverColumn === column.status_key
                  ? 'ring-2 ring-primary-500'
                  : ''
              }`}
              onDragOver={(e) => handleDragOver(e, column.status_key)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.status_key)}
            >
              {/* Column header */}
              <div className="px-3 py-2 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getColumnColor(column.color)}`} />
                  <span className="font-medium text-gray-900 dark:text-white">
                    {column.name}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
                    {tasksByStatus[column.status_key]?.length || 0}
                  </span>
                </div>
              </div>

              {/* Tasks container */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {tasksByStatus[column.status_key]?.map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task)}
                    onDragEnd={handleDragEnd}
                    className={`cursor-grab active:cursor-grabbing ${
                      draggedTask?.id === task.id ? 'opacity-50' : ''
                    }`}
                  >
                    <TaskCard
                      task={task}
                      onClick={() => setSelectedTaskId(task.id)}
                    />
                  </div>
                ))}

                {tasksByStatus[column.status_key]?.length === 0 && (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    No tasks
                  </div>
                )}
              </div>
            </div>
          ))}
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
    </div>
  );
}
