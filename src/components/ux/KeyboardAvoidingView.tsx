import React, { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';

export interface KeyboardAvoidingViewProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  offset?: number;
}

export const KeyboardAvoidingView: React.FC<KeyboardAvoidingViewProps> = ({
  children,
  className,
  offset = 0,
  ...props
}) => {
  const [bottomInset, setBottomInset] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const handleResize = () => {
      if (!window.visualViewport) return;
      const keyboardHeight = window.innerHeight - window.visualViewport.height;
      setBottomInset(Math.max(0, keyboardHeight - offset));
    };

    window.visualViewport.addEventListener('resize', handleResize);
    window.visualViewport.addEventListener('scroll', handleResize);

    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('scroll', handleResize);
    };
  }, [offset]);

  return (
    <div
      className={cn('flex flex-col w-full transition-all duration-150', className)}
      style={{ paddingBottom: bottomInset > 0 ? `${bottomInset}px` : undefined }}
      {...props}
    >
      {children}
    </div>
  );
};
