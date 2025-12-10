import axiosInstance from '@/lib/axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
const BASE_URL = API_URL.replace('/api/v1', '');

// Helper to get full avatar URL
export const getAvatarUrl = (avatarPath?: string): string | undefined => {
  if (!avatarPath) return undefined;
  // If it's already a full URL, return as-is
  if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
    return avatarPath;
  }
  // Otherwise, prepend the base URL
  return `${BASE_URL}${avatarPath}`;
};

// Types
export interface Participant {
  id: number;
  full_name: string;
  avatar_url?: string;
  is_online: boolean;
  is_admin: boolean;
}

export interface Attachment {
  id: number;
  file_name: string;
  file_type: string;
  file_size: number;
  file_path: string;
  thumbnail_path?: string;
  created_at: string;
}

export interface ReactionSummary {
  emoji: string;
  count: number;
  users: string[];
  reacted_by_me: boolean;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_name: string;
  sender_avatar?: string;
  content?: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  reply_to_id?: number;
  reply_to?: Message;
  is_edited: boolean;
  edited_at?: string;
  is_deleted: boolean;
  created_at: string;
  attachments: Attachment[];
  reactions: ReactionSummary[];
  is_read: boolean;
  read_by: number[];
}

export interface Conversation {
  id: number;
  conversation_type: 'direct' | 'group';
  name?: string;
  description?: string;
  avatar_url?: string;
  created_by_id: number;
  created_at: string;
  updated_at?: string;
  last_message_at?: string;
  participants: Participant[];
  unread_count: number;
  last_message?: Message;
}

export interface ConversationListResponse {
  items: Conversation[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface MessageListResponse {
  items: Message[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_more: boolean;
}

export interface CreateConversationData {
  conversation_type: 'direct' | 'group';
  name?: string;
  description?: string;
  participant_ids: number[];
}

export interface SendMessageData {
  content?: string;
  message_type?: 'text' | 'image' | 'file' | 'system';
  reply_to_id?: number;
}

export const chatService = {
  // Conversations
  getConversations: async (page = 1, pageSize = 20): Promise<ConversationListResponse> => {
    const response = await axiosInstance.get<ConversationListResponse>(
      '/chat/conversations',
      { params: { page, page_size: pageSize } }
    );
    return response.data;
  },

  getConversation: async (conversationId: number): Promise<Conversation> => {
    const response = await axiosInstance.get<Conversation>(
      `/chat/conversations/${conversationId}`
    );
    return response.data;
  },

  createConversation: async (data: CreateConversationData): Promise<Conversation> => {
    const response = await axiosInstance.post<Conversation>(
      '/chat/conversations',
      data
    );
    return response.data;
  },

  updateConversation: async (
    conversationId: number,
    data: { name?: string; description?: string }
  ): Promise<Conversation> => {
    const response = await axiosInstance.put<Conversation>(
      `/chat/conversations/${conversationId}`,
      data
    );
    return response.data;
  },

  // Messages
  getMessages: async (
    conversationId: number,
    page = 1,
    pageSize = 50
  ): Promise<MessageListResponse> => {
    const response = await axiosInstance.get<MessageListResponse>(
      `/chat/conversations/${conversationId}/messages`,
      { params: { page, page_size: pageSize } }
    );
    return response.data;
  },

  sendMessage: async (
    conversationId: number,
    data: SendMessageData
  ): Promise<Message> => {
    const response = await axiosInstance.post<Message>(
      `/chat/conversations/${conversationId}/messages`,
      data
    );
    return response.data;
  },

  editMessage: async (messageId: number, content: string): Promise<Message> => {
    const response = await axiosInstance.put<Message>(
      `/chat/messages/${messageId}`,
      { content }
    );
    return response.data;
  },

  deleteMessage: async (messageId: number): Promise<void> => {
    await axiosInstance.delete(`/chat/messages/${messageId}`);
  },

  // Attachments
  uploadAttachment: async (
    conversationId: number,
    messageId: number,
    file: File
  ): Promise<Attachment> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axiosInstance.post<Attachment>(
      `/chat/conversations/${conversationId}/messages/${messageId}/attachments`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  sendMessageWithAttachments: async (
    conversationId: number,
    content: string | undefined,
    files: File[]
  ): Promise<Message> => {
    const formData = new FormData();
    if (content) {
      formData.append('content', content);
    }
    formData.append('message_type', files.length > 0 ? 'file' : 'text');
    files.forEach((file) => {
      formData.append('files', file);
    });
    const response = await axiosInstance.post<Message>(
      `/chat/conversations/${conversationId}/messages/with-attachments`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  // Reactions
  addReaction: async (messageId: number, emoji: string): Promise<void> => {
    await axiosInstance.post(`/chat/messages/${messageId}/reactions`, { emoji });
  },

  removeReaction: async (messageId: number, emoji: string): Promise<void> => {
    await axiosInstance.delete(
      `/chat/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`
    );
  },

  // Read receipts
  markAsRead: async (conversationId: number, messageId: number): Promise<void> => {
    await axiosInstance.post(
      `/chat/conversations/${conversationId}/messages/${messageId}/read`,
      {}
    );
  },

  // Participants
  addParticipants: async (
    conversationId: number,
    userIds: number[]
  ): Promise<Conversation> => {
    const response = await axiosInstance.post<Conversation>(
      `/chat/conversations/${conversationId}/participants`,
      { user_ids: userIds }
    );
    return response.data;
  },

  removeParticipant: async (
    conversationId: number,
    userId: number
  ): Promise<void> => {
    await axiosInstance.delete(
      `/chat/conversations/${conversationId}/participants/${userId}`
    );
  },

  leaveConversation: async (conversationId: number): Promise<void> => {
    await axiosInstance.post(`/chat/conversations/${conversationId}/leave`, {});
  },

  // Online status
  getOnlineUsers: async (userIds: number[]): Promise<Record<number, boolean>> => {
    const response = await axiosInstance.post<Record<number, boolean>>(
      '/chat/users/online-status',
      { user_ids: userIds }
    );
    return response.data;
  },

  // Search users for new conversation
  searchUsers: async (query: string): Promise<Participant[]> => {
    if (!query || query.length < 1) return [];
    const response = await axiosInstance.get<Participant[]>(
      '/chat/users/search',
      { params: { q: query } }
    );
    return response.data;
  },

  // Get WebSocket URL
  getWebSocketUrl: (): string => {
    const token = localStorage.getItem('access_token');
    const wsBase = API_URL.replace('http', 'ws').replace('/api/v1', '');
    return `${wsBase}/api/v1/chat/ws/${token}`;
  },
};

export default chatService;
