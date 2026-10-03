import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, Image as ImageIcon, Mic, Check, CheckCheck, 
  Clock, AlertCircle, Sparkles, Phone, Video, ChevronLeft,
  RefreshCw, X
} from 'lucide-react';
import { Message, Discussion } from '../../components/mobile/discussions/DiscussionsTab';
import { useUX } from '../../context/UXContext';
import { useOfflineStore } from '../../store/useOfflineStore';
import { chatService } from '../../services/chatService';
import { cn } from '../../lib/utils';
import { KeyboardAvoidingView } from '../../components/ux/KeyboardAvoidingView';

// ============================================
// 1. TYPES
// ============================================

export interface OptimisticMessage extends Message {
  status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  optimisticId?: string;
  retryCount?: number;
}

export interface OptimisticChatBoxProps {
  currentUserId: string;
  discussion: Discussion;
  onBack: () => void;
  onStartCall?: (type: 'audio' | 'video') => void;
  onMessageSent?: (message: OptimisticMessage) => void;
  onError?: (error: Error) => void;
  className?: string;
}

// ============================================
// 2. SOUS-COMPOSANTS
// ============================================

// 2.1 Chat Message
const ChatMessage: React.FC<{
  message: OptimisticMessage;
  isUser: boolean;
  onRetry?: (id: string) => void;
}> = React.memo(({ message, isUser, onRetry }) => {
  const isFailed = message.status === 'failed';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={cn('flex flex-col max-w-[80%] select-text', isUser ? 'ml-auto items-end' : 'mr-auto items-start')}
    >
      <div
        className={cn(
          'px-4 py-2.5 rounded-2xl text-sm font-medium leading-relaxed shadow-xs relative',
          isUser
            ? 'bg-gradient-to-tr from-rose-600 to-[#e20030] text-white rounded-br-xs'
            : 'bg-white text-gray-800 border border-gray-100 rounded-bl-xs',
          isFailed && 'opacity-70'
        )}
      >
        {message.text}
        
        {/* Retry button for failed messages */}
        {isFailed && isUser && (
          <button
            onClick={() => onRetry?.(message.id)}
            className="absolute -bottom-2 -right-2 p-1 bg-rose-100 text-rose-600 rounded-full hover:bg-rose-200 transition-colors"
            title="Réessayer"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        )}
      </div>

      <div className="flex items-center space-x-1 mt-1 px-1">
        <span className="text-[10px] text-gray-400">
          {new Date(message.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </span>

        {isUser && (
          <span className="text-gray-400">
            {message.status === 'pending' && (
              <Clock className="w-3 h-3 text-amber-500 animate-spin" />
            )}
            {message.status === 'sent' && (
              <Check className="w-3 h-3 text-gray-400" />
            )}
            {message.status === 'delivered' && (
              <CheckCheck className="w-3 h-3 text-gray-400" />
            )}
            {message.status === 'read' && (
              <CheckCheck className="w-3 h-3 text-blue-500" />
            )}
            {message.status === 'failed' && (
              <AlertCircle className="w-3 h-3 text-rose-500" />
            )}
          </span>
        )}
      </div>
    </motion.div>
  );
});

ChatMessage.displayName = 'ChatMessage';

// 2.2 Chat Input
const ChatInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isOnline: boolean;
  isTyping: boolean;
}> = React.memo(({ value, onChange, onSend, isOnline, isTyping }) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) onSend();
      }}
      className="flex items-center space-x-2"
    >
      <div className="flex-1 relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={isOnline ? "Écrivez votre message..." : "Hors-ligne - Les messages seront envoyés plus tard"}
          disabled={!isOnline}
          className={cn(
            "w-full px-4 py-3 rounded-2xl border text-sm text-gray-900 outline-none transition-all",
            isFocused
              ? "border-rose-300 bg-white ring-2 ring-rose-100"
              : "border-transparent bg-gray-100",
            !isOnline && "opacity-60 cursor-not-allowed"
          )}
        />
        {!isOnline && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={!value.trim() || !isOnline}
        className={cn(
          'p-3 rounded-2xl transition-all shadow-md active:scale-95 cursor-pointer shrink-0',
          value.trim() && isOnline
            ? 'bg-gradient-to-tr from-rose-600 to-[#e20030] text-white hover:opacity-90'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        )}
      >
        {isTyping ? (
          <Clock className="w-5 h-5 animate-spin" />
        ) : (
          <Send className="w-5 h-5" />
        )}
      </button>
    </form>
  );
});

ChatInput.displayName = 'ChatInput';

// ============================================
// 3. COMPOSANT PRINCIPAL
// ============================================

