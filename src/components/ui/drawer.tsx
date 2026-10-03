import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export function Drawer({ open, onOpenChange, children, title, description }: DrawerProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content className="fixed inset-0 z-50 flex items-end justify-center overflow-hidden border-0 bg-transparent p-0 outline-none sm:items-center">
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 400) onOpenChange(false);
            }}
            className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[32px] bg-white p-6 shadow-2xl sm:rounded-[32px]"
          >
            <div className="mb-4 mx-auto h-1.5 w-12 shrink-0 rounded-full bg-gray-200" />
            {title || description ? (
              <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-2">
                <div>
                  <DialogPrimitive.Title
                    className={cn(title ? 'text-lg font-black tracking-tight text-gray-900' : 'sr-only')}
                  >
                    {title || description}
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Description
                    className={cn(description ? 'text-xs font-medium text-gray-500' : 'sr-only')}
                  >
                    {description || title}
                  </DialogPrimitive.Description>
                </div>
                <DialogPrimitive.Close
                  type="button"
                  aria-label="Fermer"
                  className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </DialogPrimitive.Close>
              </div>
            ) : (
              <>
                <DialogPrimitive.Title className="sr-only">Panneau</DialogPrimitive.Title>
                <DialogPrimitive.Description className="sr-only">Contenu du panneau</DialogPrimitive.Description>
              </>
            )}
            <div className={cn('flex-1 overflow-y-auto')}>{children}</div>
          </motion.div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
