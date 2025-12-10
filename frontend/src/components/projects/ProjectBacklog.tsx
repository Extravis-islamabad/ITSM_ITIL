import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, CheckSquare } from 'lucide-react';
import { toast } from 'react-hot-toast';
import projectService from '@/services/projectService';
import {
  Task,
  TaskStatus,
  TaskPriority,
  getTaskStatusColor,
  getTaskPriorityColor,
  getTaskTypeColor,
  formatTaskStatus,
} from '@/types/project';
import CreateTaskModal from './CreateTaskModal';
import TaskDetailModal from './TaskDetailModal';

interface Props {
  projectId: number;
}

export default function ProjectBacklog({ projectId }: Props) {
  const queryClient = useQueryClient();
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [selectedTasks, setSelectedTasks] = useState<number[]>([]);

  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['project-backlog', projectId, search, statusFilter, priorityFilter],
    queryFn: () =>
      projectService.getTasks(projectId, {
        page_size: 100,
        in_backlog: true,
        search: search || undefined,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
      }),
  });

  const { data: sprintsData } = useQuery({
    queryKey: ['project-sprints', projectId],
    queryFn: () => projectService.getSprints(projectId),
  });

  const tasks: Task[] = tasksData?.items || [];
  const sprints = sprintsData?.filter((s: any) => s.status !== 'COMPLETED') || [];

  const bulkMoveMutation = useMutation({
    mutationFn: ({ taskIds, sprintId }: { taskIds: number[]; sprintId: number }) =>
      projectService.bulkMoveTasks(projectId, taskIds, sprintId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-backlog', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
      setSelectedTasks([]);
      toast.success('Tasks moved to sprint');
    },
    onError: () => {
      toast.error('Failed to move tasks');
    },
  });

  const toggleTaskSelection = (taskId: number) => {
    setSelectedTasks((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId]
    );
  };

  const selectAll = () => {
    if (selectedTasks.length === tasks.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(tasks.map((t) => t.id));
    }
  };

  const moveToSprint = (sprintId: number) => {
    if (selectedTasks.length === 0) {
      toast.error('Select tasks first');
      return;
    }
    bulkMoveMutation.mutate({ taskIds: selectedTasks, sprintId });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 h-full overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Backlog</h2>
          <p className="text-sm text-gray-500">{tasks.length} tasks</p>
        </div>
        <button
          onClick={() => setShowCreateTask(true)}
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create Task
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="">All Statuses</option>
          {Object.values(TaskStatus).map((status) => (
            <option key={status} value={status}>{formatTaskStatus(status)}</option>
          ))}
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="">All Priorities</option>
          {Object.values(TaskPriority).map((priority) => (
            <option key={priority} value={priority}>{priority}</option>
          ))}
        </select>
      </div>

      {/* Bulk actions */}
      {selectedTasks.length > 0 && (
        <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-4 mb-4 flex items-center justify-between">
          <span className="text-primary-800 dark:text-primary-200">
            {selectedTasks.length} tasks selected
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Move to:</span>
            {sprints.map((sprint: any) => (
              <button
                key={sprint.id}
                onClick={() => moveToSprint(sprint.id)}
                disabled={bulkMoveMutation.isPending}
                className="px-3 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {sprint.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tasks table */}
      {tasks.length === 0 ? (
        <div className="text-center py-12">
          <CheckSquare className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No tasks in backlog
          </h3>
          <p className="text-gray-500 mb-4">
            Create tasks or move items from sprints to the backlog
          </p>
          <button
            onClick={() => setShowCreateTask(true)}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Task
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedTasks.length === tasks.length && tasks.length > 0}
                    onChange={selectAll}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Key
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Title
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Priority
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Assignee
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Points
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {tasks.map((task) => (
                <tr
                  key={task.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  onClick={() => setSelectedTaskId(task.id)}
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedTasks.includes(task.id)}
                      onChange={() => toggleTaskSelection(task.id)}
                      className="rounded border-gray-300 dark:border-gray-600"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-500">
                    {task.task_number}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {task.title}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs ${getTaskTypeColor(task.task_type)}`}>
                      {task.task_type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs ${getTaskStatusColor(task.status)}`}>
                      {formatTaskStatus(task.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs ${getTaskPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {task.assignee?.full_name || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {task.story_points || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {showCreateTask && (
        <CreateTaskModal
          projectId={projectId}
          onClose={() => setShowCreateTask(false)}
          onSuccess={() => {
            setShowCreateTask(false);
            queryClient.invalidateQueries({ queryKey: ['project-backlog', projectId] });
          }}
        />
      )}

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
