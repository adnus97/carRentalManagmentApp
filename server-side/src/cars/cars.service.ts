import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { cars, DatabaseService, organization } from 'src/db';
import { eq, ne, and, sql } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { CreateCarDto } from './dto/create-car.dto';
import { rents } from 'src/db/schema/rents';
import { carOilChanges } from 'src/db/schema/car_oil_changes';
import { carMonthlyTargets } from 'src/db/schema/carMonthlyTargets';
import { customers } from 'src/db/schema/customers';
import { maintenanceLogs } from 'src/db/schema/maintenanceLogs';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { CreateMonthlyTargetDto } from './dto/create-monthly-target.dto';
import { CreateOilChangeDto } from './dto/create-oil-change.dto';

@Injectable()
export class CarsService {
  constructor(private readonly dbService: DatabaseService) {}

  /** Helper to ensure JSON-safe responses */
  private safeReturn<T>(data: T): T {
    return JSON.parse(JSON.stringify(data));
  }

  /** Centralized DB error handler */
  private handleDbError(error: any): never {
    if (error.code === '23505') {
      throw new BadRequestException(
        'A car with these details already exists in your fleet. Please check your input.',
      );
    }
    if (error.code === '23503') {
      throw new BadRequestException(
        'Invalid organization reference. Please contact support.',
      );
    }
    if (error.code === '23514') {
      throw new BadRequestException(
        'Some of the provided information is invalid. Please check your input and try again.',
      );
    }
    if (error.code === '23502') {
      throw new BadRequestException(
        'Required information is missing. Please fill in all required fields.',
      );
    }
    throw error;
  }

  /** SQL for availability */
  private isAvailableSQL = sql<boolean>`
    ${cars.status} = 'active' AND NOT EXISTS (
      SELECT 1 FROM ${rents}
      WHERE ${rents.carId} = ${cars.id}
        AND ${rents.isDeleted} = false
        AND ${rents.status} = 'active'
        AND ${rents.startDate} <= NOW()
        AND ${rents.returnedAt} > NOW()
    )
  `;

  /** SQL for next available date */
  private nextAvailableDateSQL = sql<Date | null>`
    (
      SELECT MIN(${rents.returnedAt})
      FROM ${rents}
      WHERE ${rents.carId} = ${cars.id}
        AND ${rents.isDeleted} = false
        AND ${rents.status} = 'active'
        AND ${rents.returnedAt} > NOW()
    )
  `;

  /** Convert date strings to Date objects */
  private normalizeDates<T extends Record<string, any>>(data: T): T {
    const dateFields = [
      'insuranceExpiryDate',
      'createdAt',
      'updatedAt',
      'startDate',
      'endDate',
      'changedAt',
    ];
    return Object.fromEntries(
      Object.entries(data).map(([key, value]) => {
        if (dateFields.includes(key) && typeof value === 'string') {
          return [key, new Date(value)];
        }
        return [key, value];
      }),
    ) as T;
  }

  /** Get all cars */
  async findAll(page = 1, pageSize = 20) {
    try {
      const offset = (page - 1) * pageSize;

      const [{ count }] = await this.dbService.db
        .select({ count: sql<number>`count(*)` })
        .from(cars)
        .where(ne(cars.status, 'deleted'));

      const data = await this.dbService.db
        .select({
          id: cars.id,
          make: cars.make,
          model: cars.model,
          year: cars.year,
          purchasePrice: cars.purchasePrice,
          pricePerDay: cars.pricePerDay,
          orgId: cars.orgId,
          mileage: cars.mileage,
          monthlyLeasePrice: cars.monthlyLeasePrice,
          insuranceExpiryDate: cars.insuranceExpiryDate,
          status: cars.status,
          createdAt: cars.createdAt,
          updatedAt: cars.updatedAt,
          isAvailable: this.isAvailableSQL.as('isAvailable'),
          nextAvailableDate: this.nextAvailableDateSQL.as('nextAvailableDate'),
        })
        .from(cars)
        .where(ne(cars.status, 'deleted'))
        .orderBy(sql`${cars.createdAt} DESC`)
        .offset(offset)
        .limit(pageSize);

      return this.safeReturn({
        data,
        page,
        pageSize,
        total: Number(count),
        totalPages: Math.ceil(Number(count) / pageSize),
      });
    } catch (error) {
      this.handleDbError(error);
    }
  }

