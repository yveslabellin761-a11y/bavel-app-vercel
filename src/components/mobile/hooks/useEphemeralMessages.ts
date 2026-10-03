import { useState, useCallback } from 'react';
import { Message } from '../types';

interface UseEphemeralMessagesProps {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

export function useEphemeralMessages({ setMessages }: UseEphemeralMessagesProps) {
  const [viewingEphemeralMsg, setViewingEphemeralMsg] = useState<Message | null>(null);

  const markAsViewed = useCallback((msgId: number | string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, isViewed: true } : m))
    );
  }, [setMessages]);

  return {
    viewingEphemeralMsg,
    setViewingEphemeralMsg,
    markAsViewed,
  };
}
