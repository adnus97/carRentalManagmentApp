import * as React from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

function Pagination({ className, ...props }: React.ComponentProps<'nav'>) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      data-slot="pagination"
      className={cn('mx-auto flex w-full justify-center', className)}
      {...props}
    />
  );
}

function PaginationContent({
  className,
  ...props
}: React.ComponentProps<'ul'>) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn('flex flex-row items-center gap-1', className)}
      {...props}
    />
  );
}

function PaginationItem({ ...props }: React.ComponentProps<'li'>) {
  return <li data-slot="pagination-item" {...props} />;
}

type PaginationLinkProps = {
  isActive?: boolean;
  isPageNumber?: boolean;
  variant?: 'ghost' | 'outline' | string;
} & Pick<React.ComponentProps<typeof Button>, 'size'> &
  React.ComponentProps<'a'>;

function PaginationLink({
  className,
  isActive,
  isPageNumber,
  size = 'icon',
  variant,
  ...props
}: PaginationLinkProps) {
  // No background by default, border for active, hover/focus/active show accent background
  const baseClasses = cn(
    'bg-transparent',
    isActive
      ? 'border border-accent-8 text-accent-10'
      : 'border border-transparent text-accent-10',
    // Hover/focus/active effect for all except active
    !isActive && 'hover:bg-accent-6 focus:bg-accent-6 active:bg-accent-6',
  );

  return (
    <a
      aria-current={isActive ? 'page' : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      className={cn(
        buttonVariants({
          variant: 'ghost',
          size,
        }),
        baseClasses,
        'cursor-pointer transition-colors',
        className,
      )}
      {...props}
    />
  );
}

function PaginationPrevious({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  const { t } = useTranslation('layout');
  return (
    <PaginationLink
      aria-label={t('pagination.prev_aria', {
        defaultValue: 'Go to previous page',
      })}
      size="default"
      className={cn('gap-1 px-2.5 sm:pl-2.5', className)}
      {...props}
    >
      <ChevronLeftIcon />
      <span className="hidden sm:block">
        {t('pagination.prev', { defaultValue: 'Previous' })}
      </span>
    </PaginationLink>
  );
}

function PaginationNext({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  const { t } = useTranslation('layout');
  return (
    <PaginationLink
      aria-label={t('pagination.next_aria', {
        defaultValue: 'Go to next page',
      })}
      size="default"
      className={cn('gap-1 px-2.5 sm:pr-2.5', className)}
      {...props}
    >
      <span className="hidden sm:block">
        {t('pagination.next', { defaultValue: 'Next' })}
      </span>
      <ChevronRightIcon />
    </PaginationLink>
  );
}

function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<'span'>) {
  const { t } = useTranslation('layout');
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn('flex size-9 items-center justify-center', className)}
      {...props}
    >
      <MoreHorizontalIcon className="size-4" />
      <span className="sr-only">
        {t('pagination.more_pages', { defaultValue: 'More pages' })}
      </span>
    </span>
  );
}

export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
};
