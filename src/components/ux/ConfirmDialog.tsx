import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useUX } from '../../context/UXContext';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/button';

export const ConfirmDialog: React.FC = () => {
  const { confirmDialog, closeConfirm, triggerFeedback } = useUX();
  const [isLoading, setIsLoading] = useState(false);

  if (!confirmDialog) return null;

  const handleConfirm = async () => {
    try {
      setIsLoading(true);
      await confirmDialog.onConfirm();
      triggerFeedback('success');
      closeConfirm();
    } catch (e) {
      triggerFeedback('error');
      console.warn('Confirm dialog action error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    confirmDialog.onCancel?.();
    closeConfirm();
  };

  const isDestructive = confirmDialog.variant === 'destructive';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1050] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleCancel}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative z-10 w-full max-w-xs sm:max-w-sm rounded-[28px] bg-white p-6 shadow-2xl text-center border border-gray-100"
        >
          <div
            className={`w-14 h-14 rounded-full mx-auto mb-3.5 flex items-center justify-center ${
              isDestructive ? 'bg-rose-50 text-[#e20030]' : 'bg-gray-100 text-gray-800'
            }`}
          >
            <AlertCircle className="w-7 h-7" />
          </div>

          <h3 className="text-base font-black text-gray-900 tracking-tight mb-1.5">
            {confirmDialog.title}
          </h3>
          <p className="text-xs text-gray-500 font-medium leading-relaxed mb-6">
            {confirmDialog.message}
          </p>

          <div className="flex flex-col gap-2">
            <Button
              variant={isDestructive ? 'destructive' : 'default'}
              size="pill"
              isLoading={isLoading}
              onClick={handleConfirm}
              className="w-full"
            >
              {confirmDialog.confirmText || 'Confirmer'}
            </Button>
            <Button
              variant="ghost"
              size="pill"
              disabled={isLoading}
              onClick={handleCancel}
              className="w-full text-xs text-gray-600"
            >
              {confirmDialog.cancelText || 'Annuler'}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
