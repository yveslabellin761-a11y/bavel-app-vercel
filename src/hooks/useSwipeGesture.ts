import { useRef, useCallback } from 'react';

export interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
}

export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50,
}: SwipeHandlers) {
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartPos.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStartPos.current) return;

      const deltaX = e.changedTouches[0].clientX - touchStartPos.current.x;
      const deltaY = e.changedTouches[0].clientY - touchStartPos.current.y;
      touchStartPos.current = null;

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal Swipe
        if (deltaX > threshold) {
          onSwipeRight?.();
        } else if (deltaX < -threshold) {
          onSwipeLeft?.();
        }
      } else {
        // Vertical Swipe
        if (deltaY > threshold) {
          onSwipeDown?.();
        } else if (deltaY < -threshold) {
          onSwipeUp?.();
        }
      }
    },
    [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold]
  );

  return { onTouchStart, onTouchEnd };
}