  /** Get one car */
  async findOne(id: string) {
    try {
      if (!id) throw new BadRequestException('Car ID is required');

      const [car] = await this.dbService.db
        .select({
          id: cars.id,
          make: cars.make,
          model: cars.model,
          year: cars.year,
          purchasePrice: cars.purchasePrice,
          pricePerDay: cars.pricePerDay,
          orgId: cars.orgId,
          mileage: cars.mileage,
          monthlyLeasePrice: cars.monthlyLeasePrice,
          insuranceExpiryDate: cars.insuranceExpiryDate,
          status: cars.status,
          createdAt: cars.createdAt,
          updatedAt: cars.updatedAt,
          isAvailable: this.isAvailableSQL.as('isAvailable'),
          nextAvailableDate: this.nextAvailableDateSQL.as('nextAvailableDate'),
        })
        .from(cars)
        .where(and(eq(cars.id, id), ne(cars.status, 'deleted')));

      if (!car) throw new NotFoundException('Car not found');

      return this.safeReturn(car);
    } catch (error) {
      this.handleDbError(error);
    }
  }

  /** Get cars by organization */
  async findCarsByOrgId(userId: string, page = 1, pageSize = 20) {
    try {
      if (!userId) throw new BadRequestException('User ID is required');

      const offset = (page - 1) * pageSize;

      const userOrg = await this.dbService.db
        .select({ id: organization.id })
        .from(organization)
        .where(eq(organization.userId, userId));

      if (!userOrg.length) {
        throw new BadRequestException('No organization found for this user.');
      }

      const [{ count }] = await this.dbService.db
        .select({ count: sql<number>`count(*)` })
        .from(cars)
        .leftJoin(organization, eq(cars.orgId, organization.id))
        .where(
          and(eq(organization.userId, userId), ne(cars.status, 'deleted')),
        );

      const rows = await this.dbService.db
        .select({
          id: cars.id,
          make: cars.make,
          model: cars.model,
          year: cars.year,
          purchasePrice: cars.purchasePrice,
          pricePerDay: cars.pricePerDay,
          orgId: cars.orgId,
          mileage: cars.mileage,
          monthlyLeasePrice: cars.monthlyLeasePrice,
          insuranceExpiryDate: cars.insuranceExpiryDate,
          status: cars.status,
          createdAt: cars.createdAt,
          updatedAt: cars.updatedAt,
          isAvailable: this.isAvailableSQL.as('isAvailable'),
          nextAvailableDate: this.nextAvailableDateSQL.as('nextAvailableDate'),
        })
        .from(cars)
        .leftJoin(organization, eq(cars.orgId, organization.id))
        .where(and(eq(organization.userId, userId), ne(cars.status, 'deleted')))
        .orderBy(sql`${cars.createdAt} DESC`)
        .offset(offset)
        .limit(pageSize);

      return this.safeReturn({
        data: rows,
        page,
        pageSize,
        total: Number(count),
        totalPages: Math.ceil(Number(count) / pageSize),
      });
    } catch (error) {
      this.handleDbError(error);
    }
  }

  /** Create a car */
  async createCar(createCarDto: CreateCarDto, userId: string) {
    try {
      if (!userId)
        throw new BadRequestException('User authentication required');

      createCarDto = this.normalizeDates(createCarDto);

      const currentUserOrgId = await this.dbService.db
        .select({ id: organization.id })
        .from(organization)
        .where(eq(organization.userId, userId));

      if (!currentUserOrgId.length) {
        throw new BadRequestException('No organization found for this user.');
      }

      const id = createId();
      const orgId = currentUserOrgId[0].id;

      const carData = {
        id,
        orgId,
        ...createCarDto,
        status: createCarDto.status || 'available',
      };

      await this.dbService.db.insert(cars).values(carData);

      return this.safeReturn({
        success: true,
        message: 'Car added successfully',
        data: { id, ...carData },
      });
    } catch (error) {
      this.handleDbError(error);
    }
  }

