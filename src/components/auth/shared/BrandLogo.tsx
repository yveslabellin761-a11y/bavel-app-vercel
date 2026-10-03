import React from 'react';
import { Heart } from 'lucide-react';

export const BrandLogo: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const iconSize = size === 'sm' ? 'w-5 h-5' : size === 'lg' ? 'w-10 h-10' : 'w-7 h-7';
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-3xl' : 'text-2xl';

  return (
    <div className="flex items-center justify-center space-x-2 select-none">
      <div className="relative">
        <Heart className={`${iconSize} text-[#e20030] fill-[#e20030] animate-pulse`} />
        <div className="absolute inset-0 bg-[#e20030]/20 rounded-full blur-sm -z-10" />
      </div>
      <span className={`${textSize} font-black tracking-tight text-white font-zapfino drop-shadow-md`}>
        Bavel
      </span>
    </div>
  );
};
