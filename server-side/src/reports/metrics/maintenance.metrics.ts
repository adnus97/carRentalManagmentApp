import { maintenanceLogs } from 'src/db/schema/maintenanceLogs';
import { and, eq, sql } from 'drizzle-orm';

export class MaintenanceMetrics {
  static async calculate(
    db: any,
    orgId: string,
    carId?: string,
    from?: Date,
    to?: Date,
  ) {
    const conditions = [eq(maintenanceLogs.orgId, orgId)];

    if (carId) {
      conditions.push(eq(maintenanceLogs.carId, carId));
    }

    if (from) {
      conditions.push(sql`${maintenanceLogs.createdAt} >= ${from}`);
    }

    if (to) {
      conditions.push(sql`${maintenanceLogs.createdAt} <= ${to}`);
    }

    const result = await db
      .select({
        totalCost: sql<number>`COALESCE(SUM(${maintenanceLogs.cost}), 0)`,
        maintenanceCount: sql<number>`COUNT(*)`,
        avgCost: sql<number>`COALESCE(AVG(${maintenanceLogs.cost}), 0)`,
      })
      .from(maintenanceLogs)
      .where(and(...conditions));

    return {
      totalMaintenanceCost: Number(result[0]?.totalCost || 0),
      maintenanceCount: Number(result[0]?.maintenanceCount || 0),
      avgMaintenanceCost: Number(result[0]?.avgCost || 0),
    };
  }
}
