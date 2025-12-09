import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Send,
  Paperclip,
  Smile,
  X,
  Image as ImageIcon,
  FileText,
  Loader2,
} from 'lucide-react';
import chatService from '../../../services/chatService';
import EmojiPicker from './EmojiPicker';

interface MessageInputProps {
  conversationId: number;
  onTyping: (isTyping: boolean) => void;
  replyToId?: number;
  onCancelReply?: () => void;
}

interface PendingFile {
  file: File;
  preview?: string;
  type: 'image' | 'file';
}

const MessageInput: React.FC<MessageInputProps> = ({
  conversationId,
  onTyping,
  replyToId,
  onCancelReply,
}) => {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      if (pendingFiles.length > 0) {
        return chatService.sendMessageWithAttachments(
          conversationId,
          message.trim() || undefined,
          pendingFiles.map((pf) => pf.file)
        );
      }
      return chatService.sendMessage(conversationId, {
        content: message.trim(),
        message_type: 'text',
        reply_to_id: replyToId,
      });
    },
    onSuccess: () => {
      setMessage('');
      setPendingFiles([]);
      onCancelReply?.();
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [message]);

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      onTyping(true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      onTyping(false);
    }, 2000);
  }, [isTyping, onTyping]);

  // Handle message change
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    handleTyping();
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle send
  const handleSend = () => {
    if ((!message.trim() && pendingFiles.length === 0) || sendMessageMutation.isPending) {
      return;
    }
    sendMessageMutation.mutate();
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newPendingFiles: PendingFile[] = [];

    files.forEach((file) => {
      const isImage = file.type.startsWith('image/');
      const pendingFile: PendingFile = {
        file,
        type: isImage ? 'image' : 'file',
      };

      if (isImage) {
        const reader = new FileReader();
        reader.onload = (e) => {
          pendingFile.preview = e.target?.result as string;
          setPendingFiles((prev) => [...prev]);
        };
        reader.readAsDataURL(file);
      }

      newPendingFiles.push(pendingFile);
    });

    setPendingFiles((prev) => [...prev, ...newPendingFiles]);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove pending file
  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle emoji select
  const handleEmojiSelect = (emoji: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newMessage = message.slice(0, start) + emoji + message.slice(end);
      setMessage(newMessage);

      // Set cursor position after emoji
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
        textarea.focus();
      }, 0);
    } else {
      setMessage((prev) => prev + emoji);
    }
    setShowEmojiPicker(false);
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      {/* Pending files preview */}
      {pendingFiles.length > 0 && (
        <div className="px-4 pt-3 flex flex-wrap gap-2">
          {pendingFiles.map((pf, index) => (
            <div
              key={index}
              className="relative group bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden"
            >
              {pf.type === 'image' && pf.preview ? (
                <div className="h-20 w-20">
                  <img
                    src={pf.preview}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-20 w-32 flex items-center justify-center p-2">
                  <FileText className="h-8 w-8 text-gray-400 flex-shrink-0" />
                  <div className="ml-2 min-w-0">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                      {pf.file.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFileSize(pf.file.size)}
                    </p>
                  </div>
                </div>
              )}
              <button
                onClick={() => removePendingFile(index)}
                className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-md"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2 p-4">
        {/* File attachment button */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-shrink-0 p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title="Attach file"
        >
          <Paperclip className="h-5 w-5" />
        </button>

        {/* Message input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleMessageChange}
            onKeyDown={handleKeyPress}
            placeholder="Type a message..."
            rows={1}
            className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-700 border-0 rounded-2xl resize-none focus:ring-2 focus:ring-blue-500 dark:text-white placeholder-gray-500 text-sm"
            style={{ maxHeight: '150px' }}
          />
        </div>

        {/* Emoji picker button */}
        <div className="relative">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="flex-shrink-0 p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Add emoji"
          >
            <Smile className="h-5 w-5" />
          </button>

          {showEmojiPicker && (
            <div className="absolute bottom-full right-0 mb-2">
              <EmojiPicker
                onSelect={handleEmojiSelect}
                onClose={() => setShowEmojiPicker(false)}
              />
            </div>
          )}
        </div>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={(!message.trim() && pendingFiles.length === 0) || sendMessageMutation.isPending}
          className="flex-shrink-0 p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Send message"
        >
          {sendMessageMutation.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  );
};

export default MessageInput;
