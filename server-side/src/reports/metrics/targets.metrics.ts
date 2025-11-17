import { carMonthlyTargets } from 'src/db/schema/carMonthlyTargets';
import { rents } from 'src/db/schema/rents';
import { cars } from 'src/db/schema/cars';
import { and, eq, sql } from 'drizzle-orm';

export class TargetsMetrics {
  static async calculate(db: any, orgId: string, from: Date, to: Date) {
    // 1. Get all targets for this org
    const targets = await db
      .select({
        id: carMonthlyTargets.id,
        carId: carMonthlyTargets.carId,
        orgId: carMonthlyTargets.orgId,
        startDate: carMonthlyTargets.startDate,
        endDate: carMonthlyTargets.endDate,
        targetRents: carMonthlyTargets.targetRents,
        revenueGoal: carMonthlyTargets.revenueGoal,
        make: cars.make,
        model: cars.model,
        plateNumber: cars.plateNumber,
      })
      .from(carMonthlyTargets)
      .leftJoin(cars, eq(carMonthlyTargets.carId, cars.id))
      .where(
        and(
          eq(carMonthlyTargets.orgId, orgId),
          sql`${carMonthlyTargets.startDate} <= ${to}`,
          sql`${carMonthlyTargets.endDate} >= ${from}`,
        ),
      );

    if (!targets.length) return [];

    // 2. For each target, calculate actuals with proportional revenue logic
    const results = [];
    for (const t of targets) {
      console.log(
        `Calculating actuals for target ${t.id} (${t.startDate} to ${t.endDate})`,
      );

      // Normalize timestamps to calendar days
      const rentStartDay = sql`date_trunc('day', ${rents.startDate}::timestamp)`;
      const rentEndDay = sql`date_trunc('day', COALESCE(${rents.returnedAt}, ${rents.expectedEndDate})::timestamp)`;
      const targetStartDay = sql`date_trunc('day', ${t.startDate}::timestamp)`;
      const targetEndDay = sql`date_trunc('day', ${t.endDate}::timestamp)`;

      // Overlapped days inside target (inclusive +1)
      const overlapDays = sql<number>`
  GREATEST(
    0,
    DATE_PART('day', LEAST(${targetEndDay}, ${rentEndDay}) - GREATEST(${targetStartDay}, ${rentStartDay})) + 1
  )
`;

      // Accrued revenue = cars.pricePerDay × overlapDays
      const actuals = await db
        .select({
          revenue: sql<number>`
      COALESCE(
        SUM( (${cars.pricePerDay}::numeric) * ${overlapDays}::numeric ),
        0
      )
    `,
          rentsCount: sql<number>`COUNT(*)`,
        })
        .from(rents)
        .leftJoin(cars, eq(rents.carId, cars.id)) // needed to read pricePerDay
        .where(
          and(
            eq(rents.orgId, orgId),
            eq(rents.carId, t.carId),
            sql`${rents.isDeleted} = false`,
            // overlap with target period
            sql`${rents.startDate} <= ${t.endDate}`,
            sql`(
        ${rents.returnedAt} >= ${t.startDate}
        OR ${rents.expectedEndDate} >= ${t.startDate}
        OR ${rents.status} IN ('active', 'reserved')
        OR ${rents.isOpenContract} = true
      )`,
          ),
        );

      results.push({
        ...t,
        targetRevenue: t.revenueGoal, // your goal
        actualRevenue: Math.round(actuals[0]?.revenue ?? 0), // exact earned
        actualRents: actuals[0]?.rentsCount ?? 0,
      });
    }

    console.log('Final results:', results);
    return results;
  }
}
