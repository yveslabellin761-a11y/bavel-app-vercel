import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '../../lib/utils';

export function Tabs({
  value,
  onValueChange,
  defaultValue,
  className,
  children
}: {
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <TabsPrimitive.Root
      value={value}
      onValueChange={onValueChange}
      defaultValue={defaultValue}
      className={cn('w-full', className)}
    >
      {children}
    </TabsPrimitive.Root>
  );
}

export function TabsList({ className, children, ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        'inline-flex h-11 w-full items-center justify-center rounded-2xl bg-gray-100 p-1 text-gray-500',
        className
      )}
      {...props}
    >
      {children}
    </TabsPrimitive.List>
  );
}

export function TabsTrigger({
  value,
  className,
  children,
  badge,
  ...props
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & { badge?: React.ReactNode }) {
  return (
    <TabsPrimitive.Trigger
      value={value}
      className={cn(
        'relative inline-flex flex-1 cursor-pointer items-center justify-center whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-bold transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 sm:text-sm',
        'text-gray-500 hover:text-gray-800 data-[state=active]:font-black data-[state=active]:text-black data-[state=active]:shadow-xs data-[state=active]:bg-white',
        className
      )}
      {...props}
    >
      <span className="relative z-10 flex items-center justify-center gap-1.5">
        {children}
        {badge}
      </span>
    </TabsPrimitive.Trigger>
  );
}

export function TabsContent({
  value,
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      value={value}
      className={cn(
        'mt-3 focus-visible:outline-none data-[state=active]:animate-in data-[state=active]:fade-in-0',
        className
      )}
      {...props}
    >
      {children}
    </TabsPrimitive.Content>
  );
}
