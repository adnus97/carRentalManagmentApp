'use client';

import React from 'react';
import { CalendarIcon, Clock } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';

import { Button } from './ui/button';
import { Input } from './ui/input';
import { Calendar } from './ui/calendar';

interface DateTimePickerProps {
  value?: Date;
  onChange: (date: Date) => void;
  disabled?: boolean;
  placeholder?: string;
}

function formatDateTime(d?: Date): string {
  if (!d) return '';
  return (
    d.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }) +
    ' ' +
    d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  );
}

// Helper function to create a date without timezone issues
function createLocalDate(
  year: number,
  month: number,
  day: number,
  hour: number = 0,
  minute: number = 0,
): Date {
  return new Date(year, month, day, hour, minute);
}

// Helper function to get current date/time
function getCurrentDateTime(): Date {
  return new Date();
}

export function DatePickerDemo({
  value,
  onChange,
  disabled,
  placeholder,
}: DateTimePickerProps) {
  const now = getCurrentDateTime();
  const [open, setOpen] = React.useState(false);
  const [month, setMonth] = React.useState<Date>(value ?? now);
  const [selectedTime, setSelectedTime] = React.useState({
    hours: value?.getHours() ?? now.getHours(),
    minutes: value?.getMinutes() ?? now.getMinutes(),
  });

  // Set default value to current date/time if no value provided
  React.useEffect(() => {
    if (!value) {
      onChange(now);
    }
  }, []);

  // Update month view when value changes
  React.useEffect(() => {
    if (value) {
      setMonth(value);
      setSelectedTime({
        hours: value.getHours(),
        minutes: value.getMinutes(),
      });
    }
  }, [value]);

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      // Create new date with selected date but preserve current time
      const newDateTime = createLocalDate(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        selectedTime.hours,
        selectedTime.minutes,
      );
      onChange(newDateTime);
    }
  };

  const handleTimeChange = (type: 'hours' | 'minutes', inputValue: string) => {
    const numValue = parseInt(inputValue, 10);
    if (isNaN(numValue)) return;

    const newTime = {
      ...selectedTime,
      [type]:
        type === 'hours'
          ? Math.max(0, Math.min(23, numValue))
          : Math.max(0, Math.min(59, numValue)),
    };

    setSelectedTime(newTime);

    // Use currentValue (the Date object) instead of value (the string)
    if (currentValue) {
      const newDateTime = createLocalDate(
        currentValue.getFullYear(),
        currentValue.getMonth(),
        currentValue.getDate(),
        newTime.hours,
        newTime.minutes,
      );
      onChange(newDateTime);
    }
  };

  const currentValue = value ?? now;

  return (
    <div className="relative flex items-center">
      <Input
        id="datetime"
        value={formatDateTime(currentValue)}
        placeholder={placeholder ?? formatDateTime(now)}
        className="bg-background pr-10"
        readOnly
        onClick={() => !disabled && setOpen(true)}
        disabled={disabled}
      />
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="absolute right-2 top-1/2 -translate-y-1/2 size-6"
            disabled={disabled}
          >
            <CalendarIcon className="size-3.5" />
            <span className="sr-only">Select date and time</span>
          </Button>
        </Popover.Trigger>
        <Popover.Content
          className="w-auto p-0 overflow-hidden bg-background border rounded-lg shadow-lg"
          side="bottom"
          align="end"
          sideOffset={4}
        >
          <div className="p-0">
            <Calendar
              mode="single"
              selected={currentValue}
              month={month}
              captionLayout="dropdown"
              onMonthChange={setMonth}
              onSelect={handleDateSelect}
              initialFocus
            />

            {/* Time Picker Section */}
            <div className="border-t p-3 bg-background">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">Time</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min="0"
                    max="23"
                    value={selectedTime.hours.toString().padStart(2, '0')}
                    onChange={(e) => handleTimeChange('hours', e.target.value)}
                    className="w-16 text-center"
                    placeholder="HH"
                  />
                  <span className="text-muted-foreground">:</span>
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    value={selectedTime.minutes.toString().padStart(2, '0')}
                    onChange={(e) =>
                      handleTimeChange('minutes', e.target.value)
                    }
                    className="w-16 text-center"
                    placeholder="MM"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const now = getCurrentDateTime();
                    const newTime = {
                      hours: now.getHours(),
                      minutes: now.getMinutes(),
                    };
                    setSelectedTime(newTime);

                    if (currentValue) {
                      const newDateTime = createLocalDate(
                        currentValue.getFullYear(),
                        currentValue.getMonth(),
                        currentValue.getDate(),
                        newTime.hours,
                        newTime.minutes,
                      );
                      onChange(newDateTime);
                    }
                  }}
                >
                  Now
                </Button>
              </div>
              <div className="flex justify-end gap-2 mt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="button" size="sm" onClick={() => setOpen(false)}>
                  Done
                </Button>
              </div>
            </div>
          </div>
        </Popover.Content>
      </Popover.Root>
    </div>
  );
}
