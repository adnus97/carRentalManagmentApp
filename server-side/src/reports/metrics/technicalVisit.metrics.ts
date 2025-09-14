import { cars } from 'src/db/schema/cars';
import { and, eq, sql } from 'drizzle-orm';

export class TechnicalVisitMetrics {
  static async calculate(db: any, orgId: string, carId?: string) {
    const now = new Date();
    const thirty = new Date();
    thirty.setDate(thirty.getDate() + 30);

    const risky = await db
      .select({
        id: cars.id,
        make: cars.make,
        model: cars.model,
        technicalVisiteExpiryDate: cars.technicalVisiteExpiryDate,
        status: cars.status,
      })
      .from(cars)
      .where(
        and(
          eq(cars.orgId, orgId),
          sql`${cars.status} = 'active'`,
          sql`${cars.technicalVisiteExpiryDate} <= ${thirty}`,
          ...(carId ? [eq(cars.id, carId)] : []),
        ),
      );

    return {
      total: risky.length,
      expired: risky.filter((c) => c.technicalVisiteExpiryDate < now).length,
      critical: risky.filter((c) => {
        const days = Math.ceil(
          (c.technicalVisiteExpiryDate.getTime() - now.getTime()) / 86400000,
        );
        return days > 0 && days <= 3;
      }).length,
      warning: risky.filter((c) => {
        const days = Math.ceil(
          (c.technicalVisiteExpiryDate.getTime() - now.getTime()) / 86400000,
        );
        return days > 3 && days <= 7;
      }).length,
      info: risky.filter((c) => {
        const days = Math.ceil(
          (c.technicalVisiteExpiryDate.getTime() - now.getTime()) / 86400000,
        );
        return days > 7 && days <= 30;
      }).length,
      // ✅ FIX: Calculate individual car risk status AND rename date field
      cars: risky.map((c) => {
        // ✅ Use the same logic as the aggregated count
        const isExpired = c.technicalVisiteExpiryDate < now;

        let riskStatus;
        if (isExpired) {
          riskStatus = 'expired'; // ✅ Use date comparison, not days calculation
        } else {
          const days = Math.ceil(
            (c.technicalVisiteExpiryDate.getTime() - now.getTime()) / 86400000,
          );
          if (days <= 3) riskStatus = 'critical';
          else if (days <= 7) riskStatus = 'warning';
          else if (days <= 30) riskStatus = 'info';
          else riskStatus = 'active';
        }

        return {
          ...c,
          insuranceExpiryDate: c.technicalVisiteExpiryDate, // Rename field
          status: riskStatus,
        };
      }),
    };
  }
}
