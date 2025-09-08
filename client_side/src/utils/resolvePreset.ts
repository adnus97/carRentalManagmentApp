// utils/resolvePreset.ts
import {
  subDays,
  startOfYear,
  endOfYear,
  startOfMonth,
  endOfMonth,
  subMonths,
  subYears,
  startOfDay,
  endOfDay,
  startOfToday,
  endOfToday,
} from 'date-fns';
import type { Preset } from '@/api/reports';

export function resolvePreset(preset: Preset): { from: Date; to: Date } {
  const today = new Date();

  switch (preset) {
    case 'today':
      return { from: startOfToday(), to: endOfToday() };

    case 'yesterday': {
      const y = subDays(today, 1);
      return { from: startOfDay(y), to: endOfDay(y) };
    }

    case 'last7d':
      return { from: subDays(today, 7), to: endOfToday() };

    case 'last30d':
      return { from: subDays(today, 30), to: endOfToday() };

    case 'last90d':
      return { from: subDays(today, 90), to: endOfToday() };

    case 'thisYear':
      return { from: startOfYear(today), to: endOfYear(today) };

    case 'prevMonth': {
      const prev = subMonths(today, 1);
      return { from: startOfMonth(prev), to: endOfMonth(prev) };
    }

    case 'prevTrimester': {
      const prev = subMonths(today, 3);
      return { from: startOfMonth(prev), to: endOfMonth(subMonths(today, 1)) };
    }

    case 'prevSemester': {
      const prev = subMonths(today, 6);
      return { from: startOfMonth(prev), to: endOfMonth(subMonths(today, 1)) };
    }

    case 'prevYear': {
      const prev = subYears(today, 1);
      return { from: startOfYear(prev), to: endOfYear(prev) };
    }

    default:
      return { from: subDays(today, 30), to: endOfToday() };
  }
}