export const OptimisticChatBox: React.FC<OptimisticChatBoxProps> = React.memo(({
  currentUserId,
  discussion,
  onBack,
  onStartCall,
  onMessageSent,
  onError,
  className,
}) => {
  // ============================================
  // CONTEXT & HOOKS
  // ============================================

  const { isOnline, triggerFeedback, playSound } = useUX();
  const { enqueueAction, pendingCount } = useOfflineStore();

  // ============================================
  // ÉTATS
  // ============================================

  const [messages, setMessages] = useState<OptimisticMessage[]>(() =>
    (discussion.messages || []).map((m) => ({
      ...m,
      status: m.read ? 'read' : m.sender === 'user' ? 'sent' : undefined,
    }))
  );

  const [inputVal, setInputVal] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ============================================
  // MÉMOISATION
  // ============================================

  const lastMessage = useMemo(() => messages[messages.length - 1], [messages]);

  // ============================================
  // SCROLL
  // ============================================

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: smooth ? 'smooth' : 'auto' 
    });
  }, []);

  useEffect(() => {
    scrollToBottom(false);
  }, [scrollToBottom]);

  useEffect(() => {
    scrollToBottom(true);
  }, [messages, scrollToBottom]);

  // ============================================
  // REALTIME SUBSCRIPTION
  // ============================================

  useEffect(() => {
    const sub = chatService.subscribeToDiscussion(
      currentUserId,
      discussion.userId,
      (newMsg: any) => {
        setMessages((prev) => {
          const messageId = String(newMsg.id || '');
          const sender = newMsg.sender_id === currentUserId ? 'user' : 'other';
          const status = newMsg.is_read === true ? 'read' : sender === 'other' ? 'delivered' : 'sent';
          const existing = prev.findIndex((m) => m.id === messageId);
          if (existing >= 0) {
            return prev.map((message, index) => index === existing
              ? { ...message, status, read: newMsg.is_read === true }
              : message);
          }

          if (sender === 'user') {
            const pendingOwnMessage = prev.findIndex((message) =>
              message.sender === 'user' &&
              message.status === 'pending' &&
              message.text === (newMsg.content || newMsg.text)
            );
            if (pendingOwnMessage >= 0) {
              return prev.map((message, index) => index === pendingOwnMessage
                ? {
                  ...message,
                  id: messageId,
                  timestamp: new Date(newMsg.created_at || newMsg.timestamp || Date.now()),
                  read: newMsg.is_read === true,
                  status,
                }
                : message);
            }
          }
          
          if (sender === 'other') {
            playSound('message_received');
            triggerFeedback('light');
          }
          
          return [
            ...prev,
            {
              id: messageId || `msg_${Date.now()}`,
              text: newMsg.content || newMsg.text || '',
              sender,
              timestamp: new Date(newMsg.created_at || newMsg.timestamp || Date.now()),
              read: newMsg.is_read === true,
              status,
              type: newMsg.type || 'text',
            },
          ];
        });
      }
    );

    return () => {
      sub.unsubscribe();
    };
  }, [currentUserId, discussion.userId, playSound, triggerFeedback]);

  useEffect(() => {
    let cancelled = false;
    void chatService.markAsRead(currentUserId, discussion.userId)
      .then(() => {
        if (cancelled) return;
        setMessages((prev) => prev.map((message) => message.sender === 'other'
          ? { ...message, read: true, status: 'read' }
          : message));
      })
      .catch((err) => {
        console.warn('Failed to mark discussion as read:', err);
      });
    return () => {
      cancelled = true;
    };
  }, [currentUserId, discussion.userId]);

  // ============================================
  // SEND MESSAGE
  // ============================================

  const handleSend = useCallback(async () => {
    const trimmed = inputVal.trim();
    if (!trimmed || isSending) return;

    triggerFeedback('light');
    setIsSending(true);
    setInputVal('');
    setError(null);

    const tempId = crypto.randomUUID();
    const optimisticMsg: OptimisticMessage = {
      id: tempId,
      text: trimmed,
      sender: 'user',
      timestamp: new Date(),
      read: false,
      type: 'text',
      status: 'pending',
      optimisticId: tempId,
    };

    // 1. Optimistic Update
    setMessages((prev) => [...prev, optimisticMsg]);
    onMessageSent?.(optimisticMsg);

    // 2. Offline handling
    if (!isOnline) {
      try {
        enqueueAction('SEND_MESSAGE', {
          senderId: currentUserId,
          targetId: discussion.userId,
          text: trimmed,
          clientMessageId: tempId,
        });
        setMessages((prev) =>
          prev.map((message) => message.id === tempId ? { ...message, status: 'pending' } : message)
        );
      } catch (error) {
        console.error('Could not queue offline message:', error);
        setError(error instanceof Error ? error.message : "Impossible d'enregistrer le message hors ligne.");
        setMessages((prev) =>
          prev.map((message) => message.id === tempId ? { ...message, status: 'failed', retryCount: 1 } : message)
        );
      } finally {
        setIsSending(false);
      }
      return;
    }

    // 3. Network send
    try {
      const saved = await chatService.sendMessage(
        currentUserId,
        discussion.userId,
        trimmed,
        'text',
        tempId
      );
      
      if (!saved.id) throw new Error('Le serveur n’a pas retourné l’identifiant du message.');
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...m, id: saved.id, timestamp: saved.timestamp, status: 'sent' } : m
        )
      );
    } catch (err) {
      console.warn('Failed to send message:', err);
      setError("Impossible d'envoyer le message");
      onError?.(err as Error);
      
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...m, status: 'failed', retryCount: 1 } : m
        )
      );
    } finally {
      setIsSending(false);
    }
  }, [
    inputVal,
    isSending,
    isOnline,
    triggerFeedback,
    currentUserId,
    discussion.userId,
    enqueueAction,
    onMessageSent,
    onError,
  ]);

  // ============================================
  // RETRY FAILED MESSAGE
  // ============================================

  const handleRetry = useCallback(async (messageId: string) => {
    const failedMsg = messages.find(m => m.id === messageId);
    if (!failedMsg) return;

    // Remove failed message
    setMessages(prev => prev.filter(m => m.id !== messageId));
    
    // Resend with same text
    setInputVal(failedMsg.text);
    await handleSend();
  }, [messages, handleSend]);

  // ============================================
  // RENDU
  // ============================================

  return (
    <div className={cn("flex flex-col h-full bg-neutral-50", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 shadow-xs z-10">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              triggerFeedback('light');
              onBack();
            }}
            className="p-1.5 -ml-1.5 rounded-full hover:bg-gray-100 active:scale-95 transition-transform"
            aria-label="Retour"
          >
            <ChevronLeft className="w-6 h-6 text-gray-800" />
          </button>

          <div className="relative">
            <img
              src={discussion.avatar}
              alt={discussion.name}
              className="w-10 h-10 rounded-full object-cover border border-gray-200 shadow-xs"
              loading="lazy"
            />
            {discussion.online && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
            )}
          </div>

          <div>
            <h3 className="text-sm font-black text-gray-900 tracking-tight leading-tight">
              {discussion.name}
            </h3>
            <p className="text-[11px] text-gray-500 font-medium">
              {discussion.online
                ? 'En ligne'
                : 'Hors-ligne'}
            </p>
          </div>
        </div>

        {/* Audio / Video Call Actions */}
        <div className="flex items-center space-x-1">
          {onStartCall && (
            <>
              <button
                onClick={() => {
                  triggerFeedback('medium');
                  onStartCall('audio');
                }}
                className="p-2.5 rounded-full hover:bg-rose-50 text-gray-700 hover:text-[#e20030] transition-colors"
                title="Appel vocal"
                aria-label="Appel vocal"
              >
                <Phone className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  triggerFeedback('medium');
                  onStartCall('video');
                }}
                className="p-2.5 rounded-full hover:bg-rose-50 text-gray-700 hover:text-[#e20030] transition-colors"
                title="Appel vidéo"
                aria-label="Appel vidéo"
              >
                <Video className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Error Banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mx-4 mt-2 p-2 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-[12px] font-medium flex items-center justify-between"
          >
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-rose-500 hover:text-rose-700"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            isUser={msg.sender === 'user'}
            onRetry={handleRetry}
          />
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <KeyboardAvoidingView className="p-3 bg-white border-t border-gray-100">
        <ChatInput
          value={inputVal}
          onChange={setInputVal}
          onSend={handleSend}
          isOnline={isOnline}
          isTyping={isSending}
        />
        
        {/* Offline indicator */}
        {!isOnline && (
          <div className="flex items-center justify-center mt-1 space-x-1 text-[10px] text-amber-500 font-medium">
            <Clock className="w-3 h-3" />
            <span>Mode hors-ligne - Les messages seront envoyés automatiquement</span>
          </div>
        )}
      </KeyboardAvoidingView>
    </div>
  );
});

OptimisticChatBox.displayName = 'OptimisticChatBox';

// ============================================
// 4. EXPORT PAR DÉFAUT
// ============================================

export default OptimisticChatBox;