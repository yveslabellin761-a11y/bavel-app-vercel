import React from 'react';
import { motion } from 'motion/react';
import { AlertCircle, X } from 'lucide-react';

interface ChatRudeWarningProps {
  data: {
    originalText: string;
    reason: string;
    suggestedReformulation?: string;
  } | null;
  onClose: () => void;
  onAccept: (text: string) => void;
}

export const ChatRudeWarning: React.FC<ChatRudeWarningProps> = ({ data, onClose, onAccept }) => {
  if (!data) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-[220] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col items-center text-center space-y-4">
        <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>

        <h3 className="text-lg font-bold text-gray-900">Message potentiellement irrespectueux</h3>
        <p className="text-sm text-gray-600 leading-relaxed">{data.reason}</p>

        {data.suggestedReformulation && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-left w-full">
            <span className="text-xs font-bold text-amber-800 uppercase block mb-1">
              Suggestion reformulée :
            </span>
            <p className="text-sm text-amber-900 italic">"{data.suggestedReformulation}"</p>
          </div>
        )}

        <div className="flex flex-col w-full space-y-2 pt-2">
          {data.suggestedReformulation && (
            <button
              onClick={() => onAccept(data.suggestedReformulation!)}
              className="w-full bg-purple-600 text-white font-bold py-3 rounded-full hover:bg-purple-700 transition-colors"
            >
              Envoyer la version reformulée
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full bg-gray-100 text-gray-700 font-bold py-3 rounded-full hover:bg-gray-200 transition-colors"
          >
            Modifier mon message
          </button>
        </div>
      </div>
    </motion.div>
  );
};
