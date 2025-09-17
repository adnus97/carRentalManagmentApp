import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseService } from 'src/db';
import { rents } from 'src/db/schema/rents';
import { cars } from 'src/db/schema/cars';
import { organization } from 'src/db/schema/organization';
import { sql, and, eq } from 'drizzle-orm';
import { resolvePreset } from './presets/preset.resolver';
import { RevenueMetrics } from './metrics/revenue.metrics';
import { UtilizationMetrics } from './metrics/utilization.metrics';
import { InsuranceMetrics } from './metrics/insurance.metrics';
import { OverdueMetrics } from './metrics/overdue.metrics';
import { TopCarsMetrics } from './metrics/topCars.metrics';
import { TrendsMetrics } from './metrics/trends.metrics';
import { TargetsMetrics } from './metrics/targets.metrics';
import { MaintenanceMetrics } from './metrics/maintenance.metrics';
import { TechnicalVisitMetrics } from './metrics/technicalVisit.metrics';
import {
  formatISO,
  startOfWeek,
  startOfMonth,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
} from 'date-fns';

function toLocalDateOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// Inclusive: 2025-09-01 to 2025-09-01 => 1 day
function inclusiveDays(start: Date, end: Date): number {
  const s = toLocalDateOnly(start).getTime();
  const e = toLocalDateOnly(end).getTime();
  const msDay = 24 * 60 * 60 * 1000;
  if (e < s) return 0;
  return Math.floor((e - s) / msDay) + 1;
}
// Overlap days (inclusive) between rental and [from, to]
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

@Injectable()
export class ReportsService {
  constructor(private readonly db: DatabaseService) {}

