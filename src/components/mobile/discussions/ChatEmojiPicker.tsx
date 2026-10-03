import React from 'react';

interface ChatEmojiPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
  onSendGif: (url: string) => void;
}

const EMOJIS = ['❤️', '🔥', '😄', '😍', '🌹', '✨', '👋', '🥂', '😜', '💋', '🎉', '☕'];

export const ChatEmojiPicker: React.FC<ChatEmojiPickerProps> = ({
  isOpen,
  onSelectEmoji,
}) => {
  if (!isOpen) return null;

  return (
    <div className="bg-gray-50 border-t border-gray-100 p-3 flex flex-wrap gap-2 max-h-36 overflow-y-auto">
      {EMOJIS.map((e) => (
        <button
          key={e}
          onClick={() => onSelectEmoji(e)}
          className="text-2xl p-2 hover:bg-white rounded-xl transition-colors active:scale-90"
        >
          {e}
        </button>
      ))}
    </div>
  );
};
