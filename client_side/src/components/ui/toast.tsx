'use client';

import React from 'react';
import { toast as sonnerToast } from 'sonner';
import { CheckCircle, XCircle, Warning, Info } from '@phosphor-icons/react';
import { Button } from './button';

interface ToastData {
  title: string;
  description: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  icon?: React.ReactNode | null;
  button?: {
    label: string;
    onClick: () => void;
  };
}

export function toast({
  title,
  description,
  type = 'info',
  icon,
  button,
}: ToastData) {
  const getTitleColor = () => {
    switch (type) {
      case 'success':
        return 'text-green-600 dark:text-green-400';
      case 'error':
        return 'text-red-600 dark:text-red-400';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400';
      default:
        return 'text-gray-900 dark:text-white';
    }
  };

  const getDefaultIcon = () => {
    if (icon === null) return null;
    if (icon) return icon;

    const iconSize = 20;
    switch (type) {
      case 'success':
        return (
          <CheckCircle
            size={iconSize}
            className="text-green-500"
            weight="fill"
          />
        );
      case 'error':
        return (
          <XCircle size={iconSize} className="text-red-500" weight="fill" />
        );
      case 'warning':
        return (
          <Warning size={iconSize} className="text-yellow-500" weight="fill" />
        );
      default:
        return <Info size={iconSize} className="text-blue-500" weight="fill" />;
    }
  };

  const displayIcon = getDefaultIcon();

  return sonnerToast.custom((id) => {
    return (
      <div className="flex rounded-lg bg-white shadow-lg ring-1 ring-black/5 w-full md:max-w-[364px] items-center p-4 dark:bg-gray-2 dark:ring-white/10">
        <div className="flex flex-1 items-center">
          {displayIcon && (
            <div className="mr-3 flex-shrink-0">{displayIcon}</div>
          )}
          <div className="w-full">
            <p className={`text-sm font-medium ${getTitleColor()}`}>{title}</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">
              {description}
            </p>
          </div>
        </div>
        {button && (
          <div className="ml-5 shrink-0">
            <Button
              variant={'outline'}
              onClick={() => {
                button.onClick();
                sonnerToast.dismiss(id);
              }}
            >
              {button.label}
            </Button>
          </div>
        )}
      </div>
    );
  });
}

// Helper functions
export function successToast(
  message: string,
  actionLabel?: string,
  onAction?: () => void,
) {
  return toast({
    title: 'Success!',
    description: message,
    type: 'success',
    button:
      actionLabel && onAction
        ? {
            label: actionLabel,
            onClick: onAction,
          }
        : undefined,
  });
}

export function errorToast(
  message: string,
  actionLabel?: string,
  onAction?: () => void,
) {
  return toast({
    title: 'Error',
    description: message,
    type: 'error',
    button:
      actionLabel && onAction
        ? {
            label: actionLabel,
            onClick: onAction,
          }
        : undefined,
  });
}
