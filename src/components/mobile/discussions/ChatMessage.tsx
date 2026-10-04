import React from 'react';
import { motion } from 'motion/react';
import { Check, CheckCheck, Flag, Flame, Sparkles, Eye, Shield, MapPin, Phone, Video, Trash2 } from 'lucide-react';
import { Message } from '../types';
import { VoiceNoteBubble } from '../Modals';

interface ChatMessageProps {
  message: Message;
  isMe: boolean;
  profileName?: string;
  onReport?: () => void;
  onReadReceiptClick?: () => void;
  isLastThemMessage?: boolean;
  onPreviewImage?: (url: string) => void;
  onViewEphemeral?: () => void;
  isEphemeralViewing?: boolean;
  onRequestRevealPrivateImage?: (message: Message) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isMe,
  profileName = 'Marianne',
  onReport,
  onReadReceiptClick,
  isLastThemMessage,
  onPreviewImage,
  onViewEphemeral,
  isEphemeralViewing,
  onRequestRevealPrivateImage,
}) => {
  const renderContent = () => {
    switch (message.type) {
      case 'voice':
        return <VoiceNoteBubble msg={message} isMe={isMe} />;

      case 'video':
        return (
          <motion.div 
            whileTap={{ scale: 0.98 }}
            className={`max-w-[80%] rounded-[20px] overflow-hidden shadow-md my-1 border border-gray-200 bg-black p-1 flex flex-col ${
              isMe ? 'items-end' : 'items-start'
            }`}
          >
            <video 
              src={message.text} 
              controls 
              playsInline 
              className="max-h-[260px] w-full rounded-[16px] object-cover bg-black"
            />
            <div className="flex items-center justify-between w-full px-2 pt-1 text-[11px] text-gray-400 font-extrabold select-none">
              <span className="flex items-center gap-1 text-emerald-400">
                <Video className="w-3.5 h-3.5" />
                Vidéo
              </span>
              <span>{message.time}</span>
            </div>
          </motion.div>
        );

      case 'gif':
        return (
          <motion.div 
            whileTap={{ scale: 0.97 }}
            className={`max-w-[70%] rounded-[20px] overflow-hidden shadow-xs my-1 border border-gray-200 bg-black p-1 flex flex-col ${
              isMe ? 'items-end' : 'items-start'
            }`}
          >
            <img 
              src={message.text} 
              alt="GIF Giphy" 
              className="max-h-[190px] w-auto max-w-full rounded-[16px] object-cover" 
              referrerPolicy="no-referrer"
            />
            <div className="flex items-center space-x-1.5 px-2 pt-1 text-[10px] text-gray-400 font-extrabold select-none">
              <span className="bg-white/20 text-white px-1 rounded text-[9px] font-black tracking-tighter">GIPHY</span>
              <span>{message.time}</span>
            </div>
          </motion.div>
        );

      case 'image':
        if (message.isEphemeral) {
          if (message.isViewed || isEphemeralViewing) {
            return (
              <div className="flex items-center space-x-2 bg-gray-100 text-gray-500 border border-gray-200 px-4 py-2.5 rounded-[22px] text-[13px] font-semibold my-1">
                <Flame className="w-4 h-4 text-orange-500 shrink-0" />
                <span>Photo expirée (Vue unique)</span>
              </div>
            );
          }
          return (
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={onViewEphemeral}
              className="flex items-center space-x-2.5 bg-gradient-to-r from-purple-600 via-pink-600 to-red-500 text-white px-4 py-3 rounded-[22px] font-extrabold text-[13.5px] shadow-md my-1 active:scale-95 transition-transform cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-yellow-300 animate-spin shrink-0" />
              <span>Photo éphémère - Appuyer pour voir</span>
              <Eye className="w-4 h-4 ml-0.5 shrink-0" />
            </motion.button>
          );
        }

        return (
          <motion.div 
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              if (message.isPrivateContent) {
                onRequestRevealPrivateImage?.(message);
              } else {
                onPreviewImage?.(message.text || '');
              }
            }}
            className={`relative max-w-[75%] rounded-[18px] overflow-hidden shadow-xs my-1 border border-gray-150/40 bg-white p-1 flex flex-col ${
              isMe ? 'items-end' : 'items-start'
            } cursor-pointer transition-shadow hover:shadow-md`}
          >
            <div className="relative overflow-hidden rounded-[14px]">
              <img 
                src={message.text} 
                alt="Image" 
                className={`max-h-[200px] w-auto max-w-full rounded-[14px] object-cover transition-all duration-300 ${
                  message.isPrivateContent ? 'blur-2xl scale-110 brightness-75' : ''
                }`} 
                referrerPolicy="no-referrer"
              />
              {message.isPrivateContent && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-black/40 backdrop-blur-md text-white rounded-[14px]">
                  <Shield className="w-7 h-7 text-rose-400 mb-1 fill-rose-500/20 stroke-[2.5]" />
                  <span className="text-[11.5px] font-extrabold text-rose-200">Private Detector™</span>
                  <span className="text-[10px] text-gray-200 mt-0.5 leading-tight font-medium">
                    Image intime potentielle floutée automatiquement.
                  </span>
                  <span className="mt-2 px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white rounded-full text-[10px] font-black border border-white/30">
                    Appuyer pour afficher
                  </span>
                </div>
              )}
            </div>
            <div className="text-[10px] text-gray-400 font-extrabold px-1 pt-1.5 select-none flex items-center justify-between w-full">
              <span>{message.time}</span>
              {message.isPrivateContent && (
                <span className="text-[9px] text-purple-600 font-black px-1.5 py-0.5 bg-purple-50 rounded">
                  🛡️ Private Detector™
                </span>
              )}
            </div>
          </motion.div>
        );

      case 'location':
        return (
          <div className="flex items-center space-x-2 bg-purple-50 border border-purple-200/60 px-4 py-2.5 rounded-[20px] text-[14px] text-purple-950 font-bold shadow-xs my-1">
            <MapPin className="w-4 h-4 text-purple-600 fill-purple-600 shrink-0" />
            <span>{message.text}</span>
          </div>
        );

      case 'call':
        return (
          <div className="flex items-center space-x-2.5 bg-gray-50 border border-gray-100/80 px-4 py-2 rounded-2xl text-[13px] text-gray-500 font-semibold shadow-xs mx-auto my-1 select-none">
            {message.callType === 'video' ? (
              <Video className="w-4 h-4 text-gray-500" strokeWidth={2.5} />
            ) : (
              <Phone className="w-4 h-4 text-gray-500" strokeWidth={2.5} />
            )}
            <span>
              {message.duration && message.duration > 0 
                ? `Appel ${message.callType === 'video' ? 'vidéo' : 'vocal'} terminé (${formatDuration(message.duration)})`
                : `Appel ${message.callType === 'video' ? 'vidéo' : 'vocal'} manqué`
              }
            </span>
          </div>
        );

      case 'system_block':
        return (
          <div className="flex flex-col items-start w-full max-w-[85%] my-2">
            <div className="bg-white border border-gray-150/50 px-4 py-3.5 rounded-[22px] rounded-tl-[4px] text-[14.5px] text-black font-medium leading-relaxed shadow-xs">
              {message.text}
            </div>
            <div className="text-[12px] text-gray-400 mt-1.5 pl-1.5 font-bold tracking-tight">
              L'équipe Bavel
            </div>
          </div>
        );

      default:
        return (
          <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%]`}>
            <div className={`px-4.5 py-3 rounded-[20px] ${
              isMe 
                ? 'bg-[#E9D5FF] text-black rounded-tr-[4px]' 
                : 'bg-gray-100 text-black rounded-tl-[4px]'
            } text-[15.5px] font-normal leading-relaxed shadow-xs`}>
              {message.text}
            </div>
            {isMe && message.status !== 'read' && (
              <button
                type="button"
                onClick={onReadReceiptClick}
                className="text-[13px] text-black font-normal underline mt-1.5 cursor-pointer hover:opacity-80 transition-opacity self-end text-right"
              >
                Vous voulez savoir si {profileName} a lu votre message ?
              </button>
            )}
          </div>
        );
    }
  };

  return (
    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} w-full`}>
      {renderContent()}
      
      {/* Status */}
      {isMe && message.type !== 'system_block' && (
        <div className="flex items-center space-x-1 text-gray-400 text-[11px] font-bold mt-1 self-end select-none pr-1">
          <span>{message.time}</span>
          {message.status === 'sent' && (
            <Check className="w-3.5 h-3.5 text-gray-400" strokeWidth={2.5} />
          )}
          {message.status === 'delivered' && (
            <CheckCheck className="w-3.5 h-3.5 text-gray-400" strokeWidth={2.5} />
          )}
          {message.status === 'read' && (
            <div className="flex items-center space-x-0.5 text-blue-500">
              <CheckCheck className="w-3.5 h-3.5 text-blue-500" strokeWidth={3} />
              <span className="text-[10px] font-extrabold">Lu</span>
            </div>
          )}
        </div>
      )}

      {/* Report button */}
      {!isMe && isLastThemMessage && message.type !== 'system_block' && (
        <button
          onClick={onReport}
          className="flex items-center space-x-1.5 text-gray-500 hover:text-black text-[13px] font-medium mt-1.5 pl-1 cursor-pointer select-none transition-colors active:scale-95 self-start"
          type="button"
        >
          <Flag className="w-3.5 h-3.5 text-gray-600 fill-gray-600 shrink-0" />
          <span className="underline decoration-gray-400 underline-offset-2 text-gray-600">Signaler</span>
        </button>
      )}
    </div>
  );
};

const formatDuration = (secs: number): string => {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
};