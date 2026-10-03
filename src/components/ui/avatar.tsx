import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from '../../lib/utils';

export interface AvatarProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isOnline?: boolean;
  isVerified?: boolean;
}

export function Avatar({ className, size = 'md', isOnline, isVerified, children, ...props }: AvatarProps) {
  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-14 w-14 text-base',
    xl: 'h-20 w-20 text-xl'
  };

  return (
    <div className="relative inline-block shrink-0">
      <AvatarPrimitive.Root
        className={cn(
          'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-100 bg-gray-100 font-bold text-gray-700',
          sizes[size],
          className
        )}
        {...props}
      >
        {children}
      </AvatarPrimitive.Root>
      {isOnline && (
        <span
          aria-label="En ligne"
          className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white"
        />
      )}
      {isVerified && (
        <span
          aria-label="Profil vérifié"
          className="absolute right-0 top-0 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-500 text-[8px] font-black text-white ring-2 ring-white"
        >
          ✓
        </span>
      )}
    </div>
  );
}

export const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image ref={ref} className={cn('aspect-square h-full w-full object-cover', className)} {...props} />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

export const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      'flex h-full w-full items-center justify-center rounded-full bg-gray-100 font-bold uppercase text-gray-600',
      className
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;
