import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../../../lib/utils';

interface AuthButtonProps {
  type?: 'button' | 'submit';
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  className?: string;
}

export const AuthButton: React.FC<AuthButtonProps> = ({
  type = 'button',
  label,
  icon,
  onClick,
  isLoading = false,
  disabled = false,
  fullWidth = false,
  variant = 'primary',
  className,
}) => {
  const variants = {
    primary: 'bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 text-white shadow-md shadow-rose-900/30',
    secondary: 'bg-white/10 hover:bg-white/15 text-white border border-white/15 backdrop-blur-md',
    outline: 'bg-transparent hover:bg-white/10 text-white border border-white/20',
  };

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      whileHover={{ scale: 1.01 }}
      type={type}
      onClick={onClick}
      disabled={isLoading || disabled}
      className={cn(
        'py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center space-x-2 transition-all disabled:opacity-70 cursor-pointer min-h-[44px]',
        fullWidth && 'w-full',
        variants[variant],
        className
      )}
    >
      {isLoading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          {icon}
          <span>{label}</span>
        </>
      )}
    </motion.button>
  );
};
