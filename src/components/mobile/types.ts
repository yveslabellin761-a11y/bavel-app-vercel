export interface CallState {
  type: 'audio' | 'video';
  status: 'ringing' | 'connected' | 'ended' | string;
  duration: number;
}

export interface Message {
  id: number | string;
  text?: string;
  sender?: 'me' | 'them' | string;
  time?: string;
  type?: 'text' | 'voice' | 'call' | 'image' | 'gif' | 'location' | 'system_block' | string;
  duration?: number;
  callType?: 'audio' | 'video';
  waveformData?: number[];
  status?: 'sent' | 'delivered' | 'read';
  isEphemeral?: boolean;
  isViewed?: boolean;
  isPrivateContent?: boolean;
}

export interface ChatConversationViewProps {
  profile?: any;
  discussion?: any;
  onClose: () => void;
  onMoreMenu?: () => void;
  onOpenPremium?: (slideId?: string) => void;
  onDelete?: () => void;
  onRechargeForReadReceipt?: (name: string) => void;
  onSendMessage?: (text: string, type?: any) => void;
  onStartVoiceCall?: () => void;
  onStartVideoCall?: () => void;
  onLoadMore?: (id: string) => void;
  onOpenUserProfile?: () => void;
  onOpenActionMenu?: () => void;
  formatDate?: (date: any) => string;
  [key: string]: any;
}
