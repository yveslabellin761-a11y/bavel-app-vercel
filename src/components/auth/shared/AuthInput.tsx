import React from 'react';
import { cn } from '../../../lib/utils';

interface AuthInputProps {
  type?: string;
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (val: string) => void;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  autoFocus?: boolean;
  required?: boolean;
  className?: string;
}

export const AuthInput: React.FC<AuthInputProps> = ({
  type = 'text',
  label,
  placeholder,
  value,
  onChange,
  leftIcon,
  rightIcon,
  autoFocus = false,
  required = true,
  className,
}) => {
  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label className="block text-xs sm:text-[13px] font-semibold text-white/90">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3.5 text-white/50 pointer-events-none">
            {leftIcon}
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          required={required}
          className={cn(
            'w-full bg-white/10 border border-white/20 rounded-xl py-3 px-3.5 text-base sm:text-sm text-white placeholder-white/40 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/40 transition-all min-h-[44px]',
            leftIcon && 'pl-10',
            rightIcon && 'pr-10',
            className
          )}
        />
        {rightIcon && (
          <div className="absolute right-3.5 flex items-center">
            {rightIcon}
          </div>
        )}
      </div>
    </div>
  );
};
