import React from 'react';
import { Send, Mic, Smile, Plus, MessageSquare, Sparkles } from 'lucide-react';

interface ChatInputProps {
  inputText: string;
  setInputText: (text: string) => void;
  onSend: (text: string) => void;
  onRecord: () => void;
  isRecording: boolean;
  recordingSeconds: number;
  onCancelRecording: () => void;
  onStopRecording: () => void;
  onEmojiToggle: () => void;
  showEmojiPicker: boolean;
  onMediaToggle: () => void;
  showMediaDrawer: boolean;
  waitingForReply: boolean;
  onWaitingReply: () => void;
  onQuestionModal: () => void;
  profile: any;
  bypassedPopularWall?: boolean;
  setBypassedPopularWall?: (b: boolean) => void;
  onOpenPremium?: (slideId?: string) => void;
  hasExchangedMessages?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  inputText,
  setInputText,
  onSend,
  onRecord,
  isRecording,
  recordingSeconds,
  onCancelRecording,
  onStopRecording,
  onEmojiToggle,
  showEmojiPicker,
  onMediaToggle,
  showMediaDrawer,
  onQuestionModal,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend(inputText);
    }
  };

  return (
    <div className="pt-2 pb-6 px-3 bg-white border-t border-gray-100 flex flex-col shrink-0">
      {isRecording ? (
        <div className="flex items-center justify-between px-4 py-2.5 bg-red-50 rounded-full border border-red-100">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-semibold text-red-600">
              Enregistrement... {recordingSeconds}s
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onCancelRecording}
              className="px-3 py-1 text-xs font-bold text-gray-500 hover:text-gray-700"
            >
              Annuler
            </button>
            <button
              onClick={onStopRecording}
              className="px-4 py-1.5 bg-red-500 text-white rounded-full text-xs font-bold shadow-xs"
            >
              Envoyer
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center space-x-2">
          {/* Plus button (Left) */}
          <button
            onClick={onMediaToggle}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors shrink-0 ${
              showMediaDrawer ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'
            }`}
            aria-label="Ajouter un média"
          >
            <Plus className="w-6 h-6" strokeWidth={2.2} />
          </button>

          {/* White Capsule Input (Center) */}
          <div className="flex-1 relative flex items-center bg-white border border-gray-300 rounded-full px-4 py-2 shadow-xs">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Votre message..."
              className="w-full bg-transparent text-black text-[15px] outline-none pr-8 placeholder:text-gray-400"
            />
            <button
              onClick={onEmojiToggle}
              className="absolute right-3.5 text-black hover:opacity-75 transition-opacity"
              aria-label="Emojis"
            >
              <Smile className="w-6 h-6 text-black" strokeWidth={1.8} />
            </button>
          </div>

          {/* Purple Face Button & Voice Mic (Right) */}
          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              onClick={onEmojiToggle}
              className="w-9 h-9 bg-[#E9D5FF] rounded-full flex items-center justify-center text-purple-950 shrink-0 active:scale-95 transition-transform"
              aria-label="Sélectionner un autocollant/emoji"
            >
              <Smile className="w-5 h-5 text-purple-950 fill-purple-950/20" strokeWidth={2} />
            </button>

            {inputText.trim() ? (
              <button
                onClick={() => onSend(inputText)}
                className="w-9 h-9 bg-[#1a1a1a] text-white rounded-full flex items-center justify-center shadow-sm shrink-0 active:scale-95 transition-transform"
                aria-label="Envoyer"
              >
                <Send className="w-4.5 h-4.5 text-white" />
              </button>
            ) : (
              <button
                onClick={onRecord}
                className="w-9 h-9 flex items-center justify-center text-black shrink-0 hover:opacity-75 transition-opacity active:scale-95"
                aria-label="Message vocal"
              >
                <Mic className="w-6 h-6 text-black" strokeWidth={2.2} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

