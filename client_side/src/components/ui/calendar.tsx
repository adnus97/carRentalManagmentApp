'use client';

import * as React from 'react';
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from 'lucide-react';
import { DayButton, DayPicker, getDefaultClassNames } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = 'label',
  buttonVariant = 'ghost',
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>['variant'];
}) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        'bg-background group/calendar p-3 relative',
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className,
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString('default', { month: 'short' }),
        ...formatters,
      }}
      classNames={{
        root: cn('w-fit relative', defaultClassNames.root),
        months: cn(
          'flex gap-4 flex-col md:flex-row relative',
          defaultClassNames.months,
        ),
        month: cn('flex flex-col w-full gap-2', defaultClassNames.month),
        nav: cn(
          'flex items-center gap-1 w-full absolute top-0 inset-x-0 justify-between z-10',
          defaultClassNames.nav,
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          'h-7 w-7 aria-disabled:opacity-50 p-0 select-none ' +
            'hover:!bg-accent-6 hover:!text-white ' +
            'dark:hover:!bg-accent-2 dark:hover:!text-white ' +
            'rounded-md transition-colors z-20',
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          'h-7 w-7 aria-disabled:opacity-50 p-0 select-none ' +
            'hover:!bg-accent-6 hover:!text-white ' +
            'dark:hover:!bg-accent-2 dark:hover:!text-white ' +
            'rounded-md transition-colors z-20',
          defaultClassNames.button_next,
        ),
        month_caption: cn(
          'flex items-center justify-center h-7 w-full px-7 relative',
          defaultClassNames.month_caption,
        ),
        dropdowns: cn(
          'w-full flex items-center text-sm font-medium justify-center h-7 gap-1.5 relative z-30',
          defaultClassNames.dropdowns,
        ),
        dropdown_root: cn(
          'relative has-focus:border-ring border border-input shadow-xs ' +
            'has-focus:ring-ring/50 has-focus:ring-[3px] rounded-md ' +
            'bg-background text-foreground ' +
            // 'hover:!bg-accent-6 hover:!text-black ' +
            // 'dark:hover:!bg-accent-2 dark:hover:!text-black ' +
            'transition-colors z-40',
          defaultClassNames.dropdown_root,
        ),
        dropdown: cn(
          'absolute inset-0 opacity-0 cursor-pointer z-50 ' +
            'bg-background text-foreground ',
          // 'hover:bg-accent-6 hover:text-white ' +
          // 'dark:hover:bg-accent-2 dark:hover:text-white',
          defaultClassNames.dropdown,
        ),
        caption_label: cn(
          'select-none font-medium bg-background text-foreground',
          captionLayout === 'label'
            ? 'text-sm'
            : 'rounded-md pl-2 pr-1 flex items-center gap-1 text-sm h-7 ' +
                '[&>svg]:text-muted-foreground [&>svg]:size-3.5 ' +
                'hover:!bg-accent-6 hover:!text-white ' +
                'dark:hover:!bg-accent-2 dark:hover:!text-white ' +
                'transition-colors',
          defaultClassNames.caption_label,
        ),
        table: 'w-full border-collapse',
        weekdays: cn('flex mb-1', defaultClassNames.weekdays),
        weekday: cn(
          'text-muted-foreground rounded-md flex-1 font-normal text-xs ' +
            'select-none text-center py-1 w-7',
          defaultClassNames.weekday,
        ),
        week: cn('flex w-full', defaultClassNames.week),
        week_number_header: cn(
          'select-none w-7',
          defaultClassNames.week_number_header,
        ),
        week_number: cn(
          'text-xs select-none text-muted-foreground',
          defaultClassNames.week_number,
        ),
        day: cn(
          'relative flex-1 p-0 text-center select-none',
          defaultClassNames.day,
        ),
        range_start: cn('bg-transparent', defaultClassNames.range_start),
        range_middle: cn('bg-transparent', defaultClassNames.range_middle),
        range_end: cn('bg-transparent', defaultClassNames.range_end),
        today: cn('text-current', defaultClassNames.today),
        outside: cn(
          'text-muted-foreground aria-selected:text-muted-foreground',
          defaultClassNames.outside,
        ),
        disabled: cn(
          'text-muted-foreground opacity-50',
          defaultClassNames.disabled,
        ),
        hidden: cn('invisible', defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => (
          <div
            data-slot="calendar"
            ref={rootRef}
            className={cn('relative', className)}
            {...props}
          />
        ),
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === 'left')
            return (
              <ChevronLeftIcon className={cn('size-4', className)} {...props} />
            );
          if (orientation === 'right')
            return (
              <ChevronRightIcon
                className={cn('size-4', className)}
                {...props}
              />
            );
          return (
            <ChevronDownIcon className={cn('size-4', className)} {...props} />
          );
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...props }) => (
          <td {...props}>
            <div className="flex h-7 w-7 items-center justify-center text-center">
              {children}
            </div>
          </td>
        ),
        ...components,
      }}
      {...props}
    />
  );
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames();
  const ref = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  // Extract and remove any props that Button doesn't accept
  const { color, ...buttonProps } = props as any;

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        // base transparent
        'h-7 w-7 p-0 font-normal text-sm leading-none !bg-transparent text-foreground rounded-md transition-colors',

        // hover in light uses accent-6, hover in dark uses accent-2
        'hover:!bg-accent-6 hover:!text-white dark:hover:!bg-accent-2 dark:hover:!text-white',

        // selected day
        'data-[selected-single=true]:!bg-teal-500 data-[selected-single=true]:!text-white ' +
          'data-[selected-single=true]:hover:!bg-teal-600',

        // ranges transparent + hover
        'data-[range-middle=true]:!bg-transparent data-[range-middle=true]:!text-foreground ' +
          'data-[range-middle=true]:hover:!bg-accent-6 data-[range-middle=true]:hover:!text-white ' +
          'dark:data-[range-middle=true]:hover:!bg-accent-2 dark:data-[range-middle=true]:hover:!text-white',
        'data-[range-start=true]:!bg-transparent data-[range-start=true]:!text-foreground ' +
          'data-[range-start=true]:hover:!bg-accent-6 data-[range-start=true]:hover:!text-white ' +
          'dark:data-[range-start=true]:hover:!bg-accent-2 dark:data-[range-start=true]:hover:!text-white',
        'data-[range-end=true]:!bg-transparent data-[range-end=true]:!text-foreground ' +
          'data-[range-end=true]:hover:!bg-accent-6 data-[range-end=true]:hover:!text-white ' +
          'dark:data-[range-end=true]:hover:!bg-accent-2 dark:data-[range-end=true]:hover:!text-white',

        // non-selected override
        '[&:not([data-selected-single=true])]:!bg-transparent ' +
          '[&:not([data-selected-single=true])]:!text-foreground ' +
          '[&:not([data-selected-single=true])]:hover:!bg-accent-6 ' +
          '[&:not([data-selected-single=true])]:hover:!text-white ' +
          'dark:[&:not([data-selected-single=true])]:hover:!bg-accent-2 ' +
          'dark:[&:not([data-selected-single=true])]:hover:!text-white',

        // focus ring
        'group-data-[focused=true]/day:border-ring ' +
          'group-data-[focused=true]/day:ring-ring/20 ' +
          'group-data-[focused=true]/day:relative ' +
          'group-data-[focused=true]/day:z-10 ' +
          'group-data-[focused=true]/day:ring-1',

        defaultClassNames.day,
        className,
      )}
      {...buttonProps}
    />
  );
}

export { Calendar, CalendarDayButton };
