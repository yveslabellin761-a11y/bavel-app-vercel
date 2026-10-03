import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChatMessage } from './ChatMessage';
import { Message } from '../types';

interface ChatMessageListProps {
  messages: Message[];
  profile: any;
  isTyping: boolean;
  waitingForReply: boolean;
  onReport: () => void;
  onOpenPremium?: (slideId?: string) => void;
  hasExchangedMessages: boolean;
  previewImageUrl: string | null;
  setPreviewImageUrl: (url: string | null) => void;
  viewingEphemeralMsg: Message | null;
  setViewingEphemeralMsg: (msg: Message | null) => void;
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  profile,
  isTyping,
  waitingForReply,
  onReport,
  onOpenPremium,
  hasExchangedMessages,
  previewImageUrl,
  setPreviewImageUrl,
  viewingEphemeralMsg,
  setViewingEphemeralMsg,
}) => {
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const lastThemMsgIndex = React.useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender === 'them' && messages[i].type !== 'system_block') {
        return i;
      }
    }
    return -1;
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto bg-white px-4 py-2 flex flex-col">
      <div className="text-center my-4">
        <span className="text-gray-400 text-[13px] font-medium tracking-tight">
          {profile.matchDate || "20 août 2026"}
        </span>
      </div>

      <div className="flex flex-col space-y-4">
        {messages.map((msg, index) => (
          <div key={msg.id} className="flex flex-col w-full">
            <ChatMessage
              message={msg}
              isMe={msg.sender === 'me'}
              profileName={profile.name}
              onReport={onReport}
              onReadReceiptClick={() => onOpenPremium?.('read_receipt')}
              isLastThemMessage={msg.sender === 'them' && index === lastThemMsgIndex}
              onPreviewImage={(url) => setPreviewImageUrl(url)}
              onViewEphemeral={() => setViewingEphemeralMsg(msg)}
              isEphemeralViewing={viewingEphemeralMsg?.id === msg.id}
            />
          </div>
        ))}

        {/* Typing Indicator */}
        <AnimatePresence>
          {isTyping && (
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className="flex items-center space-x-2.5 bg-gray-100 border border-gray-200/80 px-4 py-2.5 rounded-[22px] rounded-tl-[4px] w-fit my-2 shadow-xs"
            >
              <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 border border-gray-300">
                <img src={profile.img} alt={profile.name} className="w-full h-full object-cover" />
              </div>
              <span className="text-[13px] font-bold text-gray-700">
                {profile.name} est en train d'écrire
              </span>
              <div className="flex items-center space-x-1 pl-0.5">
                <div className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-bounce" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1" />
      <div ref={messagesEndRef} />

      {/* Notification Prompt */}
      {!hasExchangedMessages && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 mb-4 bg-[#f9f9f9] rounded-[24px] p-6 relative flex flex-col items-center text-center shadow-sm border border-gray-100"
        >
          <h3 className="text-[17px] font-bold text-black mb-1.5 tracking-tight">
            Vous voulez recevoir une réponse ?
          </h3>
          <p className="text-[14px] text-gray-500 font-medium leading-snug px-1 mb-5">
            Démarquez-vous en plaçant votre message en tout premier dans sa liste.
          </p>

          <button 
            onClick={() => onOpenPremium?.('priority')}
            className="w-[80%] max-w-[240px] bg-[#1a1a1a] text-white font-bold py-3 rounded-[24px] text-[15px] hover:bg-black transition-colors"
          >
            Message prioritaire
          </button>
        </motion.div>
      )}
    </div>
  );
};
