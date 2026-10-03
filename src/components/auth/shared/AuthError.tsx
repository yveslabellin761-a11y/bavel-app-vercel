import React from 'react';
import { AlertCircle } from 'lucide-react';

export const AuthError: React.FC<{ message: string | null }> = ({ message }) => {
  if (!message) return null;
  return (
    <div className="bg-red-500/15 border border-red-500/30 text-red-200 text-xs px-3.5 py-2.5 rounded-xl flex items-center space-x-2 my-2 animate-fadeIn">
      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
      <span className="flex-1 text-[12px] leading-snug">{message}</span>
    </div>
  );
};
