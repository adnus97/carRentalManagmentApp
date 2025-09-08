import { rents } from 'src/db/schema/rents';
import { cars } from 'src/db/schema/cars';
import { sql, and, eq } from 'drizzle-orm';

export class TopCarsMetrics {
  static async calculate(db: any, orgId: string, from: Date, to: Date) {
    return db
      .select({
        carId: rents.carId,
        make: cars.make,
        model: cars.model,
        plateNumber: cars.plateNumber,
        revenue: sql<number>`COALESCE(SUM(${rents.totalPaid}), 0)`,
        rents: sql<number>`COUNT(*)`,
      })
      .from(rents)
      .leftJoin(cars, eq(rents.carId, cars.id))
      .where(
        and(
          eq(rents.orgId, orgId),
          sql`${rents.isDeleted} = false`,
          sql`${rents.startDate} < ${to} 
               AND COALESCE(${rents.returnedAt}, ${rents.expectedEndDate}, NOW()) > ${from}`,
        ),
      )
      .groupBy(rents.carId, cars.make, cars.model, cars.plateNumber)
      .orderBy(sql`COALESCE(SUM(${rents.totalPaid}),0) DESC`)
      .limit(5);
  }
}
