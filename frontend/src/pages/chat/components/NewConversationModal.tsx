import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  X,
  Search,
  Users,
  User,
  Check,
  Loader2,
  MessageSquare,
} from 'lucide-react';
import chatService, { Conversation, Participant, getAvatarUrl } from '../../../services/chatService';
import { userService } from '../../../services/userService';
import { useDebounce } from '../../../hooks/useDebounce';

interface NewConversationModalProps {
  onClose: () => void;
  onConversationCreated: (conversation: Conversation) => void;
}

const NewConversationModal: React.FC<NewConversationModalProps> = ({
  onClose,
  onConversationCreated,
}) => {
  const [conversationType, setConversationType] = useState<'direct' | 'group'>('direct');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Participant[]>([]);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Fetch users - use search if there's a query, otherwise get all users
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users', debouncedSearch],
    queryFn: async () => {
      if (debouncedSearch && debouncedSearch.length >= 1) {
        return { items: await chatService.searchUsers(debouncedSearch) };
      }
      return userService.getUsers(1, 100);
    },
  });

  // Create conversation mutation
  const createMutation = useMutation({
    mutationFn: () =>
      chatService.createConversation({
        conversation_type: conversationType,
        name: conversationType === 'group' ? groupName : undefined,
        description: conversationType === 'group' ? groupDescription : undefined,
        participant_ids: selectedUsers.map((u) => u.id),
      }),
    onSuccess: (conversation) => {
      onConversationCreated(conversation);
    },
  });

  // Users from query (already filtered by API if search query exists)
  const filteredUsers = usersData?.items || [];

  // Toggle user selection
  const toggleUserSelection = (user: any) => {
    const participant: Participant = {
      id: user.id,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      is_online: false,
      is_admin: false,
    };

    if (conversationType === 'direct') {
      setSelectedUsers([participant]);
    } else {
      const isSelected = selectedUsers.some((u) => u.id === user.id);
      if (isSelected) {
        setSelectedUsers(selectedUsers.filter((u) => u.id !== user.id));
      } else {
        setSelectedUsers([...selectedUsers, participant]);
      }
    }
  };

  // Check if user is selected
  const isUserSelected = (userId: number) => {
    return selectedUsers.some((u) => u.id === userId);
  };

  // Handle create
  const handleCreate = () => {
    if (selectedUsers.length === 0) return;
    if (conversationType === 'group' && !groupName.trim()) return;
    createMutation.mutate();
  };

  // Can create conversation
  const canCreate =
    selectedUsers.length > 0 &&
    (conversationType === 'direct' || (conversationType === 'group' && groupName.trim()));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            New Conversation
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Conversation type toggle */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => {
                setConversationType('direct');
                setSelectedUsers([]);
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-colors ${
                conversationType === 'direct'
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
            >
              <User className="h-5 w-5" />
              <span className="font-medium">Direct Message</span>
            </button>
            <button
              onClick={() => {
                setConversationType('group');
                setSelectedUsers([]);
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-colors ${
                conversationType === 'group'
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
            >
              <Users className="h-5 w-5" />
              <span className="font-medium">Group Chat</span>
            </button>
          </div>

          {/* Group details (only for group chat) */}
          {conversationType === 'group' && (
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Group Name *
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Enter group name"
                  className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white placeholder-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  placeholder="What's this group about?"
                  rows={2}
                  className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white placeholder-gray-500 resize-none"
                />
              </div>
            </div>
          )}

          {/* Selected users */}
          {selectedUsers.length > 0 && (
            <div className="mb-4">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Selected ({selectedUsers.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full text-sm"
                  >
                    <span>{user.full_name}</span>
                    <button
                      onClick={() => toggleUserSelection(user)}
                      className="hover:text-blue-900 dark:hover:text-blue-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search users */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white placeholder-gray-500"
            />
          </div>

          {/* Users list */}
          <div className="max-h-64 overflow-y-auto -mx-6 px-6">
            {usersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No users found
              </div>
            ) : (
              <div className="space-y-1">
                {filteredUsers.map((user) => {
                  const isSelected = isUserSelected(user.id);
                  return (
                    <button
                      key={user.id}
                      onClick={() => toggleUserSelection(user)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-900/30'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {/* Avatar */}
                      {user.avatar_url ? (
                        <img
                          src={getAvatarUrl(user.avatar_url)}
                          alt=""
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                          {user.full_name.substring(0, 2).toUpperCase()}
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 text-left">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {user.full_name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {user.email}
                        </div>
                      </div>

                      {/* Selection indicator */}
                      <div
                        className={`h-6 w-6 rounded-full flex items-center justify-center ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'border-2 border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        {isSelected && <Check className="h-4 w-4" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!canCreate || createMutation.isPending}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MessageSquare className="h-4 w-4" />
            )}
            {conversationType === 'direct' ? 'Start Chat' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewConversationModal;
