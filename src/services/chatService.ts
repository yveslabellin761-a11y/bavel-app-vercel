import { Discussion, Message } from '../components/mobile/discussions/DiscussionsTab';
import { 
  getSupabase, 
  fetchMatchesFromSupabase, 
  fetchMessagesFromSupabase, 
  saveMessageToSupabase, 
  sendMessageThroughServer,
  deleteDiscussionInSupabase, 
  blockUserInSupabase, 
  reportUserInSupabase, 
  markMessagesAsReadInSupabase,
  fetchMatchedProfilesFromSupabase
} from '../lib/supabase';

export const chatService = {
  getDiscussions: async (userId: string): Promise<Discussion[]> => {
    try {
      const client = getSupabase();
      if (!client) return [];

      // 1. Fetch matches for this user
      const matches = await fetchMatchesFromSupabase(userId);
      if (!matches || matches.length === 0) return [];

      // 2. Fetch profiles to get avatars and details
      const profiles = await fetchMatchedProfilesFromSupabase();
      const blocked = JSON.parse(localStorage.getItem('bavel_blocked_users') || '[]');

      const discussions: Discussion[] = [];

      for (const match of matches) {
        const targetUserId = match.user_id === userId ? match.matched_user_id : match.user_id;
        if (blocked.includes(targetUserId)) continue;

        const targetProfile = profiles.find((p: any) => p.user_id === targetUserId || String(p.id) === String(targetUserId));
        if (!targetProfile) continue;

        const matchId = String(match.id);
        const dbMessages = await fetchMessagesFromSupabase(matchId, userId);

        const messages: Message[] = (dbMessages || []).map((m: any) => ({
          id: String(m.id || m.timestamp),
          text: m.text,
          sender: m.sender_id === userId ? 'user' : 'other',
          timestamp: new Date(m.timestamp),
          read: m.is_read !== false,
          type: m.audio_url ? 'voice' : (m.text && m.text.startsWith('data:image/') ? 'image' : 'text')
        }));

        const lastMsgObj = messages[messages.length - 1];
        const unreadCount = messages.filter(m => m.sender === 'other' && !m.read).length;

        discussions.push({
          id: String(targetProfile.id || targetProfile.user_id),
          userId: String(targetProfile.user_id || targetProfile.id),
          name: targetProfile.name,
          avatar: targetProfile.img || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80',
          age: targetProfile.age,
          online: targetProfile.online ?? true,
          unreadCount,
          messages,
          lastMessage: lastMsgObj ? lastMsgObj.text : (targetProfile.bio || 'Nouveau match ! Discutez dès maintenant 👋'),
          lastMessageTime: lastMsgObj ? lastMsgObj.timestamp : new Date(match.created_at || Date.now())
        });
      }

      // Sort discussions by most recent message/match
      return discussions.sort((a, b) => {
        const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
        const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
        return timeB - timeA;
      });
    } catch (e) {
      console.warn("Failed to fetch real-time discussions from Supabase:", e);
      return [];
    }
  },

  sendMessage: async (
    userId: string,
    targetId: string,
    text: string,
    type: 'text' | 'image' | 'voice' = 'text',
    clientMessageId?: string
  ): Promise<Message> => {
    const matches = await fetchMatchesFromSupabase(userId);
    const match = matches.find((item: any) =>
      (item.user_id === userId && item.matched_user_id === targetId) ||
      (item.user_id === targetId && item.matched_user_id === userId)
    );
    if (!match) throw new Error('Conversation introuvable');
    const savedMessage = await sendMessageThroughServer(String(match.id), targetId, text, type, clientMessageId);

    return {
      id: String(savedMessage?.id || savedMessage?.message_id || ''),
      text,
      sender: 'user',
      timestamp: new Date(savedMessage?.created_at || Date.now()),
      read: savedMessage?.is_read === true,
      type
    };
  },

  markAsRead: async (userId: string, targetId: string): Promise<void> => {
    const matches = await fetchMatchesFromSupabase(userId);
    const match = matches.find((item: any) =>
      (item.user_id === userId && item.matched_user_id === targetId) ||
      (item.user_id === targetId && item.matched_user_id === userId)
    );
    if (!match) throw new Error('Conversation introuvable pour la mise à jour de lecture.');
    const matchId = String(match.id);
    const updated = await markMessagesAsReadInSupabase(matchId, userId);
    if (!updated) throw new Error('Les messages reçus n’ont pas pu être marqués comme lus.');
  },

  deleteDiscussion: async (userId: string, targetId: string): Promise<void> => {
    await deleteDiscussionInSupabase(userId, targetId);
  },

  muteDiscussion: async (userId: string, targetId: string): Promise<void> => {
    const muted = JSON.parse(localStorage.getItem('bavel_muted_discussions') || '[]');
    if (!muted.includes(targetId)) {
      muted.push(targetId);
      localStorage.setItem('bavel_muted_discussions', JSON.stringify(muted));
    }
  },

  blockUser: async (userId: string, targetUserId: string): Promise<void> => {
    await blockUserInSupabase(userId, targetUserId);
  },

  reportUser: async (userId: string, targetUserId: string, reason: string): Promise<void> => {
    await reportUserInSupabase(userId, targetUserId, reason);
  },

  loadMoreMessages: async (userId: string, targetId: string): Promise<Message[]> => {
    const matches = await fetchMatchesFromSupabase(userId);
    const match = matches.find((item: any) =>
      (item.user_id === userId && item.matched_user_id === targetId) ||
      (item.user_id === targetId && item.matched_user_id === userId)
    );
    if (!match) return [];
    const matchId = String(match.id);
    const dbMessages = await fetchMessagesFromSupabase(matchId, userId);
    return (dbMessages || []).map((m: any) => ({
      id: String(m.id || m.timestamp),
      text: m.text,
      sender: m.sender_id === userId ? 'user' : 'other',
      timestamp: new Date(m.timestamp),
      read: m.is_read !== false,
      type: m.audio_url ? 'voice' : (m.text && m.text.startsWith('data:image/') ? 'image' : 'text')
    }));
  },

  subscribeToDiscussion: (userId: string, targetUserId: string, onMessage: (msg: any) => void) => {
    const client = getSupabase();
    if (!client) return { unsubscribe: () => {} };

    let channel: any = null;
    void fetchMatchesFromSupabase(userId).then((matches) => {
      const match = matches.find((item: any) =>
        (item.user_id === userId && item.matched_user_id === targetUserId) ||
        (item.user_id === targetUserId && item.matched_user_id === userId)
      );
      if (!match) return;
      const matchId = String(match.id);
      channel = client
        .channel(`discussion_${matchId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `match_id=eq.${matchId}`,
        }, (payload) => {
          if (payload.new) onMessage(payload.new);
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `match_id=eq.${matchId}`,
        }, (payload) => {
          if (payload.new) onMessage(payload.new);
        })
        .subscribe();
    });

    return { unsubscribe: () => { if (channel) client.removeChannel(channel); } };
  },

  subscribeToDiscussionsRealtime: (userId: string, onChange: () => void) => {
    const client = getSupabase();
    if (!client) return { unsubscribe: () => {} };

    const channel = client
      .channel(`discussions_realtime_${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => {
          onChange();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches' },
        () => {
          onChange();
        }
      )
      .subscribe();

    return {
      unsubscribe: () => {
        client.removeChannel(channel);
      }
    };
  }
};
