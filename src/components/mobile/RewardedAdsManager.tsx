import type { ReactNode } from 'react';

export type AdRewardType = 'credits' | 'coup_de_coeur' | 'free_like' | 'coup_de_coeur_credit';

export interface RewardedAdPlayerProps {
  rewardType?: AdRewardType;
  rewardAmount?: number;
  targetProfileName?: string;
  targetProfileImg?: string;
  onClose: () => void;
  onRewardEarned: (amount: number, rewardType: AdRewardType) => void;
  onError?: () => void;
}

export const REWARDED_ADS_ENABLED = false;

export function RewardedAdPlayer({ onClose }: RewardedAdPlayerProps) {
  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rewarded-ads-unavailable"
    >
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
        <h2 id="rewarded-ads-unavailable" className="text-lg font-bold text-gray-900">
          Récompenses vidéo indisponibles
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Nous réactiverons cette option après la mise en place d’une validation sécurisée des visionnages.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 min-h-11 w-full rounded-full bg-black px-5 font-semibold text-white"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}

export function UnexpectedErrorModal({
  isOpen,
  onContinue,
  onCancel,
}: {
  isOpen: boolean;
  onContinue: () => void;
  onCancel: () => void;
}): ReactNode {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[280] flex items-center justify-center bg-black/60 p-6" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
        <h2 className="text-lg font-bold text-gray-900">Publicité indisponible</h2>
        <p className="mt-2 text-sm text-gray-600">Les récompenses vidéo ne sont pas encore activées.</p>
        <div className="mt-5 flex gap-3">
          <button type="button" onClick={onCancel} className="min-h-11 flex-1 rounded-full border border-gray-300 font-semibold text-gray-700">
            Fermer
          </button>
          <button type="button" onClick={onContinue} className="min-h-11 flex-1 rounded-full bg-black font-semibold text-white">
            Réessayer
          </button>
        </div>
      </div>
    </div>
  );
}