  /** Update a car */
  async updateCar(
    id: string,
    updateData: Partial<CreateCarDto>,
    userId?: string,
  ) {
    try {
      if (!id) throw new BadRequestException('Car ID is required');

      updateData = this.normalizeDates(updateData);

      const existingCar = await this.dbService.db
        .select()
        .from(cars)
        .where(and(eq(cars.id, id), ne(cars.status, 'deleted')));

      if (!existingCar.length) {
        throw new NotFoundException('Car not found or deleted');
      }

      const finalUpdateData = {
        ...updateData,
        updatedAt: new Date(),
      };

      await this.dbService.db
        .update(cars)
        .set(finalUpdateData)
        .where(eq(cars.id, id));

      return this.safeReturn({
        success: true,
        message: 'Car updated successfully',
      });
    } catch (error) {
      this.handleDbError(error);
    }
  }

  /** Delete a car (soft delete) */
  async deleteCar(id: string, userId?: string) {
    try {
      if (!id) throw new BadRequestException('Car ID is required');

      const existingCar = await this.dbService.db
        .select()
        .from(cars)
        .where(and(eq(cars.id, id), ne(cars.status, 'deleted')));

      if (!existingCar.length) {
        throw new NotFoundException('Car not found or already deleted');
      }

      await this.dbService.db
        .update(cars)
        .set({
          [cars.status.name]: 'deleted',
          [cars.updatedAt.name]: new Date(),
        })
        .where(eq(cars.id, id));

      return this.safeReturn({
        success: true,
        message: 'Car deleted successfully',
      });
    } catch (error) {
      this.handleDbError(error);
    }
  }

  /** Get car details */
  async getCarDetails(carId: string, userId?: string) {
    try {
      const car = await this.findOne(carId);

      if (userId) {
        const userOrg = await this.dbService.db
          .select({ id: organization.id })
          .from(organization)
          .where(eq(organization.userId, userId));

        if (!userOrg.length || userOrg[0].id !== car.orgId) {
          throw new BadRequestException('Access denied');
        }
      }

      const rentalHistory = await this.dbService.db
        .select({
          id: rents.id,
          startDate: rents.startDate,
          expectedEndDate: rents.expectedEndDate,
          returnedAt: rents.returnedAt,
          totalPrice: rents.totalPrice,
          totalPaid: rents.totalPaid,
          status: rents.status,
          customerName: sql<string>`
            (SELECT CONCAT(${customers.firstName}, ' ', ${customers.lastName}) 
             FROM ${customers} WHERE ${customers.id} = ${rents.customerId})
          `.as('customerName'),
        })
        .from(rents)
        .where(and(eq(rents.carId, carId), eq(rents.isDeleted, false)))
        .orderBy(sql`${rents.startDate} DESC`)
        .limit(10);

      const maintenanceLogsData = await this.dbService.db
        .select()
        .from(maintenanceLogs)
        .where(eq(maintenanceLogs.carId, carId))
        .orderBy(sql`${maintenanceLogs.createdAt} DESC`)
        .limit(10);

      const oilChangesData = await this.dbService.db
        .select()
        .from(carOilChanges)
        .where(eq(carOilChanges.carId, carId))
        .orderBy(sql`${carOilChanges.changedAt} DESC`)
        .limit(5);

      const targetsData = await this.dbService.db
        .select()
        .from(carMonthlyTargets)
        .where(eq(carMonthlyTargets.carId, carId))
        .orderBy(sql`${carMonthlyTargets.startDate} DESC`)
        .limit(5);

      const financialStats = await this.dbService.db
        .select({
          totalRevenue: sql<number>`COALESCE(SUM(${rents.totalPaid}), 0)`,
          totalRents: sql<number>`COUNT(*)`,
          avgRentPrice: sql<number>`COALESCE(AVG(${rents.totalPrice}), 0)`,
        })
        .from(rents)
        .where(
          and(
            eq(rents.carId, carId),
            eq(rents.isDeleted, false),
            ne(rents.status, 'canceled'),
          ),
        );

      return this.safeReturn({
        car,
        rentalHistory,
        maintenanceLogs: maintenanceLogsData,
        oilChanges: oilChangesData,
        targets: targetsData,
        financialStats: financialStats[0],
      });
    } catch (error) {
      this.handleDbError(error);
    }
  }

