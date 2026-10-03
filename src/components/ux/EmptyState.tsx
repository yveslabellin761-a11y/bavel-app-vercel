import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Heart, MessageCircle, SlidersHorizontal, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

export type EmptyStateType = 'discovery_end' | 'no_likes' | 'no_messages' | 'no_filters_match' | 'error' | 'custom';

export interface EmptyStateProps {
  type?: EmptyStateType;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  icon?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'discovery_end',
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  icon,
  className,
}) => {
  const configs = {
    discovery_end: {
      defaultTitle: 'Vous avez fait le tour !',
      defaultDesc: 'Il n’y a plus de nouveaux profils à proximité avec vos critères actuels. Élargissez votre rayon ou réessayez bientôt.',
      defaultAction: 'Modifier mes filtres',
      defaultIcon: (
        <div className="relative w-20 h-20 mx-auto mb-4 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-rose-50 animate-ping opacity-60" />
          <div className="relative w-16 h-16 rounded-full bg-gradient-to-tr from-rose-500 to-[#e20030] text-white flex items-center justify-center shadow-lg">
            <Sparkles className="w-8 h-8" />
          </div>
        </div>
      ),
    },
    no_likes: {
      defaultTitle: 'Aucun like pour le moment',
      defaultDesc: 'Les profils qui vous envoient un like apparaîtront ici en temps réel. Boostez votre profil pour maximiser votre visibilité !',
      defaultAction: 'Découvrir des profils',
      defaultIcon: (
        <div className="relative w-20 h-20 mx-auto mb-4 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-rose-50 text-[#e20030] flex items-center justify-center shadow-inner border border-rose-100">
            <Heart className="w-8 h-8 fill-rose-100 text-[#e20030]" />
          </div>
        </div>
      ),
    },
    no_messages: {
      defaultTitle: 'Vos conversations commenceront ici',
      defaultDesc: 'Dès que vous obtenez un Match mutuel ou un Coup de cœur, vos discussions s’afficheront directement ici.',
      defaultAction: 'Lancer un swipe',
      defaultIcon: (
        <div className="relative w-20 h-20 mx-auto mb-4 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner border border-blue-100">
            <MessageCircle className="w-8 h-8 fill-blue-50" />
          </div>
        </div>
      ),
    },
    no_filters_match: {
      defaultTitle: 'Aucun résultat correspondant',
      defaultDesc: 'Vos critères de filtres (âge, distance, centres d’intérêt) sont peut-être trop restrictifs.',
      defaultAction: 'Réinitialiser les filtres',
      defaultIcon: (
        <div className="relative w-20 h-20 mx-auto mb-4 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shadow-inner border border-amber-100">
            <SlidersHorizontal className="w-8 h-8" />
          </div>
        </div>
      ),
    },
    error: {
      defaultTitle: 'Oups, un petit problème est survenu',
      defaultDesc: 'Impossible de charger ces informations actuellement. Vérifiez votre connexion et réessayez.',
      defaultAction: 'Réessayer',
      defaultIcon: (
        <div className="relative w-20 h-20 mx-auto mb-4 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-rose-50 text-[#e20030] flex items-center justify-center shadow-inner border border-rose-100">
            <AlertCircle className="w-8 h-8" />
          </div>
        </div>
      ),
    },
    custom: {
      defaultTitle: 'Aucun élément',
      defaultDesc: 'Rien à afficher pour le moment.',
      defaultAction: 'Rafraîchir',
      defaultIcon: (
        <div className="relative w-20 h-20 mx-auto mb-4 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center shadow-inner border border-gray-200">
            <Sparkles className="w-8 h-8" />
          </div>
        </div>
      ),
    },
  };

  const currentConfig = configs[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={cn('flex flex-col items-center justify-center text-center p-6 sm:p-8 max-w-sm mx-auto select-none', className)}
    >
      {icon || currentConfig.defaultIcon}
      <h3 className="text-lg font-black text-gray-900 tracking-tight mb-2">
        {title || currentConfig.defaultTitle}
      </h3>
      <p className="text-xs sm:text-sm text-gray-500 font-medium leading-relaxed mb-6">
        {description || currentConfig.defaultDesc}
      </p>

      <div className="flex flex-col w-full gap-2.5">
        {(actionLabel || currentConfig.defaultAction) && onAction && (
          <Button
            variant="default"
            size="pill"
            onClick={onAction}
            className="w-full shadow-md bg-black text-white hover:bg-neutral-800"
          >
            {actionLabel || currentConfig.defaultAction}
          </Button>
        )}

        {secondaryActionLabel && onSecondaryAction && (
          <Button
            variant="ghost"
            size="pill"
            onClick={onSecondaryAction}
            className="w-full text-xs text-gray-600"
          >
            {secondaryActionLabel}
          </Button>
        )}
      </div>
    </motion.div>
  );
};
