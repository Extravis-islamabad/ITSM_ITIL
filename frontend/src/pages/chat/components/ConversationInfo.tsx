import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X,
  Users,
  UserPlus,
  LogOut,
  Trash2,
  Crown,
  Search,
  Check,
  Loader2,
} from 'lucide-react';
import chatService, { Conversation, getAvatarUrl } from '../../../services/chatService';
import { User } from '../../../types';
import { useQuery } from '@tanstack/react-query';
import { userService } from '../../../services/userService';

interface ConversationInfoProps {
  conversation: Conversation;
  currentUserId: number;
  onClose: () => void;
}

const ConversationInfo: React.FC<ConversationInfoProps> = ({
  conversation,
  currentUserId,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(conversation.name || '');
  const [newDescription, setNewDescription] = useState(conversation.description || '');

  const isGroup = conversation.conversation_type === 'group';
  const isAdmin = conversation.created_by_id === currentUserId;

  // Fetch users for adding members
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => userService.getUsers({ page: 1, page_size: 100 }),
    enabled: showAddMembers,
  });

  // Update conversation mutation
  const updateMutation = useMutation({
    mutationFn: () =>
      chatService.updateConversation(conversation.id, {
        name: newName,
        description: newDescription,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setEditingName(false);
    },
  });

  // Add participants mutation
  const addParticipantsMutation = useMutation({
    mutationFn: (userIds: number[]) =>
      chatService.addParticipants(conversation.id, userIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setShowAddMembers(false);
      setSelectedUsers([]);
    },
  });

  // Remove participant mutation
  const removeParticipantMutation = useMutation({
    mutationFn: (userId: number) =>
      chatService.removeParticipant(conversation.id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  // Leave conversation mutation
  const leaveMutation = useMutation({
    mutationFn: () => chatService.leaveConversation(conversation.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      onClose();
    },
  });

  // Filter users for adding (exclude existing participants)
  const existingParticipantIds = conversation.participants.map((p) => p.id);
  const availableUsers = usersData?.items.filter(
    (user: User) => !existingParticipantIds.includes(user.id)
  ).filter((user: User) => {
    if (!searchQuery) return true;
    return user.full_name.toLowerCase().includes(searchQuery.toLowerCase());
  }) || [];

  // Toggle user selection for adding
  const toggleUserSelection = (userId: number) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  // Handle add members
  const handleAddMembers = () => {
    if (selectedUsers.length > 0) {
      addParticipantsMutation.mutate(selectedUsers);
    }
  };

  return (
    <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          {isGroup ? 'Group Info' : 'Chat Info'}
        </h3>
        <button
          onClick={onClose}
          className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Group/User avatar and name */}
        <div className="p-6 text-center border-b border-gray-200 dark:border-gray-700">
          {conversation.avatar_url && (
            <img
              src={getAvatarUrl(conversation.avatar_url)}
              alt=""
              className="h-20 w-20 mx-auto rounded-full object-cover mb-4"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fallback = e.currentTarget.nextElementSibling;
                if (fallback) fallback.classList.remove('hidden');
              }}
            />
          )}
          <div className={`h-20 w-20 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-medium mb-4 ${conversation.avatar_url ? 'hidden' : ''}`}>
            {isGroup ? (
              <Users className="h-10 w-10" />
            ) : (
              (conversation.name || 'Chat').substring(0, 2).toUpperCase()
            )}
          </div>

          {editingName && isGroup && isAdmin ? (
            <div className="space-y-3">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg text-center dark:text-white focus:ring-2 focus:ring-blue-500"
                placeholder="Group name"
              />
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg text-center text-sm dark:text-white focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Description"
                rows={2}
              />
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => setEditingName(false)}
                  className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={() => updateMutation.mutate()}
                  disabled={updateMutation.isPending}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <h4 className="font-semibold text-lg text-gray-900 dark:text-white">
                {conversation.name || 'Direct Message'}
              </h4>
              {conversation.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {conversation.description}
                </p>
              )}
              {isGroup && isAdmin && (
                <button
                  onClick={() => setEditingName(true)}
                  className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Edit
                </button>
              )}
            </>
          )}
        </div>

        {/* Members section (for groups) */}
        {isGroup && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h5 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <Users className="h-4 w-4" />
                Members ({conversation.participants.length})
              </h5>
              {isAdmin && (
                <button
                  onClick={() => setShowAddMembers(!showAddMembers)}
                  className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                  title="Add members"
                >
                  <UserPlus className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Add members section */}
            {showAddMembers && (
              <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search users..."
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-gray-700 border-0 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:text-white"
                  />
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1">
                  {availableUsers.map((user: User) => (
                    <button
                      key={user.id}
                      onClick={() => toggleUserSelection(user.id)}
                      className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs">
                        {user.full_name.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="flex-1 text-left text-sm text-gray-900 dark:text-white">
                        {user.full_name}
                      </span>
                      <div
                        className={`h-5 w-5 rounded-full flex items-center justify-center ${
                          selectedUsers.includes(user.id)
                            ? 'bg-blue-600 text-white'
                            : 'border border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        {selectedUsers.includes(user.id) && (
                          <Check className="h-3 w-3" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                {selectedUsers.length > 0 && (
                  <button
                    onClick={handleAddMembers}
                    disabled={addParticipantsMutation.isPending}
                    className="w-full mt-3 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {addParticipantsMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                    ) : (
                      `Add ${selectedUsers.length} member${selectedUsers.length > 1 ? 's' : ''}`
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Members list */}
            <div className="space-y-1">
              {conversation.participants.map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <div className="relative">
                    {participant.avatar_url && (
                      <img
                        src={getAvatarUrl(participant.avatar_url)}
                        alt=""
                        className="h-9 w-9 rounded-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling;
                          if (fallback) fallback.classList.remove('hidden');
                        }}
                      />
                    )}
                    <div className={`h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium ${participant.avatar_url ? 'hidden' : ''}`}>
                      {participant.full_name.substring(0, 2).toUpperCase()}
                    </div>
                    {participant.is_online && (
                      <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-900 dark:text-white truncate">
                        {participant.full_name}
                        {participant.id === currentUserId && ' (You)'}
                      </span>
                      {participant.id === conversation.created_by_id && (
                        <Crown className="h-3.5 w-3.5 text-yellow-500" />
                      )}
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {participant.is_online ? 'Online' : 'Offline'}
                    </span>
                  </div>

                  {isAdmin && participant.id !== currentUserId && (
                    <button
                      onClick={() => {
                        if (confirm(`Remove ${participant.full_name} from the group?`)) {
                          removeParticipantMutation.mutate(participant.id);
                        }
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                      title="Remove member"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          {isGroup && (
            <button
              onClick={() => {
                if (confirm('Are you sure you want to leave this group?')) {
                  leaveMutation.mutate();
                }
              }}
              disabled={leaveMutation.isPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              {leaveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              Leave Group
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationInfo;
