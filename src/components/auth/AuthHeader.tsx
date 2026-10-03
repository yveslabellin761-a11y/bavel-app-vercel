import React from 'react';
import { ArrowLeft, HelpCircle } from 'lucide-react';
import { BrandLogo } from './shared/BrandLogo';

interface AuthHeaderProps {
  mode: string;
  onBack: () => void;
  onHelp: () => void;
  showHelp: boolean;
}

export const AuthHeader: React.FC<AuthHeaderProps> = ({ mode, onBack, onHelp, showHelp }) => {
  return (
    <div className="flex items-center justify-between px-5 pt-8 pb-3 relative z-20 shrink-0">
      {mode !== 'main' ? (
        <button
          onClick={onBack}
          className="p-2 -ml-2 text-white/80 hover:text-white transition-colors cursor-pointer rounded-full hover:bg-white/10"
          aria-label="Retour"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      ) : (
        <div className="w-9" />
      )}

      <BrandLogo size="sm" />

      {showHelp ? (
        <button
          onClick={onHelp}
          className="p-2 -mr-2 text-white/70 hover:text-white transition-colors cursor-pointer rounded-full hover:bg-white/10"
          aria-label="Aide"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
      ) : (
        <div className="w-9" />
      )}
    </div>
  );
};
