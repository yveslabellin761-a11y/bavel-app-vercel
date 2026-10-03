import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Sparkles, X, Check, Coins } from 'lucide-react';

export interface RewardObtainedModalProps {
  show: boolean;
  onClose: () => void;
  rewardAmount?: number;
  rewardType?: 'credits' | 'coup_de_coeur_credit' | 'free_like' | string;
}

export function RewardObtainedModal({
  show,
  onClose,
  rewardAmount = 15,
  rewardType = 'credits'
}: RewardObtainedModalProps) {
  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-xs"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 280 }}
            className="relative w-full max-w-sm bg-white rounded-[24px] p-6 text-center shadow-2xl z-10 border border-gray-100 flex flex-col items-center select-none"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-black hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Glowing Icon Circle */}
            <div className="relative mb-4 mt-2">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-400/30">
                <Coins className="w-10 h-10 text-white stroke-[2.2]" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-black text-white rounded-full flex items-center justify-center shadow-sm">
                <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
              </div>
            </div>

            {/* Title */}
            <h3 className="text-[20px] font-black text-black tracking-tight mb-1">
              Récompense débloquée ! 🎉
            </h3>

            {/* Reward Badge */}
            <div className="my-3 inline-flex items-center space-x-1.5 px-4 py-2 rounded-full bg-amber-50 border border-amber-200">
              <span className="text-[16px] font-extrabold text-amber-900">
                +{rewardAmount} {rewardType === 'credits' ? 'Crédits Bavel' : 'Coup de Cœur'}
              </span>
            </div>

            {/* Subtext */}
            <p className="text-[13px] text-gray-600 leading-relaxed max-w-[260px] mb-6">
              Vos crédits ont été ajoutés instantanément à votre solde. Utilisez-les pour booster vos rencontres !
            </p>

            {/* Action Button */}
            <button
              onClick={onClose}
              className="w-full py-3.5 bg-black hover:bg-neutral-900 active:scale-[0.98] text-white font-bold text-[15px] rounded-full shadow-md transition-all cursor-pointer"
            >
              Super, merci !
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default RewardObtainedModal;
