import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardBody } from '@/components/common/Card';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal';
import {
  UserGroupIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UserPlusIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import axiosInstance from '@/lib/axios';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

interface Group {
  id: number;
  name: string;
  description: string | null;
  lead_id: number | null;
  lead_name: string | null;
  is_active: boolean;
  member_count: number;
  created_at: string;
  members?: Array<{
    id: number;
    full_name: string;
    email: string;
    role: string | null;
  }>;
}

interface User {
  id: number;
  full_name: string;
  email: string;
}

interface GroupFormData {
  name: string;
  description?: string;
  lead_id?: number;
}

export default function GroupsPage() {
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<GroupFormData>();

  // Fetch groups
  const { data: groups, isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const res = await axiosInstance.get('/groups');
      return res.data as Group[];
    }
  });

  // Fetch users for lead selection
  const { data: users } = useQuery({
    queryKey: ['users-for-groups'],
    queryFn: async () => {
      const res = await axiosInstance.get('/users?page_size=500');
      return res.data.items as User[];
    }
  });

  // Fetch group details with members
  const { data: groupDetails } = useQuery({
    queryKey: ['group-details', selectedGroup?.id],
    queryFn: async () => {
      if (!selectedGroup) return null;
      const res = await axiosInstance.get(`/groups/${selectedGroup.id}`);
      return res.data as Group;
    },
    enabled: !!selectedGroup && isMembersModalOpen
  });

  // Create group mutation
  const createMutation = useMutation({
    mutationFn: async (data: GroupFormData) => {
      const res = await axiosInstance.post('/groups', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast.success('Group created successfully');
      setIsCreateModalOpen(false);
      reset();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to create group');
    }
  });

  // Update group mutation
  const updateMutation = useMutation({
    mutationFn: async (data: GroupFormData) => {
      const res = await axiosInstance.put(`/groups/${selectedGroup?.id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast.success('Group updated successfully');
      setIsEditModalOpen(false);
      setSelectedGroup(null);
      reset();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update group');
    }
  });

  // Delete group mutation
  const deleteMutation = useMutation({
    mutationFn: async (groupId: number) => {
      await axiosInstance.delete(`/groups/${groupId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast.success('Group deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete group');
    }
  });

  // Add members mutation
  const addMembersMutation = useMutation({
    mutationFn: async ({ groupId, userIds }: { groupId: number; userIds: number[] }) => {
      await axiosInstance.post(`/groups/${groupId}/members`, { user_ids: userIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['group-details'] });
      toast.success('Members added successfully');
      setSelectedMembers([]);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to add members');
    }
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: number; userId: number }) => {
      await axiosInstance.delete(`/groups/${groupId}/members/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['group-details'] });
      toast.success('Member removed successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to remove member');
    }
  });

  const onSubmitCreate = (data: GroupFormData) => {
    createMutation.mutate(data);
  };

  const onSubmitEdit = (data: GroupFormData) => {
    updateMutation.mutate(data);
  };

  const handleEdit = (group: Group) => {
    setSelectedGroup(group);
    reset({
      name: group.name,
      description: group.description || '',
      lead_id: group.lead_id || undefined
    });
    setIsEditModalOpen(true);
  };

  const handleManageMembers = (group: Group) => {
    setSelectedGroup(group);
    setIsMembersModalOpen(true);
  };

  const handleDelete = (group: Group) => {
    if (confirm(`Are you sure you want to delete "${group.name}"?`)) {
      deleteMutation.mutate(group.id);
    }
  };

  const handleAddMembers = () => {
    if (selectedGroup && selectedMembers.length > 0) {
      addMembersMutation.mutate({ groupId: selectedGroup.id, userIds: selectedMembers });
    }
  };

  const handleRemoveMember = (userId: number) => {
    if (selectedGroup && confirm('Remove this member from the group?')) {
      removeMemberMutation.mutate({ groupId: selectedGroup.id, userId });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Support Groups</h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure support groups and teams
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Create Group
        </Button>
      </div>

      {groups && groups.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <Card key={group.id} className="hover:shadow-lg transition-shadow">
              <CardBody>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary-100 rounded-lg">
                      <UserGroupIcon className="h-6 w-6 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{group.name}</h3>
                      <p className="text-sm text-gray-500">{group.member_count} members</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    group.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {group.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {group.description && (
                  <p className="mt-3 text-sm text-gray-600">{group.description}</p>
                )}

                {group.lead_name && (
                  <p className="mt-2 text-sm text-gray-500">
                    Lead: <span className="font-medium text-gray-700">{group.lead_name}</span>
                  </p>
                )}

                <div className="mt-4 pt-4 border-t flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleManageMembers(group)}>
                    <UserPlusIcon className="h-4 w-4 mr-1" />
                    Members
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleEdit(group)}>
                    <PencilIcon className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => handleDelete(group)}>
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardBody>
            <div className="text-center py-12">
              <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No groups</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a support group.
              </p>
              <Button className="mt-4" onClick={() => setIsCreateModalOpen(true)}>
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Group
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Create Group Modal */}
      <Modal
        open={isCreateModalOpen}
        onClose={() => { setIsCreateModalOpen(false); reset(); }}
        title="Create Support Group"
      >
        <form onSubmit={handleSubmit(onSubmitCreate)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              {...register('name', { required: 'Name is required' })}
              className="mt-1 form-input"
              placeholder="e.g., Network Support"
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              {...register('description')}
              className="mt-1 form-input"
              rows={3}
              placeholder="Describe the group's responsibilities..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Group Lead</label>
            <select {...register('lead_id')} className="mt-1 form-select">
              <option value="">Select a lead (optional)</option>
              {users?.map((user) => (
                <option key={user.id} value={user.id}>{user.full_name}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => { setIsCreateModalOpen(false); reset(); }}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Create Group
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Group Modal */}
      <Modal
        open={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); setSelectedGroup(null); reset(); }}
        title="Edit Support Group"
      >
        <form onSubmit={handleSubmit(onSubmitEdit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              {...register('name', { required: 'Name is required' })}
              className="mt-1 form-input"
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              {...register('description')}
              className="mt-1 form-input"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Group Lead</label>
            <select {...register('lead_id')} className="mt-1 form-select">
              <option value="">Select a lead (optional)</option>
              {users?.map((user) => (
                <option key={user.id} value={user.id}>{user.full_name}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => { setIsEditModalOpen(false); setSelectedGroup(null); reset(); }}>
              Cancel
            </Button>
            <Button type="submit" isLoading={updateMutation.isPending}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Members Modal */}
      <Modal
        open={isMembersModalOpen}
        onClose={() => { setIsMembersModalOpen(false); setSelectedGroup(null); setSelectedMembers([]); }}
        title={`Manage Members - ${selectedGroup?.name}`}
        size="lg"
      >
        <div className="space-y-6">
          {/* Add Members Section */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Add Members</h4>
            <div className="flex gap-2">
              <select
                multiple
                value={selectedMembers.map(String)}
                onChange={(e) => setSelectedMembers(Array.from(e.target.selectedOptions, o => parseInt(o.value)))}
                className="flex-1 form-select h-32"
              >
                {users?.filter(u => !groupDetails?.members?.some(m => m.id === u.id)).map((user) => (
                  <option key={user.id} value={user.id}>{user.full_name} ({user.email})</option>
                ))}
              </select>
              <Button
                onClick={handleAddMembers}
                disabled={selectedMembers.length === 0}
                isLoading={addMembersMutation.isPending}
              >
                Add
              </Button>
            </div>
            <p className="mt-1 text-xs text-gray-500">Hold Ctrl/Cmd to select multiple</p>
          </div>

          {/* Current Members */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Current Members ({groupDetails?.members?.length || 0})</h4>
            <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
              {groupDetails?.members?.length ? (
                groupDetails.members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 hover:bg-gray-50">
                    <div>
                      <p className="font-medium text-gray-900">{member.full_name}</p>
                      <p className="text-sm text-gray-500">{member.email}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="text-red-600 hover:text-red-700 p-1"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-gray-500">No members yet</div>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => { setIsMembersModalOpen(false); setSelectedGroup(null); setSelectedMembers([]); }}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
