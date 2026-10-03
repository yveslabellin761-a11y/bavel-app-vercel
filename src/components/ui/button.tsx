import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'gradient' | 'premium';
  size?: 'default' | 'sm' | 'lg' | 'icon' | 'pill';
  isLoading?: boolean;
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'default',
      size = 'default',
      isLoading = false,
      asChild = false,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-bold text-sm transition-all select-none active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 cursor-pointer';

    const variants = {
      default: 'bg-black text-white hover:bg-neutral-800 shadow-sm',
      destructive: 'bg-[#e20030] text-white hover:bg-rose-700 shadow-sm',
      outline: 'border border-gray-200 bg-white text-gray-900 hover:bg-gray-50 shadow-2xs',
      secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
      ghost: 'text-gray-700 hover:bg-gray-100 hover:text-black',
      link: 'text-rose-600 underline-offset-4 hover:underline p-0 h-auto',
      gradient: 'bg-gradient-to-r from-[#e20030] via-rose-500 to-pink-500 text-white shadow-md hover:opacity-95',
      premium:
        'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md hover:from-amber-600 hover:to-amber-700'
    };

    const sizes = {
      default: 'h-11 px-5 py-2 rounded-xl',
      sm: 'h-9 px-3.5 rounded-lg text-xs',
      lg: 'h-13 px-8 rounded-2xl text-base',
      icon: 'h-10 w-10 rounded-full p-0',
      pill: 'h-10 px-6 rounded-full text-sm'
    };

    const Component = asChild ? Slot : 'button';

    return (
      <Component
        ref={ref}
        disabled={asChild ? undefined : disabled || isLoading}
        aria-disabled={asChild && (disabled || isLoading) ? true : undefined}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && !asChild && <Loader2 className="w-4 h-4 mr-2 animate-spin text-current" />}
        {children}
      </Component>
    );
  }
);
Button.displayName = 'Button';
