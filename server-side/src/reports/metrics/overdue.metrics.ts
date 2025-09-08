export class OverdueMetrics {
  static calculate(
    rows: {
      id: string;
      carId: string;
      expectedEndDate: Date | null;
      status: string;
    }[],
    now: Date,
  ) {
    return rows
      .filter(
        (r) =>
          r.status !== 'completed' &&
          r.status !== 'canceled' &&
          r.expectedEndDate &&
          r.expectedEndDate < now,
      )
      .map((r) => ({
        id: r.id,
        carId: r.carId,
        expectedEndDate: r.expectedEndDate,
      }));
  }
}
