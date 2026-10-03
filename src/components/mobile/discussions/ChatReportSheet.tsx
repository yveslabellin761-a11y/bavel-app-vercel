import React from 'react';
import { motion } from 'motion/react';

interface ChatReportSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onReport: () => void;
  onDelete: () => void;
}

export const ChatReportSheet: React.FC<ChatReportSheetProps> = ({
  isOpen,
  onClose,
  onReport,
  onDelete,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[320] flex flex-col justify-end">
      {/* Backdrop sombre */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/55 backdrop-blur-2xs cursor-pointer"
        onClick={onClose}
      />

      {/* Menu Action Sheet conforme à IMG_4446.PNG */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative bg-white rounded-t-[28px] sm:rounded-t-[32px] w-full max-w-lg mx-auto overflow-hidden shadow-2xl z-10 select-none pb-8 sm:pb-9 pt-1.5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Signaler le contenu */}
        <button
          type="button"
          onClick={onReport}
          className="w-full py-4 sm:py-4.5 px-4 text-center text-[17px] sm:text-[18px] font-normal text-black active:bg-gray-100/70 transition-colors cursor-pointer"
        >
          Signaler le contenu
        </button>

        {/* Ligne de séparation fine */}
        <div className="w-full h-[1px] bg-gray-100/80" />

        {/* 2. Supprimer l'utilisateur */}
        <button
          type="button"
          onClick={onDelete}
          className="w-full py-4 sm:py-4.5 px-4 text-center text-[17px] sm:text-[18px] font-normal text-[#E02020] active:bg-red-50/70 transition-colors cursor-pointer"
        >
          Supprimer l'utilisateur
        </button>

        {/* Ligne de séparation fine */}
        <div className="w-full h-[1px] bg-gray-100/80" />

        {/* 3. Annuler */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-4 sm:py-4.5 px-4 text-center text-[17px] sm:text-[18px] font-bold text-black active:bg-gray-100/70 transition-colors cursor-pointer"
        >
          Annuler
        </button>
      </motion.div>
    </div>
  );
};

