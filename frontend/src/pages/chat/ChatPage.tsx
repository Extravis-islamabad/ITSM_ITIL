import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare,
  Search,
  Plus,
  Users,
  Settings,
  MoreVertical,
  Phone,
  Video,
  Info,
  ArrowLeft,
} from 'lucide-react';
import chatService, { Conversation, Message, getAvatarUrl } from '../../services/chatService';
import useWebSocket from '../../hooks/useWebSocket';
import { useAuth } from '../../hooks/useAuth';
import ConversationList from './components/ConversationList';
import MessageThread from './components/MessageThread';
import MessageInput from './components/MessageInput';
import NewConversationModal from './components/NewConversationModal';
import ConversationInfo from './components/ConversationInfo';

const ChatPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [showConversationInfo, setShowConversationInfo] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);

  // Handle responsive view
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // WebSocket connection
  const {
    isConnected,
    subscribeToConversation,
    unsubscribeFromConversation,
    sendTyping,
    typingUsers,
  } = useWebSocket({
    onMessage: (message) => {
      // Handle incoming messages
      if (message.type === 'new_message' && message.conversation_id) {
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
        queryClient.invalidateQueries({ queryKey: ['messages', message.conversation_id] });
      }
    },
  });

  // Fetch conversations
  const {
    data: conversationsData,
    isLoading: conversationsLoading,
  } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => chatService.getConversations(1, 100),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Subscribe to selected conversation
  useEffect(() => {
    if (selectedConversation && isConnected) {
      subscribeToConversation(selectedConversation.id);
      return () => {
        unsubscribeFromConversation(selectedConversation.id);
      };
    }
  }, [selectedConversation, isConnected, subscribeToConversation, unsubscribeFromConversation]);

  // Handle conversation selection
  const handleSelectConversation = useCallback((conversation: Conversation) => {
    setSelectedConversation(conversation);
    setShowConversationInfo(false);
  }, []);

  // Get conversation display name
  const getConversationName = (conversation: Conversation): string => {
    if (conversation.name) return conversation.name;
    if (conversation.conversation_type === 'direct') {
      const otherParticipant = conversation.participants.find((p) => p.id !== user?.id);
      return otherParticipant?.full_name || 'Unknown User';
    }
    return 'Group Chat';
  };

  // Get conversation avatar
  const getConversationAvatar = (conversation: Conversation): string | undefined => {
    if (conversation.avatar_url) return getAvatarUrl(conversation.avatar_url);
    if (conversation.conversation_type === 'direct') {
      const otherParticipant = conversation.participants.find((p) => p.id !== user?.id);
      return getAvatarUrl(otherParticipant?.avatar_url);
    }
    return undefined;
  };

  // Check if other user is online (for direct messages)
  const isOtherUserOnline = (conversation: Conversation): boolean => {
    if (conversation.conversation_type === 'direct') {
      const otherParticipant = conversation.participants.find((p) => p.id !== user?.id);
      return otherParticipant?.is_online || false;
    }
    return conversation.participants.some((p) => p.id !== user?.id && p.is_online);
  };

  // Filter conversations by search
  const filteredConversations = conversationsData?.items.filter((conv) => {
    if (!searchQuery) return true;
    const name = getConversationName(conv).toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  }) || [];

  // Get typing users for selected conversation
  const currentTypingUsers = selectedConversation
    ? Array.from(typingUsers[selectedConversation.id] || [])
    : [];

  const typingUserNames = currentTypingUsers
    .filter((id) => id !== user?.id)
    .map((id) => {
      const participant = selectedConversation?.participants.find((p) => p.id === id);
      return participant?.full_name || 'Someone';
    });

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900 -m-6">
      {/* Conversation List Sidebar */}
      <div
        className={`${
          isMobileView && selectedConversation ? 'hidden' : 'flex'
        } flex-col w-full md:w-80 lg:w-96 flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-blue-600" />
            Messages
          </h1>
          <button
            onClick={() => setShowNewConversation(true)}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="New conversation"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white placeholder-gray-500"
            />
          </div>
        </div>

        {/* Connection status */}
        {!isConnected && (
          <div className="mx-3 mb-2 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs rounded-lg flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
            Connecting...
          </div>
        )}

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          <ConversationList
            conversations={filteredConversations}
            selectedId={selectedConversation?.id}
            onSelect={handleSelectConversation}
            currentUserId={user?.id || 0}
            isLoading={conversationsLoading}
          />
        </div>
      </div>

      {/* Chat Area */}
      <div
        className={`${
          isMobileView && !selectedConversation ? 'hidden' : 'flex'
        } flex-1 flex-col min-w-0 overflow-hidden bg-gray-50 dark:bg-gray-900`}
      >
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                {isMobileView && (
                  <button
                    onClick={() => setSelectedConversation(null)}
                    className="p-1 -ml-1 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                )}
                <div className="relative">
                  {getConversationAvatar(selectedConversation) ? (
                    <img
                      src={getConversationAvatar(selectedConversation)}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                      {selectedConversation.conversation_type === 'group' ? (
                        <Users className="h-5 w-5" />
                      ) : (
                        getConversationName(selectedConversation).substring(0, 2).toUpperCase()
                      )}
                    </div>
                  )}
                  {selectedConversation.conversation_type === 'direct' &&
                    isOtherUserOnline(selectedConversation) && (
                      <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full" />
                    )}
                </div>
                <div>
                  <h2 className="font-medium text-gray-900 dark:text-white">
                    {getConversationName(selectedConversation)}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {typingUserNames.length > 0
                      ? `${typingUserNames.join(', ')} ${typingUserNames.length === 1 ? 'is' : 'are'} typing...`
                      : selectedConversation.conversation_type === 'group'
                      ? `${selectedConversation.participants.length} members`
                      : isOtherUserOnline(selectedConversation)
                      ? 'Online'
                      : 'Offline'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowConversationInfo(!showConversationInfo)}
                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Info className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <MessageThread
              conversationId={selectedConversation.id}
              currentUserId={user?.id || 0}
              participants={selectedConversation.participants}
            />

            {/* Message Input */}
            <MessageInput
              conversationId={selectedConversation.id}
              onTyping={(isTyping) => sendTyping(selectedConversation.id, isTyping)}
            />
          </>
        ) : (
          // Empty state
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="h-20 w-20 mx-auto bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                Your Messages
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Select a conversation or start a new one
              </p>
              <button
                onClick={() => setShowNewConversation(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                New Conversation
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Conversation Info Sidebar */}
      {showConversationInfo && selectedConversation && (
        <ConversationInfo
          conversation={selectedConversation}
          currentUserId={user?.id || 0}
          onClose={() => setShowConversationInfo(false)}
        />
      )}

      {/* New Conversation Modal */}
      {showNewConversation && (
        <NewConversationModal
          onClose={() => setShowNewConversation(false)}
          onConversationCreated={(conv) => {
            setShowNewConversation(false);
            setSelectedConversation(conv);
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
          }}
        />
      )}
    </div>
  );
};

export default ChatPage;
