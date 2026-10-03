import React, { useState, useEffect, useRef } from 'react';

interface LazyBlurImageProps {
  src: string;
  alt: string;
  className?: string;
  blurHashPlaceholder?: string;
}

/**
 * LazyBlurImage Component
 * Uses IntersectionObserver for lazy loading images with progressive Blur-to-Sharp loading
 * to prevent UI freezes and save mobile data bandwidth.
 */
export function LazyBlurImage({ src, alt, className = '', blurHashPlaceholder }: LazyBlurImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '120px' } // Start loading 120px before entering viewport
    );

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  // Generate deterministic subtle SVG blur placeholder string based on image URL or placeholder
  const svgPlaceholder = blurHashPlaceholder || 
    `data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 133'%3E%3Crect width='100%25' height='100%25' fill='%23e2e8f0'/%3E%3C/svg%3E`;

  return (
    <div ref={containerRef} className={`relative overflow-hidden bg-slate-200 ${className}`}>
      {/* Low-res Blur Placeholder */}
      <div
        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-500 ease-out scale-105 filter blur-lg ${
          isLoaded ? 'opacity-0' : 'opacity-100'
        }`}
        style={{ backgroundImage: `url(${svgPlaceholder})` }}
      />

      {/* Main Image Loaded on Demand */}
      {isInView && (
        <img
          src={src}
          alt={alt}
          decoding="async"
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          className={`w-full h-full object-cover transition-all duration-500 ease-out ${
            isLoaded ? 'opacity-100 filter-none scale-100' : 'opacity-0 filter blur-md scale-105'
          }`}
        />
      )}
    </div>
  );
}
