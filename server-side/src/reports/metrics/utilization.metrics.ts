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
    const periodDays = Math.max(
      1,
      Math.ceil((to.getTime() - from.getTime()) / 86400000),
    );

    const rentedDays = rows.reduce((days, r) => {
      const start = r.startDate < from ? from : r.startDate;
      const end = r.returnedAt || r.expectedEndDate || to;
      const clippedEnd = end > to ? to : end;
      const d = Math.max(
        0,
        Math.ceil((clippedEnd.getTime() - start.getTime()) / 86400000),
      );
      return days + d;
    }, 0);

    const utilization =
      fleetSize > 0 ? (rentedDays / (fleetSize * periodDays)) * 100 : 0;

    return { utilization, periodDays };
  }
}
