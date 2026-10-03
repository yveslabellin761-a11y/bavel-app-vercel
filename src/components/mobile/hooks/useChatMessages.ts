import { useState, useCallback, useMemo, useEffect } from 'react';
import { Message } from '../types';

interface UseChatMessagesProps {
  matchId: string;
  currentUserId: string;
  profileName: string;
  initialMessages?: any[];
}

export function useChatMessages({
  matchId,
  currentUserId,
  profileName,
  initialMessages = [],
}: UseChatMessagesProps) {
  const [messages, setMessages] = useState<Message[]>(() => {
    if (initialMessages && initialMessages.length > 0) {
      return initialMessages.map((m: any, index: number) => ({
        id: m.id || index + 1,
        text: m.text || m.content,
        sender: (m.sender === 'me' || m.sender === 'user' || m.senderId === currentUserId) ? 'me' : 'them',
        time: m.time || (m.timestamp ? new Date(m.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '14:52'),
        type: m.type || 'text',
        status: m.status || 'read',
        duration: m.duration,
        waveformData: m.waveformData,
        isEphemeral: m.isEphemeral,
        isViewed: m.isViewed,
      }));
    }
    return [
      {
        id: 1,
        text: `Coucou ! Comment ça va aujourd'hui, ${profileName} ?`,
        sender: 'them',
        time: 'Aujourd\'hui',
        type: 'text',
        status: 'read',
      },
    ];
  });

  const hasExchangedMessages = useMemo(() => {
    return messages.some((m) => m.sender === 'me');
  }, [messages]);

  const waitingForReply = useMemo(() => {
    if (messages.length === 0) return false;
    const lastMsg = messages[messages.length - 1];
    const hasSent = messages.some((m) => m.sender === 'me');
    return hasSent && lastMsg.sender === 'me';
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string, type: string = 'text', extra: Partial<Message> = {}) => {
      const newMsg: Message = {
        id: Date.now(),
        text,
        sender: 'me',
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        type,
        status: 'sent',
        ...extra,
      };

      setMessages((prev) => [...prev, newMsg]);

      setTimeout(() => {
        setMessages((prev) =>
          prev.map((m) => (m.id === newMsg.id ? { ...m, status: 'delivered' } : m))
        );
      }, 800);
    },
    []
  );

  return {
    messages,
    setMessages,
    hasExchangedMessages,
    waitingForReply,
    sendMessage,
  };
}
