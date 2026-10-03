import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <DialogPrimitive.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-xs data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
          <div className="relative z-10 w-full max-w-lg">{children}</div>
        </div>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export interface DialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  onClose?: () => void;
}

export function DialogContent({ className, children, onClose, ...props }: DialogContentProps) {
  return (
    <DialogPrimitive.Content
      className={cn(
        'relative w-full rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl outline-none',
        'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
        className
      )}
      {...props}
    >
      {onClose && (
        <DialogPrimitive.Close
          type="button"
          aria-label="Fermer"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900"
        >
          <X className="h-5 w-5" />
        </DialogPrimitive.Close>
      )}
      {children}
    </DialogPrimitive.Content>
  );
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-4 flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />;
}

export function DialogTitle({ className, ...props }: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title className={cn('text-xl font-black tracking-tight text-gray-900', className)} {...props} />
  );
}

export function DialogDescription({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn('text-sm font-medium text-gray-500', className)} {...props} />;
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex flex-col-reverse border-t border-gray-100 pt-4 sm:flex-row sm:justify-end sm:space-x-2',
        className
      )}
      {...props}
    />
  );
}
