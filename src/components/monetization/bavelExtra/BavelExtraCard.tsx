import React from 'react';
import { Check, X, Sparkles } from 'lucide-react';

interface BavelExtraCardProps {
  onOpenModal: (slideId?: string) => void;
  onOpenAllFeatures?: () => void;
  className?: string;
}

export const BavelExtraCard: React.FC<BavelExtraCardProps> = ({ onOpenModal, onOpenAllFeatures, className = '' }) => {
  return (
    <div className={`bg-[#2c0e1e] rounded-[22px] p-4 text-white overflow-hidden relative shadow-md select-none border border-pink-900/30 ${className}`}>
      <div className="flex justify-center items-center mb-3">
        <span className="text-[20px] font-bold tracking-tight text-pink-200 mr-1.5">Bavel</span>
        <span className="text-[17px] font-black uppercase text-pink-400 bg-pink-950/60 px-2 py-0.5 rounded-md border border-pink-500/20">Extra</span>
      </div>
      
      <button 
        onClick={() => onOpenModal()}
        className="w-full bg-gradient-to-r from-pink-600 to-rose-600 text-white font-extrabold text-[13px] py-2.5 rounded-full mb-3.5 shadow-md active:scale-98 transition-all cursor-pointer flex items-center justify-center space-x-1.5"
      >
        <Sparkles className="w-4 h-4 text-pink-200 animate-pulse" />
        <span>Passez à Bavel Extra (à partir de 5,99 €)</span>
      </button>

      <div className="bg-[#410925] rounded-[18px] p-3.5 border border-white/5">
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-3 items-center">
          <div className="col-start-2 text-[11px] font-medium text-white/80 text-center relative pt-1">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-white/20 text-white text-[8.5px] px-1.5 py-0.2 rounded-full whitespace-nowrap">Ma formule</div>
            Gratuit
          </div>
          <div className="col-start-3 text-[11px] font-bold text-pink-300 text-center pt-1">Extra</div>

          <div className="text-[11.5px] font-medium leading-tight text-gray-200">Swipez aussi souvent que vous voulez</div>
          <div className="flex justify-center"><X className="w-4 h-4 text-white/50" strokeWidth={2.5} /></div>
          <div className="flex justify-center"><Check className="w-4 h-4 text-pink-400" strokeWidth={3} /></div>

          <div className="text-[11.5px] font-medium leading-tight text-gray-200">Des crédits bonus (+20% minimum)</div>
          <div className="flex justify-center"><X className="w-4 h-4 text-white/50" strokeWidth={2.5} /></div>
          <div className="flex justify-center"><Check className="w-4 h-4 text-pink-400" strokeWidth={3} /></div>

          <div className="text-[11.5px] font-medium leading-tight text-gray-200">Supprimez toutes les pubs</div>
          <div className="flex justify-center"><X className="w-4 h-4 text-white/50" strokeWidth={2.5} /></div>
          <div className="flex justify-center"><Check className="w-4 h-4 text-pink-400" strokeWidth={3} /></div>
        </div>
        
        <button 
          onClick={() => onOpenAllFeatures ? onOpenAllFeatures() : onOpenModal()}
          className="w-full border border-pink-400/40 hover:border-pink-300 rounded-full py-2 mt-3.5 text-[12.5px] font-bold text-white transition-colors cursor-pointer"
        >
          Toutes les fonctionnalités Extra
        </button>
      </div>
    </div>
  );
};

export default BavelExtraCard;