  /** Create monthly target */
  async createMonthlyTarget(
    carId: string,
    targetDto: CreateMonthlyTargetDto,
    userId?: string,
  ) {
    try {
      targetDto = this.normalizeDates(targetDto);

      const car = await this.findOne(carId);
      if (userId) {
        const userOrg = await this.dbService.db
          .select({ id: organization.id })
          .from(organization)
          .where(eq(organization.userId, userId));

        if (!userOrg.length || userOrg[0].id !== car.orgId) {
          throw new BadRequestException('Access denied');
        }
      }

      const targetId = createId();
      const orgId = car.orgId;

      await this.dbService.db.insert(carMonthlyTargets).values({
        id: targetId,
        carId,
        orgId,
        startDate: new Date(targetDto.startDate),
        endDate: new Date(targetDto.endDate),
        targetRents: targetDto.targetRents,
        revenueGoal: targetDto.revenueGoal,
      });

      return this.safeReturn({
        success: true,
        message: 'Target created successfully',
        data: { id: targetId, carId, ...targetDto },
      });
    } catch (error) {
      this.handleDbError(error);
    }
  }

  /** Get car targets */
  async getCarTargets(carId: string, userId?: string) {
    try {
      const car = await this.findOne(carId);
      if (userId) {
        const userOrg = await this.dbService.db
          .select({ id: organization.id })
          .from(organization)
          .where(eq(organization.userId, userId));

        if (!userOrg.length || userOrg[0].id !== car.orgId) {
          throw new BadRequestException('Access denied');
        }
      }

      const targets = await this.dbService.db
        .select({
          id: carMonthlyTargets.id,
          startDate: carMonthlyTargets.startDate,
          endDate: carMonthlyTargets.endDate,
          targetRents: carMonthlyTargets.targetRents,
          revenueGoal: carMonthlyTargets.revenueGoal,
          createdAt: carMonthlyTargets.createdAt,
          actualRents: sql<number>`
            (SELECT COUNT(*) FROM ${rents} 
             WHERE ${rents.carId} = ${carMonthlyTargets.carId}
             AND ${rents.startDate} >= ${carMonthlyTargets.startDate}
             AND ${rents.startDate} <= ${carMonthlyTargets.endDate}
             AND ${rents.isDeleted} = false
             AND ${rents.status} != 'canceled')
          `,
          actualRevenue: sql<number>`
            (SELECT COALESCE(SUM(${rents.totalPaid}), 0) FROM ${rents}
             WHERE ${rents.carId} = ${carMonthlyTargets.carId}
             AND ${rents.startDate} >= ${carMonthlyTargets.startDate}
             AND ${rents.startDate} <= ${carMonthlyTargets.endDate}
             AND ${rents.isDeleted} = false
             AND ${rents.status} != 'canceled')
          `,
        })
        .from(carMonthlyTargets)
        .where(eq(carMonthlyTargets.carId, carId))
        .orderBy(sql`${carMonthlyTargets.startDate} DESC`);

      return this.safeReturn(targets);
    } catch (error) {
      this.handleDbError(error);
    }
  }

  /** Add maintenance log */
  async addMaintenanceLog(
    carId: string,
    dto: CreateMaintenanceDto,
    userId?: string,
  ) {
    try {
      dto = this.normalizeDates(dto);

      const car = await this.findOne(carId);
      if (userId) {
        const userOrg = await this.dbService.db
          .select({ id: organization.id })
          .from(organization)
          .where(eq(organization.userId, userId));

        if (!userOrg.length || userOrg[0].id !== car.orgId) {
          throw new BadRequestException('Access denied');
        }
      }

      const logId = createId();

      await this.dbService.db.insert(maintenanceLogs).values({
        id: logId,
        carId,
        orgId: car.orgId,
        ...dto,
      });

      return this.safeReturn({
        success: true,
        message: 'Maintenance log added successfully',
      });
    } catch (error) {
      this.handleDbError(error);
    }
  }

  /** Add oil change */
  async addOilChange(carId: string, dto: CreateOilChangeDto, userId?: string) {
    try {
      dto = this.normalizeDates(dto);

      const car = await this.findOne(carId);
      if (userId) {
        const userOrg = await this.dbService.db
          .select({ id: organization.id })
          .from(organization)
          .where(eq(organization.userId, userId));

        if (!userOrg.length || userOrg[0].id !== car.orgId) {
          throw new BadRequestException('Access denied');
        }
      }

      const oilChangeId = createId();

      await this.dbService.db.insert(carOilChanges).values({
        id: oilChangeId,
        carId,
        orgId: car.orgId,
        ...dto,
      });

      return this.safeReturn({
        success: true,
        message: 'Oil change recorded successfully',
      });
    } catch (error) {
      this.handleDbError(error);
    }
  }
}
