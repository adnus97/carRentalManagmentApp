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

      // ✅ Calculate proportional revenue for overlapping rentals
      const actuals = await db
        .select({
          revenue: sql<number>`
            COALESCE(
              SUM(
                CASE 
                  WHEN ${rents.totalPaid} > 0 THEN
                    ${rents.totalPaid} * (
                      -- Calculate overlap days
                      GREATEST(0, 
                        LEAST(
                          EXTRACT(epoch FROM ${t.endDate}::timestamp) / 86400,
                          EXTRACT(epoch FROM COALESCE(${rents.returnedAt}, ${rents.expectedEndDate})::timestamp) / 86400
                        ) - 
                        GREATEST(
                          EXTRACT(epoch FROM ${t.startDate}::timestamp) / 86400,
                          EXTRACT(epoch FROM ${rents.startDate}::timestamp) / 86400
                        ) + 1
                      ) / 
                      -- Calculate total rental days (minimum 1 to avoid division by zero)
                      GREATEST(1,
                        EXTRACT(epoch FROM COALESCE(${rents.returnedAt}, ${rents.expectedEndDate})::timestamp) / 86400 - 
                        EXTRACT(epoch FROM ${rents.startDate}::timestamp) / 86400 + 1
                      )
                    )
                  ELSE 0
                END
              ), 
              0
            )
          `,
          rentsCount: sql<number>`COUNT(*)`,
          // ✅ Debug info - you can remove this later
          debugInfo: sql<string>`
            STRING_AGG(
              'Rent: ' || ${rents.id} || 
              ' | Total: ' || ${rents.totalPaid} ||
              ' | Start: ' || ${rents.startDate} ||
              ' | End: ' || COALESCE(${rents.returnedAt}::text, ${rents.expectedEndDate}::text) ||
              ' | Overlap Days: ' || GREATEST(0, 
                LEAST(
                  EXTRACT(epoch FROM ${t.endDate}::timestamp) / 86400,
                  EXTRACT(epoch FROM COALESCE(${rents.returnedAt}, ${rents.expectedEndDate})::timestamp) / 86400
                ) - 
                GREATEST(
                  EXTRACT(epoch FROM ${t.startDate}::timestamp) / 86400,
                  EXTRACT(epoch FROM ${rents.startDate}::timestamp) / 86400
                ) + 1
              ) ||
              ' | Total Days: ' || GREATEST(1,
                EXTRACT(epoch FROM COALESCE(${rents.returnedAt}, ${rents.expectedEndDate})::timestamp) / 86400 - 
                EXTRACT(epoch FROM ${rents.startDate}::timestamp) / 86400 + 1
              ),
              ' || '
            )
          `,
        })
        .from(rents)
        .where(
          and(
            eq(rents.orgId, orgId),
            eq(rents.carId, t.carId),
            sql`${rents.isDeleted} = false`,
            // ✅ Overlap logic: rent overlaps with target period
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
        targetRevenue: t.revenueGoal,
        actualRevenue: Math.round(actuals[0]?.revenue ?? 0), // Round to avoid decimals
        actualRents: actuals[0]?.rentsCount ?? 0,
      });
    }

    console.log('Final results:', results);
    return results;
  }
}
