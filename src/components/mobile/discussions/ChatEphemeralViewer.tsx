import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { Message } from '../types';

interface ChatEphemeralViewerProps {
  message: Message | null;
  onClose: () => void;
}

export const ChatEphemeralViewer: React.FC<ChatEphemeralViewerProps> = ({ message, onClose }) => {
  const [seconds, setSeconds] = useState(5);

  useEffect(() => {
    if (!message) return;
    setSeconds(5);
    const interval = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[250] bg-black flex flex-col items-center justify-between p-6"
    >
      <div className="w-full flex items-center justify-between text-white">
        <span className="text-sm font-bold bg-white/20 px-3 py-1 rounded-full">
          Disparaît dans {seconds}s
        </span>
        <button onClick={onClose} className="p-2">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="my-auto max-w-sm w-full rounded-2xl overflow-hidden shadow-2xl">
        <img src={message.text} alt="Éphémère" className="w-full h-auto object-cover" />
      </div>
    </motion.div>
  );
};
