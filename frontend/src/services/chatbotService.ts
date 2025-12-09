import axiosInstance from '@/lib/axios';

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  message_type: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface ChatConversation {
  id: number;
  session_id: string;
  status: string;
  issue_summary?: string;
  resolution_provided: boolean;
  ticket_id?: number;
  sentiment?: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at?: string;
}

export interface ChatSuggestion {
  type: string;
  text: string;
  action?: string;
}

export interface KBArticleRef {
  id: number;
  title: string;
  slug?: string;
  relevance_score: number;
}

export interface ChatbotResponse {
  message: ChatMessage;
  suggestions: ChatSuggestion[];
  can_create_ticket: boolean;
  sentiment?: string;
  session_id: string;
  conversation_id: number;
  kb_articles: KBArticleRef[];
  source: 'knowledge_base' | 'openai' | 'fallback';
}

export interface SendMessageRequest {
  content: string;
  session_id?: string;
}

export interface CreateTicketFromChatRequest {
  conversation_id: number;
  title?: string;
  additional_notes?: string;
  priority?: string;
  category_id?: number;
}

export interface KBSuggestion {
  id: number | null;
  title: string;
  slug: string | null;
  summary: string | null;
  type: 'article' | 'common';
}

export interface TicketCategory {
  id: number;
  name: string;
  description?: string;
}

export const chatbotService = {
  sendMessage: async (data: SendMessageRequest): Promise<ChatbotResponse> => {
    const response = await axiosInstance.post<ChatbotResponse>('/chatbot/message', data);
    return response.data;
  },

  getSuggestions: async (query: string): Promise<KBSuggestion[]> => {
    if (query.length < 2) return [];
    const response = await axiosInstance.get<KBSuggestion[]>('/chatbot/suggestions', {
      params: { query },
    });
    return response.data;
  },

  getCategories: async (): Promise<TicketCategory[]> => {
    const response = await axiosInstance.get<TicketCategory[]>('/chatbot/categories');
    return response.data;
  },

  getConversation: async (sessionId: string): Promise<ChatConversation> => {
    const response = await axiosInstance.get<ChatConversation>(`/chatbot/conversation/${sessionId}`);
    return response.data;
  },

  getUserConversations: async (limit: number = 10): Promise<ChatConversation[]> => {
    const response = await axiosInstance.get<ChatConversation[]>('/chatbot/conversations', {
      params: { limit },
    });
    return response.data;
  },

  createTicketFromChat: async (data: CreateTicketFromChatRequest): Promise<any> => {
    const response = await axiosInstance.post('/chatbot/create-ticket', data);
    return response.data;
  },

  markResolved: async (sessionId: string): Promise<any> => {
    const response = await axiosInstance.post(`/chatbot/conversation/${sessionId}/resolve`);
    return response.data;
  },

  deleteConversation: async (sessionId: string): Promise<any> => {
    const response = await axiosInstance.delete(`/chatbot/conversation/${sessionId}`);
    return response.data;
  },
};
