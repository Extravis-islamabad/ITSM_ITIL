import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Users, Check, CheckCheck } from 'lucide-react';
import { Conversation, getAvatarUrl } from '../../../services/chatService';

interface ConversationListProps {
  conversations: Conversation[];
  selectedId?: number;
  onSelect: (conversation: Conversation) => void;
  currentUserId: number;
  isLoading?: boolean;
}

const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedId,
  onSelect,
  currentUserId,
  isLoading,
}) => {
  const getConversationName = (conversation: Conversation): string => {
    if (conversation.name) return conversation.name;
    if (conversation.conversation_type === 'direct') {
      const otherParticipant = conversation.participants.find((p) => p.id !== currentUserId);
      return otherParticipant?.full_name || 'Unknown User';
    }
    return 'Group Chat';
  };

  const getConversationAvatar = (conversation: Conversation): string | undefined => {
    if (conversation.avatar_url) return getAvatarUrl(conversation.avatar_url);
    if (conversation.conversation_type === 'direct') {
      const otherParticipant = conversation.participants.find((p) => p.id !== currentUserId);
      return getAvatarUrl(otherParticipant?.avatar_url);
    }
    return undefined;
  };

  const isOtherUserOnline = (conversation: Conversation): boolean => {
    if (conversation.conversation_type === 'direct') {
      const otherParticipant = conversation.participants.find((p) => p.id !== currentUserId);
      return otherParticipant?.is_online || false;
    }
    return false;
  };

  const getLastMessagePreview = (conversation: Conversation): string => {
    if (!conversation.last_message) return 'No messages yet';
    if (conversation.last_message.is_deleted) return 'Message deleted';

    const prefix = conversation.last_message.sender_id === currentUserId
      ? 'You: '
      : conversation.conversation_type === 'group'
      ? `${conversation.last_message.sender_name.split(' ')[0]}: `
      : '';

    const content = conversation.last_message.content ||
      (conversation.last_message.attachments?.length ? 'Sent an attachment' : 'Message');

    return `${prefix}${content}`;
  };

  const formatTime = (dateString?: string): string => {
    if (!dateString) return '';
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: false });
    } catch {
      return '';
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 animate-pulse">
            <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="flex-1">
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
              <div className="h-3 w-36 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="h-16 w-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3">
          <Users className="h-8 w-8 text-gray-400" />
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          No conversations yet
        </p>
        <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
          Start a new conversation to begin chatting
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-700">
      {conversations.map((conversation) => {
        const isSelected = selectedId === conversation.id;
        const hasUnread = conversation.unread_count > 0;
        const avatarUrl = getConversationAvatar(conversation);
        const isOnline = isOtherUserOnline(conversation);

        return (
          <button
            key={conversation.id}
            onClick={() => onSelect(conversation)}
            className={`w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left ${
              isSelected ? 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-50 dark:hover:bg-blue-900/20' : ''
            }`}
          >
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                  {conversation.conversation_type === 'group' ? (
                    <Users className="h-6 w-6" />
                  ) : (
                    getConversationName(conversation).substring(0, 2).toUpperCase()
                  )}
                </div>
              )}
              {/* Online indicator */}
              {conversation.conversation_type === 'direct' && isOnline && (
                <div className="absolute bottom-0 right-0 h-3.5 w-3.5 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`font-medium truncate ${
                    hasUnread
                      ? 'text-gray-900 dark:text-white'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {getConversationName(conversation)}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                  {formatTime(conversation.last_message_at || conversation.created_at)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <p
                  className={`text-sm truncate ${
                    hasUnread
                      ? 'text-gray-900 dark:text-gray-200 font-medium'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {getLastMessagePreview(conversation)}
                </p>
                {hasUnread ? (
                  <span className="flex-shrink-0 h-5 min-w-[1.25rem] px-1.5 bg-blue-600 text-white text-xs font-medium rounded-full flex items-center justify-center">
                    {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                  </span>
                ) : conversation.last_message?.sender_id === currentUserId ? (
                  <span className="flex-shrink-0 text-gray-400 dark:text-gray-500">
                    {conversation.last_message?.is_read ? (
                      <CheckCheck className="h-4 w-4 text-blue-500" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </span>
                ) : null}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default ConversationList;
