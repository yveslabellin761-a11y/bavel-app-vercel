import * as React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'premium' | 'success' | 'warning' | 'live';
  dot?: boolean;
}

export function Badge({
  className,
  variant = 'default',
  dot = false,
  children,
  ...props
}: BadgeProps) {
  const variants = {
    default: 'bg-black text-white',
    secondary: 'bg-gray-100 text-gray-800',
    destructive: 'bg-rose-50 text-[#e20030] border border-rose-200/60',
    outline: 'border border-gray-200 text-gray-700 bg-white',
    premium: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-2xs',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
    warning: 'bg-amber-50 text-amber-800 border border-amber-200/60',
    live: 'bg-rose-500 text-white shadow-xs',
  };

  const dotColors = {
    default: 'bg-white',
    secondary: 'bg-gray-500',
    destructive: 'bg-rose-500',
    outline: 'bg-gray-500',
    premium: 'bg-amber-200',
    success: 'bg-emerald-500 animate-pulse',
    warning: 'bg-amber-500',
    live: 'bg-white animate-ping',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold tracking-tight select-none',
        variants[variant],
        className
      )}
      {...props}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', dotColors[variant])} />}
      {children}
    </div>
  );
}
