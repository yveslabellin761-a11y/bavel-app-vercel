import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Camera } from 'lucide-react';

interface ProfileCardCarouselProps {
  images: string[];
  onClick: () => void;
  aspectRatioClassName?: string;
}

export default function ProfileCardCarousel({
  images,
  onClick,
  aspectRatioClassName = 'h-[220px]'
}: ProfileCardCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const dragDistanceRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset index if images list changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [images]);

  // Handle slide change
  const nextSlide = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (currentIndex < images.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const prevSlide = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  // Mouse Drag Events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    dragDistanceRef.current = 0;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (images.length <= 1) return;

    if (isDraggingRef.current) {
      const currentX = e.clientX;
      const diff = currentX - startXRef.current;
      dragDistanceRef.current = diff;
      setDragOffset(diff);
    } else {
      // Automatic preview sweep on hover (balayage gauche à droite et vice-versa)
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const hoverX = e.clientX - rect.left;
      const width = rect.width;
      if (width > 0) {
        const segmentWidth = width / images.length;
        const targetIndex = Math.min(
          images.length - 1,
          Math.max(0, Math.floor(hoverX / segmentWidth))
        );
        if (targetIndex !== currentIndex) {
          setCurrentIndex(targetIndex);
        }
      }
    }
  };

  const handleMouseUpOrLeave = (e: React.MouseEvent) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      const distance = dragDistanceRef.current;
      setDragOffset(0);

      // If drag distance was very small, treat as click
      if (Math.abs(distance) < 8) {
        onClick();
        return;
      }

      // Determine swipe transition
      const swipeThreshold = 55; // pixels
      if (distance > swipeThreshold && currentIndex > 0) {
        setCurrentIndex((prev) => prev - 1);
      } else if (distance < -swipeThreshold && currentIndex < images.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      }
    } else {
      // When hover leaves, reset to the main photo (index 0) for a clean visual catalog
      if (e.type === 'mouseleave') {
        setCurrentIndex(0);
      }
    }
  };

  // Touch/Mobile Swipe Events
  const handleTouchStart = (e: React.TouchEvent) => {
    isDraggingRef.current = true;
    startXRef.current = e.touches[0].clientX;
    dragDistanceRef.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startXRef.current;
    dragDistanceRef.current = diff;
    setDragOffset(diff);
  };

  const handleTouchEnd = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    const distance = dragDistanceRef.current;
    setDragOffset(0);

    if (Math.abs(distance) < 8) {
      onClick();
      return;
    }

    const swipeThreshold = 40; // lower threshold on mobile touch
    if (distance > swipeThreshold && currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    } else if (distance < -swipeThreshold && currentIndex < images.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  // Calculate dynamic transform value
  const transitionStyle = isDraggingRef.current ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
  const containerWidth = containerRef.current?.offsetWidth || 200;
  const percentageOffset = (dragOffset / containerWidth) * 100;
  const transformStyle = `translate3d(calc(-${currentIndex * 100}% + ${percentageOffset}%), 0, 0)`;

  return (
    <div 
      ref={containerRef}
      className={`relative ${aspectRatioClassName} select-none overflow-hidden bg-gray-100 group cursor-grab active:cursor-grabbing`}
      id="profile-card-carousel-container"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUpOrLeave}
      onMouseLeave={handleMouseUpOrLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onDragStart={(e) => e.preventDefault()}
    >
      {/* Slides Container */}
      <div 
        className="flex h-full w-full"
        style={{
          transform: transformStyle,
          transition: transitionStyle,
          willChange: 'transform'
        }}
      >
        {images.map((img, index) => (
          <div key={index} className="w-full h-full shrink-0 select-none pointer-events-none">
            <img 
              src={img} 
              alt={`Photo ${index + 1}`} 
              className="w-full h-full object-cover select-none pointer-events-none"
              draggable={false}
            />
          </div>
        ))}
      </div>

      {/* Slide Navigation Chevrons (Hidden on mobile touch, visible on desktop hover) */}
      {currentIndex > 0 && (
        <button
          onClick={prevSlide}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/75 hover:bg-white rounded-full flex items-center justify-center text-gray-800 shadow-md transition opacity-0 group-hover:opacity-100 cursor-pointer z-20"
          title="Précédent"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}
      {currentIndex < images.length - 1 && (
        <button
          onClick={nextSlide}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/75 hover:bg-white rounded-full flex items-center justify-center text-gray-800 shadow-md transition opacity-0 group-hover:opacity-100 cursor-pointer z-20"
          title="Suivant"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {/* Bottom Dots Indicator */}
      {images.length > 1 && (
        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex space-x-1.5 z-10 select-none pointer-events-none">
          {images.map((_, idx) => (
            <div 
              key={idx} 
              className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
