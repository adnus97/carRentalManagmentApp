// src/components/confirmation-dialog.tsx
import * as React from 'react';
import { createPortal } from 'react-dom';
import { X } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmText: string;
  cancelText: string;
  loadingText?: string;
  variant?: 'default' | 'destructive';
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText,
  cancelText,
  loadingText = 'Loading...',
  variant = 'default',
}: ConfirmationDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const dialogRef = React.useRef<HTMLDivElement>(null);

  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open && !isLoading) {
        onOpenChange(false);
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scrolling while dialog is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, isLoading, onOpenChange]);

  // Focus management
  React.useEffect(() => {
    if (open && dialogRef.current) {
      const focusableElements = dialogRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      const firstElement = focusableElements[0] as HTMLElement;
      if (firstElement) {
        firstElement.focus();
      }
    }
  }, [open]);

  const handleConfirm = async (e: React.MouseEvent) => {
    // Stop propagation to prevent this click from being caught by the wrapper
    e.stopPropagation();
    try {
      setIsLoading(true);
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error('Confirmation action failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!isLoading) {
      onOpenChange(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if the user clicked the wrapper element directly (the dark area),
    // not if they clicked the dialog itself (which bubbles up).
    if (e.target === e.currentTarget && !isLoading) {
      onOpenChange(false);
    }
  };

  if (!open) return null;

  return createPortal(
    /* 
      1. Wrapper: Handles the positioning and the "Outside Click".
         z-[100001] ensures it sits above the sidebar (z-[100000]).
    */
    <div
      className="fixed inset-0 z-[100001] flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      {/* 
        2. Visual Overlay: Purely cosmetic. 
           pointer-events-none ensures clicks pass through to the Wrapper for handling. 
      */}
      <div className="fixed inset-0 z-40 bg-black/50 dark:bg-black/70 transition-opacity pointer-events-none" />

      {/* 
        3. Dialog Content:
           We don't need a specific click handler here because bubbles
           will have e.target != e.currentTarget in the wrapper handler.
      */}
      <div
        ref={dialogRef}
        className="relative z-50 w-full max-w-md bg-white dark:bg-gray-1 rounded-lg shadow-xl transform transition-all border dark:border-gray-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-description"
        // Stop propagation just in case, though the check above handles it.
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCancel}
          disabled={isLoading}
          className="absolute right-2 top-2 h-8 w-8 opacity-70 hover:opacity-100 disabled:opacity-50"
          aria-label="Close"
        >
          <X size={16} />
        </Button>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <h2
              id="dialog-title"
              className="text-lg font-semibold text-gray-900 dark:text-white mb-2"
            >
              {title}
            </h2>
            <p
              id="dialog-description"
              className="text-sm text-gray-600 dark:text-gray-11"
            >
              {description}
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              {cancelText}
            </Button>
            <Button
              variant="default"
              className={
                variant === 'destructive'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : ''
              }
              onClick={handleConfirm}
              disabled={isLoading}
            >
              {isLoading ? loadingText : confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
