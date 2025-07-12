'use client';
import React from 'react';
import { CalendarIcon } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';

import { Button } from './ui/button';
import { Input } from './ui/input';
import { Calendar } from './ui/calendar';

interface DatePickerDemoProps {
  value?: Date;
  onChange: (date: Date) => void;
}

function formatDate(d?: Date): string {
  if (!d) return '';
  return d.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function DatePickerDemo({ value, onChange }: DatePickerDemoProps) {
  const today = new Date();
  const [open, setOpen] = React.useState(false);
  const [month, setMonth] = React.useState<Date>(value ?? today);

  // whenever form value changes, update month view
  React.useEffect(() => {
    if (value) setMonth(value);
  }, [value]);

  return (
    <div className="relative flex items-center">
      <Input
        id="date"
        value={formatDate(value)}
        placeholder={formatDate(today)}
        className="bg-background pr-10"
        readOnly
        onClick={() => setOpen(true)}
      />
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="absolute right-2 top-1/2 -translate-y-1/2 size-6"
          >
            <CalendarIcon className="size-3.5" />
            <span className="sr-only">Select date</span>
          </Button>
        </Popover.Trigger>
        <Popover.Content
          className="w-auto p-0 overflow-hidden"
          side="bottom"
          align="end"
          sideOffset={4}
        >
          <Calendar
            mode="single"
            selected={value ?? today}
            month={month}
            captionLayout="dropdown"
            onMonthChange={setMonth}
            onSelect={(d) => {
              if (d) {
                onChange(d);
                setOpen(false);
              }
            }}
          />
        </Popover.Content>
      </Popover.Root>
    </div>
  );
}
