import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Settings,
  Users,
  Columns,
  Plus,
  Trash2,
  GripVertical,
  UserPlus,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import projectService from '@/services/projectService';
import { userService } from '@/services/userService';
import {
  ProjectDetail,
  ProjectMemberRole,
  ProjectStatus,
  getColumnColor,
  getMemberRoleColor,
} from '@/types/project';

interface Props {
  project: ProjectDetail;
}

export default function ProjectSettings({ project }: Props) {
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<'general' | 'columns' | 'members'>('general');
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newColumn, setNewColumn] = useState({ name: '', status_key: '', color: 'gray' });
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState<ProjectMemberRole>(ProjectMemberRole.MEMBER);

  const { data: usersData } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => userService.getUsers({ page_size: 100 }),
  });

  const users = usersData?.items || [];
  const existingMemberIds = project.members?.map(m => m.user_id) || [];
  const availableUsers = users.filter((u: any) => !existingMemberIds.includes(u.id));

  // Mutations
  const updateProjectMutation = useMutation({
    mutationFn: (data: any) => projectService.updateProject(project.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', project.id] });
      toast.success('Project updated');
    },
    onError: () => {
      toast.error('Failed to update project');
    },
  });

  const addColumnMutation = useMutation({
    mutationFn: (data: any) => projectService.createBoardColumn(project.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', project.id] });
      setShowAddColumn(false);
      setNewColumn({ name: '', status_key: '', color: 'gray' });
      toast.success('Column added');
    },
    onError: () => {
      toast.error('Failed to add column');
    },
  });

  const deleteColumnMutation = useMutation({
    mutationFn: (columnId: number) => projectService.deleteBoardColumn(project.id, columnId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', project.id] });
      toast.success('Column deleted');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete column');
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: (data: any) => projectService.addProjectMember(project.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', project.id] });
      setShowAddMember(false);
      setSelectedUserId(null);
      toast.success('Member added');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to add member');
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: number) => projectService.removeProjectMember(project.id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', project.id] });
      toast.success('Member removed');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to remove member');
    },
  });

  const handleAddColumn = () => {
    if (!newColumn.name || !newColumn.status_key) {
      toast.error('Name and status key are required');
      return;
    }
    addColumnMutation.mutate(newColumn);
  };

  const handleAddMember = () => {
    if (!selectedUserId) {
      toast.error('Select a user');
      return;
    }
    addMemberMutation.mutate({ user_id: selectedUserId, role: selectedRole });
  };

  const colors = ['gray', 'blue', 'yellow', 'purple', 'green', 'red', 'orange', 'indigo', 'pink', 'cyan'];

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="max-w-4xl mx-auto">
        {/* Navigation */}
        <div className="flex items-center gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveSection('general')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeSection === 'general'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Settings className="w-4 h-4 inline mr-2" />
            General
          </button>
          <button
            onClick={() => setActiveSection('columns')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeSection === 'columns'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Columns className="w-4 h-4 inline mr-2" />
            Board Columns
          </button>
          <button
            onClick={() => setActiveSection('members')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeSection === 'members'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Members
          </button>
        </div>

        {/* General Settings */}
        {activeSection === 'general' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Project Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Project Key
                </label>
                <input
                  type="text"
                  value={project.project_key}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-900 text-gray-500"
                />
                <p className="text-xs text-gray-500 mt-1">Project key cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  defaultValue={project.name}
                  onBlur={(e) => {
                    if (e.target.value !== project.name) {
                      updateProjectMutation.mutate({ name: e.target.value });
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  defaultValue={project.description || ''}
                  onBlur={(e) => {
                    if (e.target.value !== project.description) {
                      updateProjectMutation.mutate({ description: e.target.value });
                    }
                  }}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={project.status}
                  onChange={(e) => updateProjectMutation.mutate({ status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {Object.values(ProjectStatus).map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Board Columns */}
        {activeSection === 'columns' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Board Columns</h3>
              <button
                onClick={() => setShowAddColumn(true)}
                className="inline-flex items-center px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Column
              </button>
            </div>

            {showAddColumn && (
              <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <input
                    type="text"
                    placeholder="Column Name"
                    value={newColumn.name}
                    onChange={(e) => setNewColumn({ ...newColumn, name: e.target.value })}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Status Key (e.g., REVIEW)"
                    value={newColumn.status_key}
                    onChange={(e) => setNewColumn({ ...newColumn, status_key: e.target.value.toUpperCase() })}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm uppercase"
                  />
                  <select
                    value={newColumn.color}
                    onChange={(e) => setNewColumn({ ...newColumn, color: e.target.value })}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                  >
                    {colors.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAddColumn}
                    disabled={addColumnMutation.isPending}
                    className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setShowAddColumn(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {project.columns?.map((column) => (
                <div
                  key={column.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-4 h-4 text-gray-400" />
                    <div className={`w-4 h-4 rounded ${getColumnColor(column.color)}`} />
                    <span className="font-medium text-gray-900 dark:text-white">{column.name}</span>
                    <span className="text-xs text-gray-500 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">
                      {column.status_key}
                    </span>
                    {column.is_default && (
                      <span className="text-xs text-blue-600 bg-blue-100 dark:bg-blue-900 px-2 py-0.5 rounded">
                        Default
                      </span>
                    )}
                    {column.is_done_column && (
                      <span className="text-xs text-green-600 bg-green-100 dark:bg-green-900 px-2 py-0.5 rounded">
                        Done
                      </span>
                    )}
                  </div>
                  {!column.is_default && (
                    <button
                      onClick={() => {
                        if (confirm('Delete this column?')) {
                          deleteColumnMutation.mutate(column.id);
                        }
                      }}
                      className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Members */}
        {activeSection === 'members' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Team Members ({project.members?.length || 0})
              </h3>
              <button
                onClick={() => setShowAddMember(true)}
                className="inline-flex items-center px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700"
              >
                <UserPlus className="w-4 h-4 mr-1" />
                Add Member
              </button>
            </div>

            {showAddMember && (
              <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <select
                    value={selectedUserId || ''}
                    onChange={(e) => setSelectedUserId(Number(e.target.value))}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                  >
                    <option value="">Select a user</option>
                    {availableUsers.map((user: any) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name} ({user.email})
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as ProjectMemberRole)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                  >
                    {Object.values(ProjectMemberRole).map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAddMember}
                    disabled={addMemberMutation.isPending}
                    className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setShowAddMember(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {project.members?.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-sm font-medium text-primary-700 dark:text-primary-300">
                      {member.user?.full_name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {member.user?.full_name || 'Unknown'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {member.user?.email}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs ${getMemberRoleColor(member.role)}`}>
                      {member.role}
                    </span>
                    {member.role !== ProjectMemberRole.OWNER && (
                      <button
                        onClick={() => {
                          if (confirm('Remove this member?')) {
                            removeMemberMutation.mutate(member.user_id);
                          }
                        }}
                        className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
