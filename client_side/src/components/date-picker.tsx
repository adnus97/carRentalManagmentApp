'use client';

import React from 'react';
import { Label } from '@radix-ui/react-label';
import { CalendarIcon } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';

import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Calendar } from '../components/ui//calendar';

function formatDate(date: Date | undefined): string {
  if (!date) return '';
  return date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function isValidDate(date: Date | undefined): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

export function DatePickerDemo() {
  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState<Date | undefined>(
    new Date('2025-06-01'),
  );
  const [month, setMonth] = React.useState<Date | undefined>(date);
  const [value, setValue] = React.useState(formatDate(date));

  return (
    <div className="flex flex-col gap-3">
      <div className="relative flex items-center">
        <Input
          id="date"
          value={value}
          placeholder="June 01, 2025"
          className="bg-background pr-10"
          onChange={(e) => {
            const d = new Date(e.target.value);
            setValue(e.target.value);
            if (isValidDate(d)) {
              setDate(d);
              setMonth(d);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setOpen(true);
            }
          }}
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
              selected={date}
              month={month}
              captionLayout="dropdown"
              onMonthChange={setMonth}
              onSelect={(d) => {
                setDate(d);
                setValue(formatDate(d));
                setOpen(false);
              }}
            />
          </Popover.Content>
        </Popover.Root>
      </div>
    </div>
  );
}
