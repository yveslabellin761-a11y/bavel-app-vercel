import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import { getOptimizedImageUrl } from '../../utils/imageOptimizer';

export interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  aspectRatio?: 'square' | 'portrait' | 'landscape' | 'video' | 'auto';
  className?: string;
  containerClassName?: string;
  priority?: boolean;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = React.memo(({
  src,
  alt,
  aspectRatio = 'portrait',
  className,
  containerClassName,
  priority = false,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const aspectClasses = {
    square: 'aspect-square',
    portrait: 'aspect-3/4',
    landscape: 'aspect-4/3',
    video: 'aspect-16/9',
    auto: '',
  };

  const optimizedSrc = getOptimizedImageUrl(src, 750);

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-neutral-100',
        aspectClasses[aspectRatio],
        containerClassName
      )}
    >
      {/* Shimmer skeleton until loaded */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-neutral-200/80 animate-pulse" />
      )}

      <img
        src={optimizedSrc}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          setHasError(true);
          setIsLoaded(true);
        }}
        className={cn(
          'w-full h-full object-cover transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        {...props}
      />
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';