  private async getOrgId(userId: string): Promise<string> {
    const org = await this.db.db
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.userId, userId));

    if (!org.length) {
      throw new BadRequestException('No organization found for this user.');
    }

    return org[0].id;
  }

  async getSummary(params: {
    userId: string;
    preset?: string;
    from?: Date;
    to?: Date;
    interval?: 'day' | 'week' | 'month';
    carId?: string;
  }) {
    const { preset, from, to, interval, carId } = params;

    let range;
    if (preset) {
      range = resolvePreset(preset as any);
    } else if (from && to) {
      range = { from, to, interval: interval ?? 'day' };
    } else {
      throw new BadRequestException('Provide preset or from/to range');
    }

    const orgId = await this.getOrgId(params.userId);
    const maintenance = await MaintenanceMetrics.calculate(
      this.db.db,
      orgId,
      carId,
      range.from,
      range.to,
    );

    const technicalVisit = await TechnicalVisitMetrics.calculate(
      this.db.db,
      orgId,
      carId,
    );
    // ✅ FIXED: Join cars table and select pricePerDay
    const rows = await this.db.db
      .select({
        // Rent fields
        id: rents.id,
        startDate: rents.startDate,
        returnedAt: rents.returnedAt,
        expectedEndDate: rents.expectedEndDate,
        totalPaid: rents.totalPaid,
        totalPrice: rents.totalPrice,
        status: rents.status,
        isOpenContract: rents.isOpenContract,
        carId: rents.carId,
        customerId: rents.customerId,
        deposit: rents.deposit,
        guarantee: rents.guarantee,
        lateFee: rents.lateFee,
        isFullyPaid: rents.isFullyPaid,
        damageReport: rents.damageReport,
        // ✅ Car fields - CRITICAL!
        pricePerDay: cars.pricePerDay,
      })
      .from(rents)
      .leftJoin(cars, eq(rents.carId, cars.id)) // ✅ JOIN cars table
      .where(
        and(
          eq(rents.orgId, orgId),
          sql`${rents.isDeleted} = false`,
          sql`${rents.startDate} <= ${range.to}`,
          sql`(
        (${rents.returnedAt} IS NOT NULL AND ${rents.returnedAt} >= ${range.from})
        OR
        (${rents.returnedAt} IS NULL AND ${rents.expectedEndDate} IS NOT NULL AND ${rents.expectedEndDate} >= ${range.from})
        OR
        (${rents.returnedAt} IS NULL AND ${rents.expectedEndDate} IS NULL AND ${rents.startDate} <= ${range.to})
      )`,
          ...(carId ? [eq(rents.carId, carId)] : []),
        ),
      );
    console.log('=== RENTAL QUERY DEBUG ===');
    console.log('Date range:', { from: range.from, to: range.to });
    console.log('Rentals found:', rows.length);
    console.log('Rental details:');
    console.log('Rental details:');
    rows.forEach((rent, i) => {
      console.log(`Rent ${i}:`, {
        id: rent.id,
        startDate: rent.startDate,
        returnedAt: rent.returnedAt,
        expectedEndDate: rent.expectedEndDate,
        totalPaid: rent.totalPaid,
        totalPrice: rent.totalPrice,
        status: rent.status,
        isOpenContract: rent.isOpenContract,
        pricePerDay: rent.pricePerDay, // ✅ Now this will exist
      });
    });
    console.log('========================');
    // Fleet size
    const [{ count: fleetCount }] = await this.db.db
      .select({ count: sql<number>`count(*)` })
      .from(cars)
      .where(and(eq(cars.orgId, orgId), sql`${cars.status} != 'deleted'`));

    const now = new Date();

    // ✅ Revenue (final + provisional)
    const { revenueBilled, revenueCollected, openAR } =
      RevenueMetrics.calculate(rows);
    // Calculate net profit (after calculating revenueCollected)
    const netProfit = revenueCollected - maintenance.totalMaintenanceCost;
    // Rental days (for ADR + Utilization)
    // const periodDays = Math.max(
    //   1,
    //   Math.floor((range.to.getTime() - range.from.getTime()) / 86400000),
    // );
    const periodDays = inclusiveDays(range.from, range.to);
    // const rentedDays = rows.reduce((days, r) => {
    //   const start = r.startDate < range.from ? range.from : r.startDate;
    //   const end = r.returnedAt || r.expectedEndDate || range.to;
    //   const clippedEnd = end > range.to ? range.to : end;
    //   return (
    //     days +
    //     Math.max(
    //       0,
    //       Math.floor((clippedEnd.getTime() - start.getTime()) / 86400000),
    //     )
    //   );
    // }, 0);
    // rentedDays and totalRents using inclusive overlap and clipping
    let rentedDays = 0;
    let totalRents = 0;

    for (const r of rows) {
      // choose the end date for the rental
      const rawEnd = r.returnedAt ?? r.expectedEndDate ?? range.to;
      const days = overlapDaysInclusive(
        r.startDate,
        rawEnd,
        range.from,
        range.to,
      );
      if (days > 0) {
        rentedDays += days;
        totalRents += 1;
      }
    }
    const availableCarDays = Number(fleetCount) * periodDays;
    if (availableCarDays > 0) {
      rentedDays = Math.min(rentedDays, availableCarDays);
    }
    // ADR and RevPAR from exact days
    const adr = rentedDays > 0 ? revenueBilled / rentedDays : 0;

    const revPar = availableCarDays > 0 ? revenueBilled / availableCarDays : 0;
    // Utilization
    const utilization =
      availableCarDays > 0 ? rentedDays / availableCarDays : 0;
    // Trends (current + previous)
    const trends = this.calculateTrends(
      rows,
      range.from,
      range.to,
      range.interval,
    );

    const diff = range.to.getTime() - range.from.getTime();
    const prevFrom = new Date(range.from.getTime() - diff);
    const prevTo = new Date(range.from.getTime() - 1);

    const prevRows = await this.db.db
      .select({
        // Same fields as above
        id: rents.id,
        startDate: rents.startDate,
        returnedAt: rents.returnedAt,
        expectedEndDate: rents.expectedEndDate,
        totalPaid: rents.totalPaid,
        totalPrice: rents.totalPrice,
        status: rents.status,
        isOpenContract: rents.isOpenContract,
        pricePerDay: cars.pricePerDay, // ✅ Include this
      })
      .from(rents)
      .leftJoin(cars, eq(rents.carId, cars.id)) // ✅ Join cars table
      .where(
        and(
          eq(rents.orgId, orgId),
          sql`${rents.isDeleted} = false`,
          sql`${rents.startDate} <= ${prevTo}`,
          sql`(
        (${rents.returnedAt} IS NOT NULL AND ${rents.returnedAt} >= ${prevFrom})
        OR
        (${rents.returnedAt} IS NULL AND ${rents.expectedEndDate} IS NOT NULL AND ${rents.expectedEndDate} >= ${prevFrom})
      )`,
          ...(carId ? [eq(rents.carId, carId)] : []),
        ),
      );
    const prevTrends = this.calculateTrends(
      prevRows,
      prevFrom,
      prevTo,
      range.interval,
    );

    return {
      filters: {
        orgId,
        from: range.from,
        to: range.to,
        interval: range.interval,
        carId: carId ?? null,
      },
      snapshot: {
        revenueBilled,
        revenueCollected,
        openAR,
        totalRents,
        fleetSize: Number(fleetCount),
        periodDays, // exact inclusive
        rentedDays, // exact inclusive
        adr, // exact = revenueBilled / rentedDays
        revPar, // exact = revenueBilled / (fleetSize*periodDays)
        utilization, // fraction 0..1 (or multiply by 100 if you prefer percent)
        totalMaintenanceCost: maintenance.totalMaintenanceCost, // ✅ New
        netProfit, // ✅ New
      },
      trends,
      prevTrends,
      topCars: await TopCarsMetrics.calculate(
        this.db.db,
        orgId,
        range.from,
        range.to,
      ),
      overdue: OverdueMetrics.calculate(rows, now),
      insurance: await InsuranceMetrics.calculate(this.db.db, orgId, carId),
      technicalVisit, // ✅ New
      maintenance, // ✅ New
      targets: await TargetsMetrics.calculate(
        this.db.db,
        orgId,
        range.from,
        range.to,
      ),
    };
  }

  /**
   * Trends calculation (same as before, but can be extended to split provisional vs final if needed)
   */
  private calculateTrends(
    rows: {
      startDate: Date;
      returnedAt: Date | null;
      expectedEndDate: Date | null;
      totalPaid: number | null;
      totalPrice: number | null;
      status: string;
    }[],
    from: Date,
    to: Date,
    interval: 'day' | 'week' | 'month',
  ) {
    // ... keep your existing trends logic here
    // (we can later extend it to split provisional vs final revenue if you want)
    return TrendsMetrics.calculate(rows, from, to, interval);
  }
}
