function toLocalDateOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function inclusiveDays(start: Date, end: Date): number {
  const s = toLocalDateOnly(start).getTime();
  const e = toLocalDateOnly(end).getTime();
  const msDay = 24 * 60 * 60 * 1000;
  if (e < s) return 0;
  return Math.floor((e - s) / msDay) + 1;
}

function overlapDaysInclusive(
  rentalStart: Date,
  rentalEnd: Date,
  from: Date,
  to: Date,
): number {
  const rs = toLocalDateOnly(rentalStart);
  const re = toLocalDateOnly(rentalEnd);
  const fs = toLocalDateOnly(from);
  const fe = toLocalDateOnly(to);
  if (re < fs || fe < rs) return 0;
  const os = rs > fs ? rs : fs;
  const oe = re < fe ? re : fe;
  return inclusiveDays(os, oe);
}

export class UtilizationMetrics {
  static calculate(
    rows: {
      startDate: Date;
      returnedAt: Date | null;
      expectedEndDate: Date | null;
    }[],
    from: Date,
    to: Date,
    fleetSize: number,
  ) {
    const periodDays = inclusiveDays(from, to);

    const rentedDays = rows.reduce((sum, r) => {
      const end = r.returnedAt ?? r.expectedEndDate ?? to;
      return sum + overlapDaysInclusive(r.startDate, end, from, to);
    }, 0);

    const available = fleetSize * periodDays;
    const utilization = available > 0 ? rentedDays / available : 0;
    return { utilization, periodDays, rentedDays };
  }
}
