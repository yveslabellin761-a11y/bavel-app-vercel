import { useState, useCallback } from 'react';

interface UseMediaPickerProps {
  matchId: string;
  currentUserId: string;
  onSendMessage: (text: string, type: string, extra?: any) => void;
}

export function useMediaPicker({ onSendMessage }: UseMediaPickerProps) {
  const [showMediaDrawer, setShowMediaDrawer] = useState(false);
  const [isEphemeralToggle, setIsEphemeralToggle] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleSendImage = useCallback(
    (base64Image: string, isEphemeralOverride?: boolean) => {
      const isEphemeral = isEphemeralOverride ?? isEphemeralToggle;
      onSendMessage(base64Image, 'image', {
        isEphemeral,
        isViewed: false,
      });
      setShowMediaDrawer(false);
    },
    [isEphemeralToggle, onSendMessage]
  );

  const handleSendGif = useCallback(
    (gifUrl: string) => {
      onSendMessage(gifUrl, 'gif');
      setShowEmojiPicker(false);
    },
    [onSendMessage]
  );

  return {
    showMediaDrawer,
    setShowMediaDrawer,
    isEphemeralToggle,
    setIsEphemeralToggle,
    showEmojiPicker,
    setShowEmojiPicker,
    handleSendImage,
    handleSendGif,
  };
}
