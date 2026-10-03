import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '../../lib/utils';

export interface ProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  value?: number;
  max?: number;
  variant?: 'default' | 'gradient' | 'premium';
}

export const Progress = React.forwardRef<React.ElementRef<typeof ProgressPrimitive.Root>, ProgressProps>(
  ({ className, value = 0, max = 100, variant = 'default', ...props }, ref) => {
    const safeMax = Number.isFinite(max) && max > 0 ? max : 100;
    const percentage = Math.min(100, Math.max(0, ((Number.isFinite(value) ? value : 0) / safeMax) * 100));
    const variants = {
      default: 'bg-[#e20030]',
      gradient: 'bg-gradient-to-r from-[#e20030] via-rose-500 to-amber-500',
      premium: 'bg-gradient-to-r from-amber-400 to-amber-600'
    };

    return (
      <ProgressPrimitive.Root
        ref={ref}
        value={value}
        max={safeMax}
        className={cn('relative h-2 w-full overflow-hidden rounded-full bg-gray-100', className)}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className={cn('h-full w-full flex-1 transition-all duration-300 ease-out', variants[variant])}
          style={{ transform: `translateX(-${100 - percentage}%)` }}
        />
      </ProgressPrimitive.Root>
    );
  }
);
Progress.displayName = ProgressPrimitive.Root.displayName;
