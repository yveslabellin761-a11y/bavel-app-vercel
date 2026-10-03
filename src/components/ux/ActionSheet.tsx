import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useUX } from '../../context/UXContext';
import { cn } from '../../lib/utils';

export const ActionSheet: React.FC = () => {
  const { actionSheet, closeActionSheet, triggerFeedback } = useUX();

  if (!actionSheet) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-end justify-center sm:items-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            actionSheet.onCancel?.();
            closeActionSheet();
          }}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        />

        {/* Action Sheet Panel */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="relative z-10 w-full max-w-md rounded-t-[32px] sm:rounded-[32px] bg-white p-5 shadow-2xl overflow-hidden"
        >
          <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4" />

          {(actionSheet.title || actionSheet.description) && (
            <div className="text-center mb-4 pb-2 border-b border-gray-100">
              {actionSheet.title && (
                <h3 className="font-black text-base text-gray-900 tracking-tight">
                  {actionSheet.title}
                </h3>
              )}
              {actionSheet.description && (
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  {actionSheet.description}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col space-y-2">
            {actionSheet.options.map((opt, idx) => {
              const isDestructive = opt.variant === 'destructive';
              const isPrimary = opt.variant === 'primary';

              return (
                <button
                  key={idx}
                  onClick={() => {
                    triggerFeedback(isDestructive ? 'warning' : 'light');
                    opt.onClick();
                    closeActionSheet();
                  }}
                  className={cn(
                    'w-full flex items-center justify-center space-x-2.5 py-3.5 px-4 rounded-2xl font-bold text-sm transition-colors active:scale-[0.98] cursor-pointer select-none',
                    isDestructive && 'bg-rose-50 text-[#e20030] hover:bg-rose-100',
                    isPrimary && 'bg-black text-white hover:bg-neutral-800',
                    !isDestructive && !isPrimary && 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  )}
                >
                  {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                  <span>{opt.label}</span>
                </button>
              );
            })}

            <button
              onClick={() => {
                actionSheet.onCancel?.();
                closeActionSheet();
              }}
              className="w-full py-3.5 px-4 rounded-2xl font-bold text-sm text-gray-500 hover:bg-gray-50 transition-colors mt-1 active:scale-[0.98] cursor-pointer"
            >
              Annuler
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
