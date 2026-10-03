import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { ImageIcon, MapPin, Eye, Camera } from 'lucide-react';

interface ChatMediaDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isEphemeral: boolean;
  setIsEphemeral: (b: boolean) => void;
  onSendImage: (base64: string, isEphemeral?: boolean) => void;
  onSendLocation: () => void;
}

export const ChatMediaDrawer: React.FC<ChatMediaDrawerProps> = ({
  isOpen,
  onClose,
  isEphemeral,
  setIsEphemeral,
  onSendImage,
  onSendLocation,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          onSendImage(reader.result, isEphemeral);
          onClose();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      className="bg-white border-t border-gray-100 p-4 rounded-t-3xl shadow-xl flex flex-col space-y-4"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />

      <div className="flex items-center justify-between pb-2 border-b border-gray-100">
        <span className="text-sm font-bold text-gray-900">Partager un média</span>
        <button
          onClick={() => setIsEphemeral(!isEphemeral)}
          className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
            isEphemeral ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Éphémère {isEphemeral ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors"
        >
          <ImageIcon className="w-6 h-6 text-purple-600 mb-1" />
          <span className="text-xs font-semibold text-gray-700">Galerie</span>
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors"
        >
          <Camera className="w-6 h-6 text-rose-500 mb-1" />
          <span className="text-xs font-semibold text-gray-700">Appareil</span>
        </button>

        <button
          onClick={() => {
            onSendLocation();
            onClose();
          }}
          className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors"
        >
          <MapPin className="w-6 h-6 text-emerald-500 mb-1" />
          <span className="text-xs font-semibold text-gray-700">Position</span>
        </button>
      </div>
    </motion.div>
  );
};
