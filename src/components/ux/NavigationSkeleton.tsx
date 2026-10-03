import React from 'react';
import { Skeleton } from '../ui/skeleton';
import { cn } from '../../lib/utils';

export const DiscoverSkeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn('relative w-full h-[72vh] max-h-[640px] rounded-[32px] overflow-hidden bg-gray-100 p-4 flex flex-col justify-end', className)}>
      <Skeleton className="absolute inset-0 w-full h-full rounded-none" />
      <div className="relative z-10 space-y-3 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent rounded-[24px]">
        <Skeleton className="h-7 w-48 bg-white/30" />
        <Skeleton className="h-4 w-32 bg-white/20" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-6 w-20 rounded-full bg-white/20" />
          <Skeleton className="h-6 w-24 rounded-full bg-white/20" />
        </div>
      </div>
    </div>
  );
};

export const LikesGridSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-2 gap-3 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="aspect-3/4 rounded-2xl overflow-hidden relative bg-gray-100 p-3 flex flex-col justify-end">
          <Skeleton className="absolute inset-0 w-full h-full rounded-none" />
          <div className="relative z-10 space-y-1.5">
            <Skeleton className="h-4 w-3/4 bg-white/40" />
            <Skeleton className="h-3 w-1/2 bg-white/30" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const DiscussionsSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => {
  return (
    <div className="divide-y divide-gray-50 p-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3.5 p-3">
          <Skeleton className="w-14 h-14 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const ProfileSkeleton: React.FC = () => {
  return (
    <div className="p-4 space-y-6">
      <div className="flex flex-col items-center space-y-3">
        <Skeleton className="w-28 h-28 rounded-full" />
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  );
};
