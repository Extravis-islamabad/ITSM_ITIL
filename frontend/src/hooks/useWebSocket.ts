import { useEffect, useRef, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { chatService, Message } from '../services/chatService';

export type WebSocketMessageType =
  | 'new_message'
  | 'typing'
  | 'online_status'
  | 'message_read'
  | 'reaction'
  | 'message_edited'
  | 'message_deleted'
  | 'subscribed'
  | 'unsubscribed';

export interface WebSocketMessage {
  type: WebSocketMessageType;
  conversation_id?: number;
  message?: Message;
  message_id?: number;
  user_id?: number;
  is_typing?: boolean;
  is_online?: boolean;
  emoji?: string;
  action?: 'add' | 'remove';
  timestamp?: string;
}

interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const {
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    autoReconnect = true,
    reconnectInterval = 3000,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<number, Set<number>>>({});
  const queryClient = useQueryClient();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const token = localStorage.getItem('access_token');
    if (!token) {
      return;
    }

    try {
      const wsUrl = chatService.getWebSocketUrl();
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        onConnect?.();
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        onDisconnect?.();

        if (autoReconnect) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      wsRef.current.onerror = (error) => {
        onError?.(error);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleMessage(message);
          onMessage?.(message);
        } catch {
          // Silent fail for parse errors
        }
      };
    } catch {
      // Silent fail for connection errors
    }
  }, [autoReconnect, reconnectInterval, onConnect, onDisconnect, onError, onMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const send = useCallback((data: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  const subscribeToConversation = useCallback(
    (conversationId: number) => {
      send({ type: 'subscribe', conversation_id: conversationId });
    },
    [send]
  );

  const unsubscribeFromConversation = useCallback(
    (conversationId: number) => {
      send({ type: 'unsubscribe', conversation_id: conversationId });
    },
    [send]
  );

  const sendTyping = useCallback(
    (conversationId: number, isTyping: boolean) => {
      send({ type: 'typing', conversation_id: conversationId, is_typing: isTyping });
    },
    [send]
  );

  const sendMessage = useCallback(
    (conversationId: number, content: string, replyToId?: number) => {
      send({
        type: 'new_message',
        conversation_id: conversationId,
        content,
        message_type: 'text',
        reply_to_id: replyToId,
      });
    },
    [send]
  );

  const markAsRead = useCallback(
    (conversationId: number, messageId: number) => {
      send({ type: 'mark_read', conversation_id: conversationId, message_id: messageId });
    },
    [send]
  );

  const sendReaction = useCallback(
    (messageId: number, emoji: string, action: 'add' | 'remove') => {
      send({ type: 'reaction', message_id: messageId, emoji, action });
    },
    [send]
  );

  const handleMessage = useCallback(
    (message: WebSocketMessage) => {
      switch (message.type) {
        case 'new_message':
          if (message.conversation_id && message.message) {
            // Update messages cache
            queryClient.invalidateQueries({
              queryKey: ['messages', message.conversation_id],
            });
            // Update conversations list to show latest message
            queryClient.invalidateQueries({
              queryKey: ['conversations'],
            });
          }
          break;

        case 'typing':
          if (message.conversation_id && message.user_id !== undefined) {
            setTypingUsers((prev) => {
              const convTyping = new Set(prev[message.conversation_id!] || []);
              if (message.is_typing) {
                convTyping.add(message.user_id!);
              } else {
                convTyping.delete(message.user_id!);
              }
              return { ...prev, [message.conversation_id!]: convTyping };
            });
          }
          break;

        case 'online_status':
          // Update online status in conversations
          queryClient.invalidateQueries({
            queryKey: ['conversations'],
          });
          break;

        case 'message_read':
          if (message.conversation_id) {
            queryClient.invalidateQueries({
              queryKey: ['messages', message.conversation_id],
            });
          }
          break;

        case 'reaction':
          if (message.conversation_id) {
            queryClient.invalidateQueries({
              queryKey: ['messages', message.conversation_id],
            });
          }
          break;

        case 'message_edited':
          if (message.conversation_id) {
            queryClient.invalidateQueries({
              queryKey: ['messages', message.conversation_id],
            });
          }
          break;

        case 'message_deleted':
          if (message.conversation_id) {
            queryClient.invalidateQueries({
              queryKey: ['messages', message.conversation_id],
            });
          }
          break;
      }
    },
    [queryClient]
  );

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, []);

  return {
    isConnected,
    connect,
    disconnect,
    send,
    subscribeToConversation,
    unsubscribeFromConversation,
    sendTyping,
    sendMessage,
    markAsRead,
    sendReaction,
    typingUsers,
  };
};

export default useWebSocket;
