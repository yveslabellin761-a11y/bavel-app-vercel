import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, Eye, EyeOff, Flag, X, ShieldCheck, Lock, Trash2 } from 'lucide-react';

interface ChatSafetyDetectorModalProps {
  isOpen: boolean;
  message: any | null;
  onClose: () => void;
  onConfirmReveal: (message: any) => Promise<void>;
  onDeleteMessage: (message: any) => Promise<void>;
  onReportPhoto: (message: any) => Promise<void>;
}

export const ChatSafetyDetectorModal: React.FC<ChatSafetyDetectorModalProps> = ({
  isOpen,
  message,
  onClose,
  onConfirmReveal,
  onDeleteMessage,
  onReportPhoto,
}) => {
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setBusyAction(null);
    setActionError(null);
  }, [isOpen, message?.id]);

  if (!isOpen || !message) return null;

  const runAction = async (action: string, handler: (selectedMessage: any) => Promise<void>) => {
    setBusyAction(action);
    setActionError(null);
    try {
      await handler(message);
      if (action !== 'reveal') onClose();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Cette action a échoué.');
      setBusyAction(null);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[280] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white rounded-[28px] max-w-sm w-full p-6 shadow-2xl border border-rose-100 flex flex-col items-center text-center relative overflow-hidden"
        >
          {/* Top Close Button */}
          <button
            onClick={onClose}
            disabled={busyAction !== null}
            className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Shield Icon Badge */}
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-3.5 shadow-inner border border-rose-200/80">
            <ShieldAlert className="w-8 h-8 fill-rose-500/20 stroke-[2.2]" />
          </div>

          {/* Badge Label */}
          <div className="inline-flex items-center space-x-1 px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-[11px] font-black uppercase tracking-wider mb-2">
            <Lock className="w-3 h-3 text-rose-600" />
            <span>Safety Detector™ IA</span>
          </div>

          {/* Title */}
          <h3 className="text-[18px] font-black text-gray-900 tracking-tight leading-snug">
            Avertissement : Image à caractère sensible
          </h3>

          {/* Explanation Text */}
          <p className="text-[13px] text-gray-600 leading-relaxed font-medium mt-2 px-1">
            La classification automatique a signalé cette image comme potentiellement sensible. Son aperçu est flouté avant affichage.
          </p>

          {/* Blurred Thumbnail Box */}
          <div className="w-full h-32 my-4 rounded-2xl overflow-hidden relative border border-rose-200 bg-gray-900 shadow-inner flex items-center justify-center">
            {message.text && (
              <img
                src={message.text}
                alt="Miniature floutée"
                className="w-full h-full object-cover blur-2xl scale-110 opacity-70"
              />
            )}
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white p-2">
              <EyeOff className="w-6 h-6 text-rose-300 mb-1" />
              <span className="text-[11px] font-extrabold text-rose-100">
                Aperçu masqué par l'IA
              </span>
            </div>
          </div>

          {/* Question Prompt */}
          <p className="text-[13.5px] font-bold text-gray-900 mb-4">
            Voulez-vous quand même afficher cette image ?
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col w-full space-y-2.5">
            {/* Primary Reveal Button */}
            <button
              disabled={busyAction !== null}
              onClick={() => void runAction('reveal', onConfirmReveal)}
              className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 text-white font-extrabold text-[14px] py-3.5 rounded-2xl shadow-lg shadow-purple-500/20 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center space-x-2"
            >
              <Eye className="w-4.5 h-4.5" />
              <span>{busyAction === 'reveal' ? 'Chargement sécurisé…' : 'Afficher la photo'}</span>
            </button>

            <button
              disabled={busyAction !== null}
              onClick={() => void runAction('hide', onDeleteMessage)}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-[13px] py-3 rounded-2xl active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center space-x-1.5 disabled:opacity-60"
            >
              <Trash2 className="w-4 h-4" />
              <span>{busyAction === 'hide' ? 'Suppression…' : 'Supprimer pour moi'}</span>
            </button>

            <button
              disabled={busyAction !== null}
              onClick={() => void runAction('report', onReportPhoto)}
              className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[13px] py-3 rounded-2xl border border-rose-200 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center space-x-1.5 disabled:opacity-60"
            >
              <Flag className="w-4 h-4 text-rose-600" />
              <span>{busyAction === 'report' ? 'Signalement…' : 'Signaler et bloquer'}</span>
            </button>

            {/* Cancel Keep Blurred Button */}
            <button
              onClick={onClose}
              disabled={busyAction !== null}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-[13px] py-3 rounded-2xl active:scale-[0.98] transition-all cursor-pointer"
            >
              Garder la photo floutée
            </button>
          </div>

          {actionError && (
            <p role="alert" className="mt-3 text-[12px] font-semibold text-rose-700">
              {actionError}
            </p>
          )}

          {/* Footer note */}
          <div className="mt-4 flex items-center space-x-1 text-[10.5px] text-gray-400 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Protections Bavel contre les contenus indésirables</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
