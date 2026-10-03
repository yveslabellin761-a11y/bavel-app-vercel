import React from 'react';
import { Check, X, Crown } from 'lucide-react';

interface BavelPremiumCardProps {
  onOpenModal: (slideId?: string) => void;
  onOpenAllFeatures?: () => void;
  className?: string;
}

export const BavelPremiumCard: React.FC<BavelPremiumCardProps> = ({ onOpenModal, onOpenAllFeatures, className = '' }) => {
  return (
    <div className={`bg-[#22121d] rounded-[22px] p-4 text-white overflow-hidden relative shadow-md select-none border border-purple-900/40 ${className}`}>
      <div className="flex justify-center items-center mb-3">
        <span className="text-[20px] font-bold tracking-tight text-purple-200 mr-1.5">Bavel</span>
        <span className="text-[17px] font-black uppercase text-amber-300 bg-purple-950/80 px-2 py-0.5 rounded-md border border-amber-400/30 flex items-center space-x-1">
          <Crown className="w-3.5 h-3.5 text-amber-300" />
          <span>Premium</span>
        </span>
      </div>
      
      <button 
        onClick={() => onOpenModal()}
        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-extrabold text-[13px] py-2.5 rounded-full mb-3.5 shadow-md active:scale-98 transition-all cursor-pointer flex items-center justify-center space-x-1.5"
      >
        <Crown className="w-4 h-4 text-amber-300" />
        <span>Passez à Premium (à partir de 11,99 €)</span>
      </button>

      <div className="bg-[#331c2d] rounded-[18px] p-3.5 border border-white/5">
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-3.5 items-center">
          <div className="col-start-2 text-[11px] font-medium text-white/80 text-center relative pt-1">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#51364a] text-white/90 text-[8.5px] font-medium px-2 py-0.2 rounded-full whitespace-nowrap">Ma formule</div>
            Gratuit
          </div>
          <div className="col-start-3 text-[11px] font-bold text-amber-300 text-center pt-1">Premium</div>

          <div className="text-[11.5px] font-medium leading-tight text-gray-200">Découvrez qui vous a donné un Like</div>
          <div className="flex justify-center"><X className="w-4 h-4 text-white/50" strokeWidth={2.5} /></div>
          <div className="flex justify-center"><Check className="w-4 h-4 text-amber-400" strokeWidth={3} /></div>

          <div className="text-[11.5px] font-medium leading-tight text-gray-200">Messages prioritaires & Mode Incognito</div>
          <div className="flex justify-center"><X className="w-4 h-4 text-white/50" strokeWidth={2.5} /></div>
          <div className="flex justify-center"><Check className="w-4 h-4 text-amber-400" strokeWidth={3} /></div>

          <div className="text-[11.5px] font-medium leading-tight text-gray-200">Filtres illimités & Swipes illimités</div>
          <div className="flex justify-center"><X className="w-4 h-4 text-white/50" strokeWidth={2.5} /></div>
          <div className="flex justify-center"><Check className="w-4 h-4 text-amber-400" strokeWidth={3} /></div>
        </div>
        
        <button 
          onClick={() => onOpenAllFeatures ? onOpenAllFeatures() : onOpenModal()}
          className="w-full border border-purple-400/40 hover:border-purple-300 rounded-full py-2 mt-3.5 text-[12.5px] font-bold text-white transition-colors cursor-pointer"
        >
          Toutes les fonctionnalités Premium
        </button>
      </div>
    </div>
  );
};

export default BavelPremiumCard;
