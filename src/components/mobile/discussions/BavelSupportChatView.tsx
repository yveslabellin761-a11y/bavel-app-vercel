import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, MoreHorizontal, Send, Smile } from 'lucide-react';
import { bavelSupportService, BavelSupportMessage } from '../../../services/bavelSupportService';

export function BavelAvatar({ size = 44 }: { size?: number }) {
  return (
    <div 
      className="rounded-full flex items-center justify-center shrink-0 shadow-xs border border-purple-100 select-none overflow-hidden"
      style={{ width: size, height: size, backgroundColor: '#EDE4FF' }}
    >
      <span 
        className="font-black tracking-tighter text-[#e20030] font-sans"
        style={{ fontSize: Math.round(size * 0.32) }}
      >
        Bavel
      </span>
    </div>
  );
}

interface BavelSupportChatViewProps {
  userName?: string;
  onClose: () => void;
  onNavigateToTab?: (tab: string) => void;
  onOpenPremium?: () => void;
}

export const BavelSupportChatView: React.FC<BavelSupportChatViewProps> = ({
  userName = 'Steven',
  onClose,
  onNavigateToTab,
  onOpenPremium,
}) => {
  const [messages, setMessages] = useState<BavelSupportMessage[]>(() => {
    return bavelSupportService.getMessages();
  });

  const [inputText, setInputText] = useState('');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Favorites tracking for Bavel
  const [isFavorite, setIsFavorite] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('bavel_starred_discussion_ids');
      if (!saved) return false;
      const arr = JSON.parse(saved);
      return arr.includes('bavel_official');
    } catch {
      return false;
    }
  });

  const handleToggleFavorite = () => {
    setShowMoreMenu(false);
    try {
      const saved = localStorage.getItem('bavel_starred_discussion_ids');
      let arr: string[] = saved ? JSON.parse(saved) : [];
      let nextFav = false;
      if (arr.includes('bavel_official')) {
        arr = arr.filter((id: string) => id !== 'bavel_official');
        nextFav = false;
        setFeedbackToast('Retiré des favoris.');
      } else {
        arr.push('bavel_official');
        nextFav = true;
        setFeedbackToast('Ajouté aux favoris ⭐');
      }
      setIsFavorite(nextFav);
      localStorage.setItem('bavel_starred_discussion_ids', JSON.stringify(arr));
      window.dispatchEvent(new CustomEvent('bavel_favorites_updated', { detail: { id: 'bavel_official', isFavorite: nextFav } }));
      window.dispatchEvent(new CustomEvent('bavel_discussions_updated'));
      setTimeout(() => setFeedbackToast(null), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const unsubscribe = bavelSupportService.subscribe(() => {
      setMessages(bavelSupportService.getMessages());
    });
    const load = async () => {
      try {
        await bavelSupportService.loadConversation();
      } catch (error) {
        setFeedbackToast(error instanceof Error ? error.message : 'Conversation support indisponible.');
      } finally {
        setLoading(false);
      }
    };
    void load();
    const refreshTimer = window.setInterval(() => {
      void bavelSupportService.loadConversation().catch(error => {
        console.error('Actualisation support impossible:', error);
      });
    }, 10000);
    return () => {
      window.clearInterval(refreshTimer);
      unsubscribe();
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleActionClick = (actionType: 'encounters' | 'premium' | 'profile') => {
    if (actionType === 'encounters') {
      onClose();
      onNavigateToTab?.('encounters');
    } else if (actionType === 'premium') {
      onOpenPremium?.();
    } else if (actionType === 'profile') {
      onClose();
      onNavigateToTab?.('profile');
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || sending) return;
    const userText = inputText.trim();
    setSending(true);
    try {
      await bavelSupportService.sendMessage(userText);
      setInputText('');
    } catch (error) {
      setFeedbackToast(error instanceof Error ? error.message : 'Envoi du message impossible.');
    } finally {
      setSending(false);
    }
  };

  // Helper to render text with interactive clickable underlined links
  const renderMessageText = (msg: BavelSupportMessage) => {
    const fullText = msg.text;

    if (!msg.actionLinks || msg.actionLinks.length === 0) {
      return <span className="whitespace-pre-line">{fullText}</span>;
    }

    // Process action links
    const parts: Array<{ type: 'text' | 'link'; content: string; actionType?: 'encounters' | 'premium' | 'profile' }> = [];
    let currentIdx = 0;

    // Find the first matching action link
    msg.actionLinks.forEach(link => {
      const idx = fullText.indexOf(link.targetText, currentIdx);
      if (idx !== -1) {
        if (idx > currentIdx) {
          parts.push({ type: 'text', content: fullText.substring(currentIdx, idx) });
        }
        parts.push({ type: 'link', content: link.targetText, actionType: link.actionType });
        currentIdx = idx + link.targetText.length;
      }
    });

    if (currentIdx < fullText.length) {
      parts.push({ type: 'text', content: fullText.substring(currentIdx) });
    }

    return (
      <span className="whitespace-pre-line">
        {parts.map((p, i) => {
          if (p.type === 'link' && p.actionType) {
            return (
              <u
                key={`link-${i}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleActionClick(p.actionType!);
                }}
                className="underline font-bold text-black hover:text-[#e20030] cursor-pointer transition-colors active:opacity-70"
              >
                {p.content}
              </u>
            );
          }
          return <React.Fragment key={`text-${i}`}>{p.content}</React.Fragment>;
        })}
      </span>
    );
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      className="fixed inset-0 bg-white z-[130] flex flex-col h-[100dvh]"
    >
      {/* Header Bar */}
      <div className="bg-white pt-8 sm:pt-10 pb-2.5 sm:pb-3 px-3.5 sm:px-4 flex items-center justify-between border-b border-gray-100 shrink-0">
        <div className="flex items-center space-x-2.5 sm:space-x-3">
          <button 
            onClick={onClose} 
            className="p-1 -ml-1.5 hover:bg-gray-100 active:scale-95 rounded-full transition-colors cursor-pointer"
            aria-label="Retour"
          >
            <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7 text-black" strokeWidth={2.5} />
          </button>

          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <BavelAvatar size={38} />
            <div>
              <div className="flex items-center space-x-1.5">
                <h2 className="text-[15px] sm:text-[16px] font-bold text-black leading-tight">Bavel</h2>
                <span className="text-[8.5px] sm:text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 uppercase tracking-wide">
                  Officiel
                </span>
              </div>
              <p className="text-[11px] sm:text-[11.5px] text-gray-500 font-medium leading-tight mt-0.5">Assistance & Astuces</p>
            </div>
          </div>
        </div>

        <button 
          onClick={() => setShowMoreMenu(!showMoreMenu)} 
          className="p-1.5 hover:bg-gray-100 rounded-full transition-colors cursor-pointer text-black"
          aria-label="Menu"
        >
          <MoreHorizontal className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </div>

      {/* ========================================================================= */}
      {/* Menu unique des 3 points (...) de Bavel : Ajouter aux favoris & Voir la promo */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showMoreMenu && (
          <div className="fixed inset-0 z-[300] flex flex-col justify-end p-4 pb-6 sm:pb-8 select-none">
            {/* Backdrop sombre */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/55 backdrop-blur-2xs cursor-pointer"
              onClick={() => setShowMoreMenu(false)}
            />

            {/* Floating Card Panel avec uniquement les 2 options demandées */}
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="relative bg-white rounded-[22px] sm:rounded-[26px] w-full max-w-sm sm:max-w-md mx-auto overflow-hidden shadow-2xl z-10 select-none divide-y divide-gray-100"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Option 1: Ajouter aux favoris / Retirer des favoris */}
              <button
                type="button"
                onClick={handleToggleFavorite}
                className="w-full py-4.5 text-center text-[17px] font-normal text-black active:bg-gray-50 transition-colors cursor-pointer"
              >
                {isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
              </button>

              {/* Option 2: Voir la promo */}
              <button
                type="button"
                onClick={() => {
                  setShowMoreMenu(false);
                  onOpenPremium?.();
                }}
                className="w-full py-4.5 text-center text-[17px] font-normal text-black active:bg-gray-50 transition-colors cursor-pointer"
              >
                Voir la promo
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Feedback */}
      <AnimatePresence>
        {feedbackToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-16 inset-x-0 mx-auto w-fit max-w-[90%] bg-black/90 text-white px-4 py-2.5 rounded-full text-[13.5px] font-semibold shadow-2xl z-[350] pointer-events-none text-center backdrop-blur-md"
          >
            {feedbackToast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto px-3.5 sm:px-4 py-3 space-y-3 bg-[#ffffff] scrollbar-hide">
        {loading && (
          <p className="py-4 text-center text-sm text-gray-500">Chargement de la conversation…</p>
        )}
        {!loading && messages.length === 0 && (
          <p className="py-4 text-center text-sm text-gray-500">Écrivez à l’équipe Bavel pour ouvrir une demande de support.</p>
        )}
        {messages.map((msg, index) => (
          <React.Fragment key={msg.id || index}>
            {/* Date Separator Header if defined */}
            {msg.dateHeader && (
              <div className="flex items-center justify-center my-3">
                <span className="text-[11px] sm:text-[11.5px] text-gray-400 font-semibold px-2.5 py-0.5 bg-gray-50 rounded-full">
                  {msg.dateHeader}
                </span>
              </div>
            )}

            {/* Message Bubble */}
            <div className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} w-full`}>
              <div 
                className={`max-w-[88%] sm:max-w-[85%] px-3.5 py-2.5 rounded-[18px] sm:rounded-[20px] ${
                  msg.sender === 'user' 
                    ? 'bg-[#F0E6FF] text-black rounded-tr-[4px]' 
                    : 'bg-[#f4f4f6] text-black rounded-tl-[4px]'
                } text-[13px] sm:text-[13.5px] font-normal leading-[1.45] shadow-2xs`}
              >
                {renderMessageText(msg)}
              </div>

              {msg.time && (
                <span className="text-[9.5px] sm:text-[10px] text-gray-400 font-medium mt-1 px-1">
                  {msg.time}
                </span>
              )}
            </div>
          </React.Fragment>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form
        className="flex items-end gap-2 border-t border-gray-100 bg-white p-3 pb-[max(12px,env(safe-area-inset-bottom))]"
        onSubmit={event => {
          event.preventDefault();
          void handleSend();
        }}
      >
        <textarea
          value={inputText}
          onChange={event => setInputText(event.target.value)}
          maxLength={5000}
          rows={1}
          aria-label="Votre message au support"
          placeholder="Écrire à l’équipe Bavel…"
          className="max-h-28 min-h-11 flex-1 resize-y rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none focus:border-purple-400"
        />
        <button
          type="submit"
          disabled={sending || !inputText.trim()}
          aria-label="Envoyer le message"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-purple-600 text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="h-5 w-5" />
        </button>
      </form>
    </motion.div>
  );
};
