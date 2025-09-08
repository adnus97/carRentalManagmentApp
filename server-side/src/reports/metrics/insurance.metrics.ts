import { cars } from 'src/db/schema/cars';
import { and, eq, sql } from 'drizzle-orm';

export class InsuranceMetrics {
  static async calculate(db: any, orgId: string, carId?: string) {
    const now = new Date();
    const thirty = new Date();
    thirty.setDate(thirty.getDate() + 30);

    const risky = await db
      .select({
        id: cars.id,
        make: cars.make,
        model: cars.model,
        insuranceExpiryDate: cars.insuranceExpiryDate,
        status: cars.status,
      })
      .from(cars)
      .where(
        and(
          eq(cars.orgId, orgId),
          sql`${cars.status} = 'active'`,
          sql`${cars.insuranceExpiryDate} <= ${thirty}`,
          ...(carId ? [eq(cars.id, carId)] : []),
        ),
      );

    return {
      total: risky.length,
      expired: risky.filter((c) => c.insuranceExpiryDate < now).length,
      critical: risky.filter((c) => {
        const days = Math.ceil(
          (c.insuranceExpiryDate.getTime() - now.getTime()) / 86400000,
        );
        return days > 0 && days <= 3;
      }).length,
      warning: risky.filter((c) => {
        const days = Math.ceil(
          (c.insuranceExpiryDate.getTime() - now.getTime()) / 86400000,
        );
        return days > 3 && days <= 7;
      }).length,
      info: risky.filter((c) => {
        const days = Math.ceil(
          (c.insuranceExpiryDate.getTime() - now.getTime()) / 86400000,
        );
        return days > 7 && days <= 30;
      }).length,
      cars: risky,
    };
  }
}
