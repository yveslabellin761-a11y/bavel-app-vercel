import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CloudUpload, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { useOfflineStore } from '../../store/useOfflineStore';
import { useUX } from '../../context/UXContext';

export const OfflineSyncStatus: React.FC = () => {
  const { pendingCount, isSyncing, triggerManualSync } = useOfflineStore();
  const { isOnline, triggerFeedback } = useUX();

  if (pendingCount === 0 && !isSyncing) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 50, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 50, opacity: 0, scale: 0.9 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-20 left-4 right-4 z-40 max-w-sm mx-auto"
      >
        <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-neutral-900/95 text-white shadow-2xl backdrop-blur-md border border-neutral-700/60">
          <div className="flex items-center space-x-3">
            {isSyncing ? (
              <RefreshCw className="w-5 h-5 text-rose-400 animate-spin shrink-0" />
            ) : isOnline ? (
              <CloudUpload className="w-5 h-5 text-amber-400 shrink-0 animate-bounce" />
            ) : (
              <AlertCircle className="w-5 h-5 text-neutral-400 shrink-0" />
            )}
            <div>
              <p className="text-xs font-bold leading-tight">
                {isSyncing
                  ? 'Synchronisation en cours...'
                  : `${pendingCount} action${pendingCount > 1 ? 's' : ''} en attente`}
              </p>
              <p className="text-[10px] text-neutral-400">
                {isOnline
                  ? 'Vos likes et messages sont transmis au serveur'
                  : 'Sera synchronisé dès le retour du réseau'}
              </p>
            </div>
          </div>

          {isOnline && !isSyncing && (
            <button
              onClick={() => {
                triggerFeedback('light');
                triggerManualSync();
              }}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-bold transition-all text-white shrink-0 ml-2"
            >
              Synchroniser
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
