import { authFetch } from '../lib/authFetch';

export interface BavelSupportMessage {
  id: string;
  sender: 'bavel' | 'user';
  text: string;
  time?: string;
  dateHeader?: string;
  actionLinks?: Array<{
    targetText: string;
    actionType: 'encounters' | 'premium' | 'profile';
  }>;
}

interface SupportConversation {
  ticket: { id: string; status: 'open' | 'in_progress' } | null;
  messages: BavelSupportMessage[];
}

let conversation: SupportConversation = { ticket: null, messages: [] };
const listeners = new Set<() => void>();

export const bavelSupportService = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getMessages(): BavelSupportMessage[] {
    return conversation.messages;
  },

  async loadConversation(): Promise<void> {
    const response = await authFetch('/api/support/tickets');
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || 'Conversation support indisponible.');
    conversation = {
      ticket: payload?.ticket || null,
      messages: Array.isArray(payload?.messages) ? payload.messages : []
    };
    listeners.forEach(listener => listener());
  },

  async sendMessage(text: string): Promise<void> {
    const body = text.trim();
    if (!body) return;
    const response = await authFetch('/api/support/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body, ticketId: conversation.ticket?.id })
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || 'Envoi du message impossible.');
    conversation = {
      ticket: { id: payload.ticketId, status: 'open' },
      messages: [...conversation.messages, payload.message]
    };
    listeners.forEach(listener => listener());
  }
};
