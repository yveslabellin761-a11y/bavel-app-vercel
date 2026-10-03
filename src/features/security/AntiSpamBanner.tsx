import React from 'react';
import { Shield, AlertCircle, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { Badge } from '../../components/ui/badge';

interface AntiSpamBannerProps {
  remainingQuota: number;
  maxQuota?: number;
  isMatched: boolean;
  hasTargetReplied: boolean;
}

export const AntiSpamBanner: React.FC<AntiSpamBannerProps> = ({
  remainingQuota,
  maxQuota = 2,
  isMatched,
  hasTargetReplied,
}) => {
  if (isMatched || hasTargetReplied) return null;

  const isLimitReached = remainingQuota <= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className={`px-3 py-2 border-b text-xs flex items-center justify-between ${
        isLimitReached
          ? 'bg-amber-950/40 border-amber-800/60 text-amber-200'
          : 'bg-neutral-900 border-neutral-800 text-neutral-300'
      }`}
    >
      <div className="flex items-center space-x-2">
        <Shield className={`w-4 h-4 shrink-0 ${isLimitReached ? 'text-amber-400' : 'text-blue-400'}`} />
        <div>
          <p className="font-bold leading-tight">
            {isLimitReached
              ? 'Limite de messages atteinte'
              : 'Protection Anti-Harcèlement Bavel'}
          </p>
          <p className="text-[10px] text-neutral-400">
            {isLimitReached
              ? 'Attendez que votre contact réponde pour débloquer le chat complet.'
              : `${remainingQuota}/${maxQuota} message${maxQuota > 1 ? 's' : ''} d’accroche disponible${remainingQuota > 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      <Badge
        variant="outline"
        className={`text-[10px] ${
          isLimitReached
            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
            : 'bg-blue-500/10 text-blue-300 border-blue-500/20'
        }`}
      >
        {isLimitReached ? 'En attente' : `${remainingQuota} restant`}
      </Badge>
    </motion.div>
  );
};
