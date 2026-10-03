import { LucideIcon } from 'lucide-react';

export interface BavelExtraPlan {
  id: string;
  duration: string;
  price: string;
  crossedPrice: string | null;
  footer: string;
  badge: string | null;
}

export interface BavelExtraSlide {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

export interface BavelExtraModalProps {
  onClose: () => void;
  initialSlideId?: string;
  onSubscribe?: () => void;
  profileName?: string;
  onOpenComparison?: () => void;
  onSwitchToPremium?: () => void;
}
