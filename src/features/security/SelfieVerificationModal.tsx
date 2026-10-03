import React from 'react';
import { motion } from 'motion/react';
import { AlertCircle, ShieldCheck, X } from 'lucide-react';

interface SelfieVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SelfieVerificationModal: React.FC<SelfieVerificationModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="selfie-verification-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-md rounded-3xl border border-neutral-700 bg-neutral-950 p-6 text-white shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute right-4 top-4 rounded-full p-2 text-neutral-400 hover:bg-neutral-800 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h2 id="selfie-verification-title" className="text-lg font-black">
          Vérification indisponible
        </h2>
        <div className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm leading-relaxed text-amber-100">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Le fournisseur de vérification n'est pas configuré. Aucun selfie ne sera
            envoyé et aucun badge ne sera attribué tant qu'une vérification réelle
            n'est pas disponible.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-2xl bg-neutral-800 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-neutral-700"
        >
          Fermer
        </button>
      </motion.div>
    </div>
  );
};
