import { useState, useEffect, useCallback } from 'react';
import { Discussion, Message } from '../components/mobile/discussions/DiscussionsTab';
import { chatService } from '../services/chatService';

export function useChat(userId: string) {
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadDiscussions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await chatService.getDiscussions(userId);
      setDiscussions(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadDiscussions();
    
    // Supabase Realtime subscription for instant message and match updates
    const subscription = chatService.subscribeToDiscussionsRealtime(userId, () => {
      loadDiscussions();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [userId, loadDiscussions]);

  const sendMessage = useCallback(async (discussionId: string, text: string, type: 'text' | 'image' | 'voice' = 'text') => {
    try {
      const newMessage = await chatService.sendMessage(userId, discussionId, text, type);
      setDiscussions(prev => prev.map(d => {
        if (d.id === discussionId || d.userId === discussionId) {
          return {
            ...d,
            messages: [...d.messages, newMessage],
            lastMessage: newMessage.text,
            lastMessageTime: new Date(newMessage.timestamp)
          };
        }
        return d;
      }));
    } catch (err) {
      setError(err as Error);
    }
  }, [userId]);

  const markAsRead = useCallback(async (discussionId: string) => {
    try {
      await chatService.markAsRead(userId, discussionId);
      setDiscussions(prev => prev.map(d => {
        if (d.id === discussionId || d.userId === discussionId) {
          return { ...d, unreadCount: 0 };
        }
        return d;
      }));
    } catch (err) {
      setError(err as Error);
    }
  }, [userId]);

  const deleteDiscussion = useCallback(async (discussionId: string) => {
    try {
      await chatService.deleteDiscussion(userId, discussionId);
      setDiscussions(prev => prev.filter(d => d.id !== discussionId && d.userId !== discussionId));
    } catch (err) {
      setError(err as Error);
    }
  }, [userId]);

  const muteDiscussion = useCallback(async (discussionId: string) => {
    try {
      await chatService.muteDiscussion(userId, discussionId);
    } catch (err) {
      setError(err as Error);
    }
  }, [userId]);

  const blockUser = useCallback(async (targetUserId: string) => {
    try {
      await chatService.blockUser(userId, targetUserId);
      setDiscussions(prev => prev.filter(d => d.userId !== targetUserId && d.id !== targetUserId));
    } catch (err) {
      setError(err as Error);
    }
  }, [userId]);

  const reportUser = useCallback(async (targetUserId: string, reason: string) => {
    try {
      await chatService.reportUser(userId, targetUserId, reason);
      setDiscussions(prev => prev.filter(d => d.userId !== targetUserId && d.id !== targetUserId));
    } catch (err) {
      setError(err as Error);
    }
  }, [userId]);

  const loadMoreMessages = useCallback(async (discussionId: string) => {
    try {
      const oldMessages = await chatService.loadMoreMessages(userId, discussionId);
      setDiscussions(prev => prev.map(d => {
        if (d.id === discussionId || d.userId === discussionId) {
          return { ...d, messages: oldMessages };
        }
        return d;
      }));
    } catch (err) {
      setError(err as Error);
    }
  }, [userId]);

  const refreshDiscussions = useCallback(async () => {
    await loadDiscussions();
  }, [loadDiscussions]);

  return {
    discussions,
    loading,
    error,
    sendMessage,
    markAsRead,
    deleteDiscussion,
    muteDiscussion,
    blockUser,
    reportUser,
    loadMoreMessages,
    refreshDiscussions
  };
}
