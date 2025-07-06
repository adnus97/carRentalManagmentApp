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
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, isLoading, onOpenChange]);

  // Handle clicks outside dialog
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        open &&
        !isLoading &&
        dialogRef.current &&
        !dialogRef.current.contains(e.target as Node)
      ) {
        onOpenChange(false);
      }
    };

    if (open) {
      // Add a small delay to prevent immediate closing
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
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

  const handleConfirm = async () => {
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

  const handleCancel = () => {
    if (!isLoading) {
      onOpenChange(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Background overlay */}
      <div className="fixed inset-0 bg-black/50 dark:bg-black/70 transition-opacity" />

      {/* Dialog */}
      <div
        ref={dialogRef}
        className="relative z-50 w-full max-w-md bg-white dark:bg-gray-1 rounded-lg shadow-xl transform transition-all border dark:border-gray-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-description"
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
              color={variant === 'destructive' ? 'red' : 'teal'}
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
