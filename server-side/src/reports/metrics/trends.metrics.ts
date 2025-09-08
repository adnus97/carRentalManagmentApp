import {
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  formatISO,
  startOfWeek,
  startOfMonth,
  max,
} from 'date-fns';

export class TrendsMetrics {
  static calculate(
    rows: {
      startDate: Date;
      totalPaid: number | null;
      totalPrice: number | null;
    }[],
    from: Date,
    to: Date,
    interval: 'day' | 'week' | 'month',
  ) {
    const bucket = (d: Date) => {
      if (interval === 'day') {
        return formatISO(d, { representation: 'date' });
      }
      if (interval === 'week') {
        const monday = startOfWeek(d, { weekStartsOn: 1 });
        return formatISO(monday, { representation: 'date' });
      }
      if (interval === 'month') {
        const monthStart = startOfMonth(d);
        return `${monthStart.getUTCFullYear()}-${String(
          monthStart.getUTCMonth() + 1,
        ).padStart(2, '0')}`;
      }
    };

    // Build all buckets
    let allBuckets: string[] = [];
    if (interval === 'day') {
      allBuckets = eachDayOfInterval({ start: from, end: to }).map((d) =>
        formatISO(d, { representation: 'date' }),
      );
    } else if (interval === 'week') {
      allBuckets = eachWeekOfInterval(
        { start: from, end: to },
        { weekStartsOn: 1 },
      ).map((d) => formatISO(d, { representation: 'date' }));
    } else {
      allBuckets = eachMonthOfInterval({ start: from, end: to }).map(
        (d) =>
          `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`,
      );
    }

    // Aggregate
    const trendMap = new Map<string, { revenue: number; rents: number }>();

    rows.forEach((r) => {
      const clampedStart = r.startDate < from ? from : r.startDate;
      const key = bucket(clampedStart);

      if (!key) return;

      const curr = trendMap.get(key) || { revenue: 0, rents: 0 };
      curr.revenue += r.totalPaid ?? r.totalPrice ?? 0;
      curr.rents += 1;
      trendMap.set(key, curr);
    });
    // Merge with empty buckets
    return allBuckets.map((date) => ({
      date,
      revenue: trendMap.get(date)?.revenue ?? 0,
      rents: trendMap.get(date)?.rents ?? 0,
    }));
  }
}
