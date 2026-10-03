import { LucideIcon } from 'lucide-react';

export interface BavelPremiumPlan {
  id: string;
  duration: string;
  price: string;
  crossedPrice: string | null;
  footer: string;
  badge: string | null;
}

export interface BavelPremiumSlide {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

export interface BavelPremiumModalProps {
  onClose: () => void;
  initialSlideId?: string;
  onSubscribe?: () => void;
  profileName?: string;
  likesCount?: number;
  onOpenComparison?: () => void;
  onSwitchToExtra?: () => void;
}
