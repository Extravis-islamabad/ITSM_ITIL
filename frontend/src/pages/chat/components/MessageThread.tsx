import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import {
  Check,
  CheckCheck,
  MoreHorizontal,
  Reply,
  Pencil,
  Trash2,
  Smile,
  Download,
  FileText,
  Image as ImageIcon,
  X,
  Loader2,
} from 'lucide-react';
import chatService, { Message, Participant, getAvatarUrl } from '../../../services/chatService';
import EmojiPicker from './EmojiPicker';

interface MessageThreadProps {
  conversationId: number;
  currentUserId: number;
  participants: Participant[];
}

const MessageThread: React.FC<MessageThreadProps> = ({
  conversationId,
  currentUserId,
  participants,
}) => {
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedMessage, setSelectedMessage] = useState<number | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState<number | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  // Fetch messages
  const {
    data: messagesData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['messages', conversationId],
    queryFn: ({ pageParam = 1 }) => chatService.getMessages(conversationId, pageParam, 50),
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
  });

  // Flatten messages from all pages (backend returns oldest first, which is correct for display)
  const messages = messagesData?.pages.flatMap((page) => page.items) || [];

  // Edit message mutation
  const editMutation = useMutation({
    mutationFn: ({ messageId, content }: { messageId: number; content: string }) =>
      chatService.editMessage(messageId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      setEditingMessage(null);
      setEditContent('');
    },
  });

  // Delete message mutation
  const deleteMutation = useMutation({
    mutationFn: (messageId: number) => chatService.deleteMessage(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
    },
  });

  // Add reaction mutation
  const addReactionMutation = useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: number; emoji: string }) =>
      chatService.addReaction(messageId, emoji),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      setShowEmojiPicker(null);
    },
  });

  // Remove reaction mutation
  const removeReactionMutation = useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: number; emoji: string }) =>
      chatService.removeReaction(messageId, emoji),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
    },
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (messageId: number) => chatService.markAsRead(conversationId, messageId),
    onSuccess: () => {
      // Refresh conversations to update unread count
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // Mark messages as read - track last marked message to prevent duplicate calls
  const lastMarkedMessageRef = useRef<number | null>(null);

  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      // Mark the last message as read if:
      // 1. We haven't already marked this exact message (prevent duplicate API calls)
      // 2. The message exists
      if (lastMarkedMessageRef.current !== lastMessage.id) {
        lastMarkedMessageRef.current = lastMessage.id;
        markAsReadMutation.mutate(lastMessage.id);
      }
    }
  }, [messages.length]); // Only depend on messages.length

  // Handle scroll for infinite loading
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop } = containerRef.current;
    if (scrollTop < 100 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Format message time
  const formatMessageTime = (dateString: string): string => {
    const date = new Date(dateString);
    return format(date, 'HH:mm');
  };

  // Format date separator
  const formatDateSeparator = (dateString: string): string => {
    const date = new Date(dateString);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMMM d, yyyy');
  };

  // Check if should show date separator
  const shouldShowDateSeparator = (index: number): boolean => {
    if (index === 0) return true;
    const currentDate = new Date(messages[index].created_at);
    const prevDate = new Date(messages[index - 1].created_at);
    return !isSameDay(currentDate, prevDate);
  };

  // Get participant info
  const getParticipant = (userId: number): Participant | undefined => {
    return participants.find((p) => p.id === userId);
  };

  // Handle edit submit
  const handleEditSubmit = () => {
    if (editingMessage && editContent.trim()) {
      editMutation.mutate({ messageId: editingMessage.id, content: editContent.trim() });
    }
  };

  // Handle reaction toggle
  const handleReactionToggle = (messageId: number, emoji: string, isReacted: boolean) => {
    if (isReacted) {
      removeReactionMutation.mutate({ messageId, emoji });
    } else {
      addReactionMutation.mutate({ messageId, emoji });
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4 py-2 space-y-1"
    >
      {/* Load more indicator */}
      {isFetchingNextPage && (
        <div className="flex justify-center py-2">
          <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
        </div>
      )}

      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <p className="text-gray-500 dark:text-gray-400">No messages yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Send a message to start the conversation
          </p>
        </div>
      ) : (
        messages.map((message, index) => {
          const isOwn = message.sender_id === currentUserId;
          const showDateSeparator = shouldShowDateSeparator(index);
          const sender = getParticipant(message.sender_id);
          const isConsecutive =
            index > 0 &&
            messages[index - 1].sender_id === message.sender_id &&
            !showDateSeparator;

          return (
            <React.Fragment key={message.id}>
              {/* Date separator */}
              {showDateSeparator && (
                <div className="flex items-center justify-center py-3">
                  <div className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs px-3 py-1 rounded-full">
                    {formatDateSeparator(message.created_at)}
                  </div>
                </div>
              )}

              {/* Message */}
              <div
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${
                  isConsecutive ? 'mt-0.5' : 'mt-3'
                }`}
              >
                <div
                  className={`relative group max-w-[75%] ${isOwn ? 'order-2' : 'order-1'}`}
                >
                  {/* Avatar (only for non-consecutive messages from others) */}
                  {!isOwn && !isConsecutive && (
                    <div className="absolute -left-10 top-0">
                      {sender?.avatar_url ? (
                        <img
                          src={getAvatarUrl(sender.avatar_url)}
                          alt=""
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium">
                          {sender?.full_name?.substring(0, 2).toUpperCase() || '??'}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Message content */}
                  <div
                    className={`relative ${
                      isOwn
                        ? 'bg-blue-600 text-white rounded-2xl rounded-br-md'
                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl rounded-bl-md shadow-sm border border-gray-100 dark:border-gray-700'
                    } px-4 py-2`}
                    onMouseEnter={() => setSelectedMessage(message.id)}
                    onMouseLeave={() => setSelectedMessage(null)}
                  >
                    {/* Sender name (for group chats) */}
                    {!isOwn && !isConsecutive && sender && (
                      <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
                        {sender.full_name}
                      </div>
                    )}

                    {/* Reply preview */}
                    {message.reply_to && (
                      <div
                        className={`text-xs mb-2 p-2 rounded-lg ${
                          isOwn
                            ? 'bg-blue-500/30 border-l-2 border-blue-300'
                            : 'bg-gray-100 dark:bg-gray-700 border-l-2 border-blue-500'
                        }`}
                      >
                        <div className="font-medium opacity-80">
                          {message.reply_to.sender_name}
                        </div>
                        <div className="opacity-70 truncate">
                          {message.reply_to.content || 'Attachment'}
                        </div>
                      </div>
                    )}

                    {/* Editing state */}
                    {editingMessage?.id === message.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full p-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={2}
                          autoFocus
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingMessage(null);
                              setEditContent('');
                            }}
                            className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleEditSubmit}
                            disabled={editMutation.isPending}
                            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                          >
                            {editMutation.isPending ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Deleted message */}
                        {message.is_deleted ? (
                          <p className="italic opacity-60 text-sm">
                            This message was deleted
                          </p>
                        ) : (
                          <>
                            {/* Message text */}
                            {message.content && (
                              <p className="text-sm whitespace-pre-wrap break-words">
                                {message.content}
                              </p>
                            )}

                            {/* Attachments */}
                            {message.attachments && message.attachments.length > 0 && (
                              <div className="mt-2 space-y-2">
                                {message.attachments.map((attachment) => (
                                  <div
                                    key={attachment.id}
                                    className={`flex items-center gap-2 p-2 rounded-lg ${
                                      isOwn
                                        ? 'bg-blue-500/30'
                                        : 'bg-gray-100 dark:bg-gray-700'
                                    }`}
                                  >
                                    {attachment.file_type.startsWith('image/') ? (
                                      <ImageIcon className="h-5 w-5 flex-shrink-0" />
                                    ) : (
                                      <FileText className="h-5 w-5 flex-shrink-0" />
                                    )}
                                    <span className="text-sm truncate flex-1">
                                      {attachment.file_name}
                                    </span>
                                    <a
                                      href={attachment.file_path}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1 hover:bg-white/20 rounded"
                                    >
                                      <Download className="h-4 w-4" />
                                    </a>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}

                        {/* Time and status */}
                        <div
                          className={`flex items-center gap-1 mt-1 text-xs ${
                            isOwn ? 'text-blue-200' : 'text-gray-400'
                          }`}
                        >
                          <span>{formatMessageTime(message.created_at)}</span>
                          {message.is_edited && (
                            <span className="opacity-70">(edited)</span>
                          )}
                          {isOwn && !message.is_deleted && (
                            <span className="ml-1">
                              {message.read_by.length > 0 ? (
                                <CheckCheck className="h-3.5 w-3.5" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )}
                            </span>
                          )}
                        </div>
                      </>
                    )}

                    {/* Reactions */}
                    {message.reactions && message.reactions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {message.reactions.map((reaction) => (
                          <button
                            key={reaction.emoji}
                            onClick={() =>
                              handleReactionToggle(
                                message.id,
                                reaction.emoji,
                                reaction.reacted_by_me
                              )
                            }
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                              reaction.reacted_by_me
                                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                                : isOwn
                                ? 'bg-blue-500/30 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                            } hover:scale-105 transition-transform`}
                            title={reaction.users.join(', ')}
                          >
                            <span>{reaction.emoji}</span>
                            <span>{reaction.count}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Actions menu */}
                    {selectedMessage === message.id &&
                      !message.is_deleted &&
                      !editingMessage && (
                        <div
                          className={`absolute ${
                            isOwn ? 'left-0 -translate-x-full pr-2' : 'right-0 translate-x-full pl-2'
                          } top-1/2 -translate-y-1/2 flex items-center gap-1`}
                        >
                          <button
                            onClick={() => setShowEmojiPicker(message.id)}
                            className="p-1.5 bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-full shadow-lg hover:scale-110 transition-transform"
                            title="Add reaction"
                          >
                            <Smile className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setReplyingTo(message)}
                            className="p-1.5 bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-full shadow-lg hover:scale-110 transition-transform"
                            title="Reply"
                          >
                            <Reply className="h-4 w-4" />
                          </button>
                          {isOwn && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingMessage(message);
                                  setEditContent(message.content || '');
                                }}
                                className="p-1.5 bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-full shadow-lg hover:scale-110 transition-transform"
                                title="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Delete this message?')) {
                                    deleteMutation.mutate(message.id);
                                  }
                                }}
                                className="p-1.5 bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-full shadow-lg hover:scale-110 transition-transform"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      )}

                    {/* Emoji picker */}
                    {showEmojiPicker === message.id && (
                      <div
                        className={`absolute z-50 ${
                          isOwn ? 'right-0' : 'left-0'
                        } bottom-full mb-2`}
                      >
                        <EmojiPicker
                          onSelect={(emoji) => {
                            addReactionMutation.mutate({ messageId: message.id, emoji });
                          }}
                          onClose={() => setShowEmojiPicker(null)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })
      )}

      <div ref={messagesEndRef} />

      {/* Reply preview bar */}
      {replyingTo && (
        <div className="fixed bottom-20 left-0 right-0 mx-4 md:ml-80 lg:ml-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 flex items-center gap-3 border border-gray-200 dark:border-gray-700">
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
              Replying to {replyingTo.sender_name}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {replyingTo.content || 'Attachment'}
            </div>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default MessageThread;
