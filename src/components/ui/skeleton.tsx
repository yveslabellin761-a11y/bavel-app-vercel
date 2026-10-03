import * as React from 'react';
import { cn } from '../../lib/utils';

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-xl bg-gray-200/70', className)}
      {...props}
    />
  );
}

export function ProfileCardSkeleton() {
  return (
    <div className="w-full rounded-3xl overflow-hidden border border-gray-100 bg-white p-3 shadow-xs space-y-3">
      <Skeleton className="w-full aspect-3/4 rounded-2xl" />
      <div className="space-y-2 p-1">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export function ChatListItemSkeleton() {
  return (
    <div className="flex items-center space-x-3 p-3">
      <Skeleton className="w-13 h-13 rounded-full shrink-0" />
      <div className="space-y-2 flex-1">
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-12" />
        </div>
        <Skeleton className="h-3 w-4/5" />
      </div>
    </div>
  );
}
