import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { useUX } from '../../context/UXContext';

export const NetworkStatusBanner: React.FC = () => {
  const { isOnline, wasOffline } = useUX();
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (isOnline && wasOffline) {
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  return (
    <div className="fixed top-0 inset-x-0 z-[9999] pointer-events-none flex flex-col items-center">
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="pointer-events-auto mt-2 mx-4 px-4 py-2 bg-neutral-900/95 text-white backdrop-blur-md rounded-full shadow-xl border border-neutral-700/60 flex items-center space-x-2 text-xs font-semibold"
          >
            <WifiOff className="w-3.5 h-3.5 text-rose-400 animate-pulse shrink-0" />
            <span>Mode hors-ligne • Données en cache</span>
          </motion.div>
        )}

        {showReconnected && isOnline && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="pointer-events-auto mt-2 mx-4 px-4 py-2 bg-emerald-600/95 text-white backdrop-blur-md rounded-full shadow-xl border border-emerald-500/60 flex items-center space-x-2 text-xs font-semibold"
          >
            <Wifi className="w-3.5 h-3.5 text-white shrink-0" />
            <span>Connexion rétablie</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
