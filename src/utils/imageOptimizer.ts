/**
 * Image optimization utilities for high-performance mobile rendering
 * Prevents Cumulative Layout Shift (CLS) and supports lazy loading.
 */

export interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  aspectRatio?: '1:1' | '3:4' | '4:3' | '16:9';
  priority?: boolean;
}

export function getOptimizedImageUrl(url: string, width = 600): string {
  if (!url) return '';
  // If using unsplash, append optimal webp format and width params
  if (url.includes('images.unsplash.com')) {
    const cleanUrl = url.split('?')[0];
    return `${cleanUrl}?auto=format&fit=crop&w=${width}&q=80`;
  }
  return url;
}

export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = src;
    img.onload = () => resolve();
    img.onerror = () => reject();
  });
}

export function preloadNextProfiles(profiles: { photos?: string[]; photo?: string }[], count = 2) {
  const urlsToPreload: string[] = [];
  
  profiles.slice(0, count).forEach((p) => {
    if (p.photos && p.photos.length > 0) {
      urlsToPreload.push(p.photos[0]);
    } else if (p.photo) {
      urlsToPreload.push(p.photo);
    }
  });

  urlsToPreload.forEach((url) => {
    const img = new Image();
    img.src = getOptimizedImageUrl(url, 600);
  });
}
