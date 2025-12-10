import { useState, useEffect, useRef, useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  chatbotService,
  ChatMessage,
  ChatSuggestion,
  KBSuggestion,
  SendMessageRequest,
} from '@/services/chatbotService';
import {
  XMarkIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  TicketIcon,
  CheckCircleIcon,
  BookOpenIcon,
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { getErrorMessage } from '@/utils/helpers';

// Simple debounce utility
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

interface AIChatbotProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AIChatbot({ isOpen, onClose }: AIChatbotProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<ChatSuggestion[]>([]);
  const [typingSuggestions, setTypingSuggestions] = useState<KBSuggestion[]>([]);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketNotes, setTicketNotes] = useState('');
  const [ticketPriority, setTicketPriority] = useState('MEDIUM');
  const [ticketCategory, setTicketCategory] = useState<number | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Fetch categories for ticket creation
  const { data: categories = [] } = useQuery({
    queryKey: ['chatbot-categories'],
    queryFn: chatbotService.getCategories,
    enabled: showTicketForm,
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize with welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: 0,
          role: 'assistant',
          content: `Hello ${user?.full_name?.split(' ')[0] || 'there'}! I'm SupportX AI, your IT support assistant.

I can help you with:
- Password resets and login issues
- Software and application problems
- Hardware troubleshooting
- Network connectivity issues
- And much more!

What can I help you with today?`,
          message_type: 'text',
          created_at: new Date().toISOString(),
        },
      ]);
    }
  }, [isOpen, user]);

  // Debounced suggestion fetching
  const fetchSuggestions = useCallback(
    debounce(async (query: string) => {
      if (query.length >= 2) {
        try {
          const suggestions = await chatbotService.getSuggestions(query);
          setTypingSuggestions(suggestions);
          setShowSuggestions(suggestions.length > 0);
        } catch (error) {
          setTypingSuggestions([]);
        }
      } else {
        setTypingSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300),
    []
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputValue(value);
    fetchSuggestions(value);
  };

  const sendMessageMutation = useMutation({
    mutationFn: (data: SendMessageRequest) => chatbotService.sendMessage(data),
    onSuccess: (data) => {
      const aiMessage: ChatMessage = data.message;
      setMessages((prev) => [...prev, aiMessage]);
      setSuggestions(data.suggestions);

      if (data.session_id) {
        setSessionId(data.session_id);
      }
      if (data.conversation_id) {
        setConversationId(data.conversation_id);
      }
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Failed to send message'));
    },
  });

  const createTicketMutation = useMutation({
    mutationFn: (data: any) => chatbotService.createTicketFromChat(data),
    onSuccess: (data) => {
      toast.success(`Ticket ${data.ticket_number} created successfully!`);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: 'system',
          content: `Ticket **${data.ticket_number}** has been created successfully!\n\nOur support team will review your issue and get back to you shortly. You can track the progress in the Incidents section.`,
          message_type: 'ticket_created',
          metadata: { ticket_id: data.ticket_id, ticket_number: data.ticket_number },
          created_at: new Date().toISOString(),
        },
      ]);
      setShowTicketForm(false);
      setSuggestions([]);
      resetTicketForm();
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Failed to create ticket'));
    },
  });

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now(),
      role: 'user',
      content: inputValue,
      message_type: 'text',
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setShowSuggestions(false);
    setTypingSuggestions([]);

    sendMessageMutation.mutate({
      content: inputValue,
      session_id: sessionId || undefined,
    });
  };

  const handleSuggestionClick = (suggestion: KBSuggestion) => {
    setInputValue(suggestion.title);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleActionSuggestionClick = (suggestion: ChatSuggestion) => {
    if (suggestion.action === 'create_ticket') {
      setShowTicketForm(true);
    } else if (suggestion.action === 'confirm_resolution') {
      handleMarkResolved();
    } else {
      setInputValue(suggestion.text);
    }
  };

  const handleCreateTicket = () => {
    if (!conversationId) {
      toast.error('No active conversation to create ticket from');
      return;
    }

    createTicketMutation.mutate({
      conversation_id: conversationId,
      title: ticketTitle || undefined,
      additional_notes: ticketNotes || undefined,
      priority: ticketPriority,
      category_id: ticketCategory || undefined,
    });
  };

  const resetTicketForm = () => {
    setTicketTitle('');
    setTicketNotes('');
    setTicketPriority('MEDIUM');
    setTicketCategory(null);
  };

  const handleMarkResolved = async () => {
    if (sessionId) {
      try {
        await chatbotService.markResolved(sessionId);
        toast.success('Great! Glad I could help!');
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            role: 'system',
            content: "I'm glad I could help resolve your issue! Feel free to reach out anytime you need assistance.",
            message_type: 'resolution',
            created_at: new Date().toISOString(),
          },
        ]);
        setSuggestions([]);
      } catch (error) {
        toast.error('Failed to mark as resolved');
      }
    }
  };

  const resetChat = () => {
    setMessages([]);
    setSessionId(null);
    setConversationId(null);
    setSuggestions([]);
    setShowTicketForm(false);
    resetTicketForm();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col bg-white rounded-2xl shadow-2xl w-[420px] h-[650px] border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-primary-600 via-primary-700 to-accent-600 text-white">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <SparklesIcon className="h-6 w-6" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-400 rounded-full border-2 border-white"></span>
          </div>
          <div>
            <h3 className="font-semibold text-lg">SupportX AI</h3>
            <p className="text-xs text-white/80">Always here to help</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={resetChat}
            className="hover:bg-white/20 rounded-lg p-2 transition-colors"
            title="New conversation"
          >
            <ArrowPathIcon className="h-5 w-5" />
          </button>
          <button
            onClick={onClose}
            className="hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50 to-white">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-md'
                  : message.role === 'system'
                  ? 'bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-900 border border-emerald-200'
                  : 'bg-white text-gray-800 shadow-md border border-gray-100'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                  <div className="w-6 h-6 bg-primary-100 rounded-lg flex items-center justify-center">
                    <SparklesIcon className="h-4 w-4 text-primary-600" />
                  </div>
                  <span className="text-xs font-semibold text-primary-600">AI Assistant</span>
                  {message.metadata?.source === 'knowledge_base' && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <BookOpenIcon className="h-3 w-3" />
                      KB
                    </span>
                  )}
                </div>
              )}
              {message.role === 'system' && (
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircleIcon className="h-5 w-5 text-emerald-600" />
                  <span className="text-xs font-semibold text-emerald-700">System</span>
                </div>
              )}
              <div className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</div>
              {message.metadata?.ticket_number && (
                <button
                  onClick={() => navigate(`/incidents/${message.metadata?.ticket_id}`)}
                  className="mt-3 text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors inline-flex items-center gap-1"
                >
                  <TicketIcon className="h-3 w-3" />
                  View Ticket {message.metadata?.ticket_number}
                </button>
              )}
            </div>
          </div>
        ))}

        {sendMessageMutation.isPending && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl px-4 py-3 shadow-md border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span className="text-sm text-gray-500">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Action Suggestions */}
      {suggestions.length > 0 && !showTicketForm && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-2 font-medium">Suggested actions:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleActionSuggestionClick(suggestion)}
                className={`text-sm px-4 py-2 rounded-xl transition-all font-medium ${
                  suggestion.type === 'escalate'
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:shadow-md'
                    : 'bg-white text-primary-700 border border-primary-200 hover:bg-primary-50 hover:border-primary-300'
                }`}
              >
                {suggestion.type === 'escalate' && <TicketIcon className="h-4 w-4 inline mr-1.5" />}
                {suggestion.type === 'question' && <CheckCircleIcon className="h-4 w-4 inline mr-1.5" />}
                {suggestion.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Ticket Creation Form */}
      {showTicketForm && (
        <div className="px-4 py-4 bg-gradient-to-r from-orange-50 to-amber-50 border-t border-orange-200 max-h-[280px] overflow-y-auto">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <TicketIcon className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Create Support Ticket</h4>
              <p className="text-xs text-gray-600 mt-0.5">
                Our team will review and assist you shortly
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Title (optional)
              </label>
              <input
                type="text"
                value={ticketTitle}
                onChange={(e) => setTicketTitle(e.target.value)}
                placeholder="Brief description of the issue"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={ticketPriority}
                  onChange={(e) => setTicketPriority(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={ticketCategory || ''}
                  onChange={(e) => setTicketCategory(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Auto-detect</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Additional Notes (optional)
              </label>
              <textarea
                value={ticketNotes}
                onChange={(e) => setTicketNotes(e.target.value)}
                placeholder="Any additional information..."
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={handleCreateTicket}
              disabled={createTicketMutation.isPending}
              className="flex-1 bg-gradient-to-r from-primary-600 to-primary-700 text-white text-sm px-4 py-2.5 rounded-xl hover:shadow-md transition-all disabled:opacity-50 font-medium"
            >
              {createTicketMutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  Creating...
                </span>
              ) : (
                'Create Ticket'
              )}
            </button>
            <button
              onClick={() => {
                setShowTicketForm(false);
                resetTicketForm();
              }}
              className="px-4 py-2.5 text-sm text-gray-600 hover:text-gray-800 font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-200">
        {/* Typing Suggestions Dropdown */}
        {showSuggestions && typingSuggestions.length > 0 && (
          <div className="mb-2 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
              <p className="text-xs text-gray-500 font-medium flex items-center gap-1">
                <LightBulbIcon className="h-3 w-3" />
                Suggestions from Knowledge Base
              </p>
            </div>
            <div className="max-h-40 overflow-y-auto">
              {typingSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0"
                >
                  <div className="flex items-start gap-2">
                    {suggestion.type === 'article' ? (
                      <BookOpenIcon className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    ) : (
                      <ChatBubbleLeftRightIcon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-800">{suggestion.title}</p>
                      {suggestion.summary && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                          {suggestion.summary}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              onFocus={() => {
                if (typingSuggestions.length > 0) {
                  setShowSuggestions(true);
                }
              }}
              onBlur={() => {
                // Delay hiding to allow click on suggestions
                setTimeout(() => setShowSuggestions(false), 200);
              }}
              placeholder="Describe your issue..."
              rows={2}
              className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none bg-gray-50 focus:bg-white transition-colors"
              disabled={sendMessageMutation.isPending}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || sendMessageMutation.isPending}
            className="self-end bg-gradient-to-r from-primary-600 to-accent-600 text-white p-3.5 rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
          >
            <PaperAirplaneIcon className="h-5 w-5" />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Press Enter to send
        </p>
      </div>
    </div>
  );
}
