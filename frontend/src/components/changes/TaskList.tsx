import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';
import Button from '@/components/common/Button';
import { Plus, Trash2, Check, Clock, User } from 'lucide-react';
import toast from 'react-hot-toast';

interface Task {
  id: number;
  title: string;
  description?: string;
  status: string;
  sequence: number;
  assigned_to?: {
    id: number;
    full_name: string;
  };
  completed_at?: string;
}

interface TaskListProps {
  changeId: number;
  tasks: Task[];
  canEdit: boolean;
}

export default function TaskList({ changeId, tasks, canEdit }: TaskListProps) {
  const queryClient = useQueryClient();
  const [newTask, setNewTask] = useState({ title: '', description: '' });
  const [showAddForm, setShowAddForm] = useState(false);

  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      const res = await axiosInstance.post(`/changes/${changeId}/tasks`, taskData);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Task added successfully');
      // Use String(changeId) to match query key format from useParams()
      queryClient.invalidateQueries({ queryKey: ['change', String(changeId)] });
      queryClient.invalidateQueries({ queryKey: ['change-progress', String(changeId)] });
      setNewTask({ title: '', description: '' });
      setShowAddForm(false);
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, data }: { taskId: number; data: any }) => {
      const res = await axiosInstance.put(`/changes/tasks/${taskId}`, data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Task updated successfully');
      queryClient.invalidateQueries({ queryKey: ['change', String(changeId)] });
      queryClient.invalidateQueries({ queryKey: ['change-progress', String(changeId)] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      await axiosInstance.delete(`/changes/tasks/${taskId}`);
    },
    onSuccess: () => {
      toast.success('Task deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['change', String(changeId)] });
      queryClient.invalidateQueries({ queryKey: ['change-progress', String(changeId)] });
    },
  });

  const handleAddTask = () => {
    if (!newTask.title.trim()) {
      toast.error('Task title is required');
      return;
    }
    createTaskMutation.mutate({
      title: newTask.title,
      description: newTask.description || null,
      sequence: tasks.length,
    });
  };

  const toggleTaskStatus = (task: Task) => {
    const newStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    updateTaskMutation.mutate({
      taskId: task.id,
      data: { status: newStatus },
    });
  };

  const sortedTasks = [...tasks].sort((a, b) => a.sequence - b.sequence);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Implementation Tasks</h3>
        {canEdit && !showAddForm && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        )}
      </div>

      {/* Add Task Form */}
      {showAddForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <h4 className="text-sm font-semibold text-gray-900 mb-4">New Task</h4>
          <div className="space-y-4">
            <div>
              <label htmlFor="task-title" className="block text-sm font-medium text-gray-700 mb-1">
                Task Title <span className="text-red-500">*</span>
              </label>
              <input
                id="task-title"
                type="text"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                placeholder="Enter task title"
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="task-description" className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-gray-400 text-xs font-normal">(Optional)</span>
              </label>
              <textarea
                id="task-description"
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                placeholder="Enter task description"
                rows={3}
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAddForm(false);
                  setNewTask({ title: '', description: '' });
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleAddTask}
                disabled={createTaskMutation.isPending}
              >
                {createTaskMutation.isPending ? 'Adding...' : 'Add Task'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Task List */}
      <div className="space-y-2">
        {sortedTasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="h-12 w-12 mx-auto mb-2 text-gray-400" />
            <p>No tasks added yet</p>
          </div>
        ) : (
          sortedTasks.map((task, index) => (
            <div
              key={task.id}
              className={`border rounded-lg p-4 transition-all ${
                task.status === 'COMPLETED'
                  ? 'bg-green-50 border-green-200'
                  : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-200 text-gray-700 text-xs font-medium flex items-center justify-center">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4
                        className={`font-medium ${
                          task.status === 'COMPLETED'
                            ? 'text-green-700 line-through'
                            : 'text-gray-900'
                        }`}
                      >
                        {task.title}
                      </h4>
                      {task.status === 'COMPLETED' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          <Check className="h-3 w-3 mr-1" />
                          Completed
                        </span>
                      )}
                    </div>
                    {task.description && (
                      <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                    )}
                    {task.assigned_to && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <User className="h-3 w-3" />
                        <span>{task.assigned_to.full_name}</span>
                      </div>
                    )}
                  </div>
                </div>

                {canEdit && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleTaskStatus(task)}
                      className={`p-2 rounded-lg transition-colors ${
                        task.status === 'COMPLETED'
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      title={task.status === 'COMPLETED' ? 'Mark as pending' : 'Mark as completed'}
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this task?')) {
                          deleteTaskMutation.mutate(task.id);
                        }
                      }}
                      className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                      title="Delete task"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}