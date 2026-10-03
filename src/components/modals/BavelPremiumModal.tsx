import React from 'react';
import { BavelExtraModal } from '../monetization/bavelExtra/BavelExtraModal';
import { BavelPremiumModal as BavelPremiumModalImpl } from '../monetization/bavelPremium/BavelPremiumModal';

interface BavelPremiumModalProps {
  onClose: () => void;
  initialSlideId?: string;
  onSubscribe?: () => void;
  profileName?: string;
  likesCount?: number;
  onOpenComparison?: () => void;
  onSwitchToExtra?: () => void;
}

export default function BavelPremiumModal({ 
  onClose, 
  initialSlideId, 
  onSubscribe, 
  profileName = "Samantha", 
  likesCount = 1,
  onOpenComparison,
  onSwitchToExtra
}: BavelPremiumModalProps) {
  const extraSlideIds = ['undo', 'unlimited_swipes', 'bonus_credits', 'no_ads', 'coup_de_coeur'];
  const isExtra = initialSlideId && extraSlideIds.includes(initialSlideId);

  if (isExtra) {
    return (
      <BavelExtraModal
        onClose={onClose}
        initialSlideId={initialSlideId}
        onSubscribe={onSubscribe}
        profileName={profileName}
        onOpenComparison={onOpenComparison}
        onSwitchToPremium={onClose}
      />
    );
  }

  return (
    <BavelPremiumModalImpl
      onClose={onClose}
      initialSlideId={initialSlideId}
      onSubscribe={onSubscribe}
      profileName={profileName}
      likesCount={likesCount}
      onOpenComparison={onOpenComparison}
      onSwitchToExtra={onSwitchToExtra}
    />
  );
}
