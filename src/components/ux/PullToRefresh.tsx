import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform } from 'motion/react';
import { RefreshCw } from 'lucide-react';
import { useUX } from '../../context/UXContext';
import { cn } from '../../lib/utils';

export interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  className?: string;
  pullThreshold?: number;
  disabled?: boolean;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  className,
  pullThreshold = 70,
  disabled = false,
}) => {
  const { triggerFeedback } = useUX();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    const container = containerRef.current;
    if (container && container.scrollTop <= 0) {
      startYRef.current = e.touches[0].clientY;
      isPullingRef.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPullingRef.current || disabled || isRefreshing) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startYRef.current;

    if (diff > 0) {
      // Elastic damping effect
      const distance = Math.min(diff * 0.45, pullThreshold + 30);
      setPullDistance(distance);

      if (distance >= pullThreshold && pullDistance < pullThreshold) {
        triggerFeedback('light');
      }
    } else {
      setPullDistance(0);
      isPullingRef.current = false;
    }
  };

  const handleTouchEnd = async () => {
    if (!isPullingRef.current || disabled || isRefreshing) return;
    isPullingRef.current = false;

    if (pullDistance >= pullThreshold) {
      setIsRefreshing(true);
      setPullDistance(pullThreshold * 0.7);
      triggerFeedback('medium');

      try {
        await onRefresh();
      } catch (err) {
        console.warn('Pull-to-refresh error:', err);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
        triggerFeedback('success');
      }
    } else {
      setPullDistance(0);
    }
  };

  const progress = Math.min(1, pullDistance / pullThreshold);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={cn('relative overflow-y-auto overscroll-y-contain flex-1 w-full', className)}
    >
      {/* Pull Indicator */}
      <motion.div
        animate={{ height: pullDistance, opacity: pullDistance > 10 ? 1 : 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 200 }}
        className="overflow-hidden flex items-center justify-center pointer-events-none"
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white shadow-md border border-gray-100 text-[#e20030]">
          <RefreshCw
            className={cn('w-4 h-4 transition-transform', isRefreshing && 'animate-spin')}
            style={{ transform: isRefreshing ? undefined : `rotate(${progress * 360}deg)` }}
          />
        </div>
      </motion.div>

      {children}
    </div>
  );
};
