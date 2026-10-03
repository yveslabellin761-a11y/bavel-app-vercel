import React from 'react';
import { motion } from 'motion/react';
import { Radio, Video, X } from 'lucide-react';
import { Profile } from '../../types';

interface BadooLiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProfile?: Profile;
  onOpenStore?: () => void;
}

export const BadooLiveModal: React.FC<BadooLiveModalProps> = ({
  isOpen,
  onClose,
  initialProfile,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="live-unavailable-title"
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

        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-400">
          <Radio className="h-6 w-6" />
        </div>
        <h2 id="live-unavailable-title" className="text-lg font-black">
          Diffusion en direct indisponible
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-neutral-300">
          {initialProfile
            ? `Le direct avec ${initialProfile.name} n'est pas disponible pour le moment.`
            : "Le service de diffusion en direct n'est pas configuré pour le moment."}
          {' '}Aucune vidéo, aucun message et aucun cadeau ne sera simulé ou envoyé.
        </p>
        <div className="mt-5 flex items-center gap-2 rounded-2xl border border-neutral-800 bg-neutral-900 p-3 text-xs text-neutral-400">
          <Video className="h-4 w-4 shrink-0 text-rose-400" />
          <span>Le direct sera activé lorsqu'un service vidéo temps réel sera connecté.</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-2xl bg-rose-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-rose-500"
        >
          Fermer
        </button>
      </motion.div>
    </div>
  );
};
