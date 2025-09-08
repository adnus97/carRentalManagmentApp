import { Interval, Preset } from '../types';

function startOfDayUTC(d: Date) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}
function endOfDayUTC(d: Date) {
  const x = new Date(d);
  x.setUTCHours(23, 59, 59, 999);
  return x;
}
function addDaysUTC(d: Date, n: number) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

export function resolvePreset(preset: Preset): {
  from: Date;
  to: Date;
  interval: Interval;
} {
  const now = new Date();

  switch (preset) {
    case 'today':
      return {
        from: startOfDayUTC(now),
        to: endOfDayUTC(now),
        interval: 'day',
      };
    case 'yesterday': {
      const y = addDaysUTC(startOfDayUTC(now), -1);
      return { from: startOfDayUTC(y), to: endOfDayUTC(y), interval: 'day' };
    }
    case 'last7d':
      return { from: addDaysUTC(now, -7), to: now, interval: 'day' };
    case 'last30d':
      return { from: addDaysUTC(now, -30), to: now, interval: 'day' };
    case 'last90d':
      return { from: addDaysUTC(now, -90), to: now, interval: 'day' };
    case 'thisYear':
      return {
        from: new Date(Date.UTC(now.getUTCFullYear(), 0, 1)),
        to: now,
        interval: 'month',
      };
    case 'prevYear': {
      const y = now.getUTCFullYear() - 1;
      return {
        from: new Date(Date.UTC(y, 0, 1)),
        to: new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999)),
        interval: 'month',
      };
    }
    default:
      return { from: addDaysUTC(now, -30), to: now, interval: 'day' };
  }
}
