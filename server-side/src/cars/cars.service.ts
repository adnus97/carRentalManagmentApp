import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { cars, DatabaseService, organization } from 'src/db';
import { eq, ne, and, sql, lte } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { CreateCarDto } from './dto/create-car.dto';
import { rents } from 'src/db/schema/rents';
import { carMonthlyTargets } from 'src/db/schema/carMonthlyTargets';
import { customers } from 'src/db/schema/customers';
import { maintenanceLogs } from 'src/db/schema/maintenanceLogs';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { CreateMonthlyTargetDto } from './dto/create-monthly-target.dto';
import { NotificationsService } from 'src/notifications/notifications.service';

@Injectable()
export class CarsService {
  constructor(
    private readonly dbService: DatabaseService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /** Helper to ensure JSON-safe responses */
  private safeReturn<T>(data: T): T {
    return JSON.parse(JSON.stringify(data));
  }

  /** Centralized DB error handler */
  private handleDbError(error: any): never {
    if (
      error.constraint === 'cars_plate_number_unique' ||
      error.message.includes('plate_number')
    ) {
      throw new BadRequestException(
        'This plate number is already registered to another car. Please use a different plate number.',
      );
    }
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
      AND ${rents.status} IN ('active', 'reserved')
      AND ${rents.startDate} <= NOW()
      AND (
        -- For open contracts, check if still active
        (${rents.isOpenContract} = true AND ${rents.status} = 'active')
        OR 
        -- For closed contracts, check return/end dates
        (${rents.isOpenContract} = false AND (
          COALESCE(${rents.returnedAt}, ${rents.expectedEndDate}) > NOW()
        ))
      )
  )
`;
  /** SQL for next available date */
  private nextAvailableDateSQL = sql<Date | null>`
  (
    SELECT MIN(
      CASE 
        WHEN ${rents.isOpenContract} = true THEN 
          CASE 
            WHEN ${rents.returnedAt} IS NOT NULL AND ${rents.returnedAt} != '9999-12-31'::timestamp 
            THEN ${rents.returnedAt}
            ELSE NULL  -- Open contract with no return date = indefinite
          END
        ELSE COALESCE(${rents.returnedAt}, ${rents.expectedEndDate})
      END
    )
    FROM ${rents}
    WHERE ${rents.carId} = ${cars.id}
      AND ${rents.isDeleted} = false
      AND ${rents.status} IN ('active', 'reserved')
      AND ${rents.startDate} <= NOW()
      AND (
        -- For open contracts that have been returned
        (${rents.isOpenContract} = true AND ${rents.returnedAt} IS NOT NULL AND ${rents.returnedAt} != '9999-12-31'::timestamp AND ${rents.returnedAt} > NOW())
        OR
        -- For closed contracts
        (${rents.isOpenContract} = false AND COALESCE(${rents.returnedAt}, ${rents.expectedEndDate}) > NOW())
      )
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
  private async getOrgOwner(orgId: string) {
    const [org] = await this.dbService.db
      .select({ userId: organization.userId })
      .from(organization)
      .where(eq(organization.id, orgId));

    return org;
  }

  private async isPlateNumberUnique(
    plateNumber: string,
    excludeCarId?: string,
  ): Promise<boolean> {
    try {
      const conditions = [eq(cars.plateNumber, plateNumber)];

      if (excludeCarId) {
        conditions.push(ne(cars.id, excludeCarId));
      }

      const existingCar = await this.dbService.db
        .select({ id: cars.id })
        .from(cars)
        .where(and(...conditions))
        .limit(1);

      return existingCar.length === 0;
    } catch (error) {
      return false;
    }
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
          plateNumber: cars.plateNumber, // ✅ Add this
          color: cars.color, // ✅ Add this
          fuelType: cars.fuelType, // ✅ Add this
          orgId: cars.orgId,
          mileage: cars.mileage,
          monthlyLeasePrice: cars.monthlyLeasePrice,
          insuranceExpiryDate: cars.insuranceExpiryDate,
          technicalVisiteExpiryDate: cars.technicalVisiteExpiryDate,
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
          technicalVisiteExpiryDate: cars.technicalVisiteExpiryDate,
          plateNumber: cars.plateNumber, // ✅ Add this
          color: cars.color, // ✅ Add this
          fuelType: cars.fuelType, // ✅ Add this
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
  async findCarsByOrgId(
    userOrg: string,
    userId: string,
    page = 1,
    pageSize = 20,
  ) {
    try {
      if (!userId) throw new BadRequestException('User ID is required');

      const offset = (page - 1) * pageSize;

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
          technicalVisiteExpiryDate: cars.technicalVisiteExpiryDate,
          plateNumber: cars.plateNumber, // ✅ Add this
          color: cars.color, // ✅ Add this
          fuelType: cars.fuelType, // ✅ Add this
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
      console.log('errrrrrrrrrrrrrrrrrrror', error);
      this.handleDbError(error);
    }
  }

  /** Create a car */
  async createCar(createCarDto: CreateCarDto, userId: string) {
    try {
      if (!userId)
        throw new BadRequestException('User authentication required');

      createCarDto = this.normalizeDates(createCarDto);

      // ✅ Validate plate number uniqueness
      if (createCarDto.plateNumber) {
        const isUnique = await this.isPlateNumberUnique(
          createCarDto.plateNumber,
        );
        if (!isUnique) {
          throw new BadRequestException(
            `A car with plate number "${createCarDto.plateNumber}" already exists. Please use a different plate number.`,
          );
        }
      }

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
        status: createCarDto.status || 'active',
      };

      await this.dbService.db.insert(cars).values(carData);

      // 🔔 Add notification
      await this.notificationsService.createNotification({
        userId,
        orgId,
        category: 'CAR',
        type: 'CAR_AVAILABLE',
        priority: 'LOW',
        title: 'New Car Added',
        message: `${carData.make} ${carData.model} (${carData.plateNumber}) has been added to your fleet`,
        actionUrl: `/cars/${id}`,
        actionLabel: 'View Car',
        metadata: {
          carId: id,
          make: carData.make,
          model: carData.model,
          plateNumber: carData.plateNumber,
        },
      });
      // ✅ Check for technical visit expiry and notify
      const now = new Date();
      const technicalVisiteExpiry = new Date(carData.technicalVisiteExpiryDate);
      const daysUntilTechnicalVisiteExpiry = Math.ceil(
        (technicalVisiteExpiry.getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24),
      );

      if (daysUntilTechnicalVisiteExpiry <= 30) {
        await this.notificationsService.createNotification({
          userId,
          orgId,
          category: 'MAINTENANCE',
          type: 'CAR_MAINTENANCE_DUE',
          priority: daysUntilTechnicalVisiteExpiry <= 7 ? 'HIGH' : 'MEDIUM',
          title: 'Technical Visit Due Soon',
          message: `${carData.make} ${carData.model} technical visit expires in ${daysUntilTechnicalVisiteExpiry} days`,
          actionUrl: `/cars/${id}`,
          actionLabel: 'View Car',
          metadata: {
            carId: id,
            type: 'technical_visit',
            daysRemaining: daysUntilTechnicalVisiteExpiry,
          },
        });
      }
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

      // ✅ Ensure dates are properly handled
      const processedData = { ...updateData };

      if (updateData.insuranceExpiryDate) {
        processedData.insuranceExpiryDate = new Date(
          updateData.insuranceExpiryDate,
        );
      }

      if (updateData.technicalVisiteExpiryDate) {
        processedData.technicalVisiteExpiryDate = new Date(
          updateData.technicalVisiteExpiryDate,
        );
      }

      // ✅ Validate plate number uniqueness if being updated
      if (processedData.plateNumber) {
        const isUnique = await this.isPlateNumberUnique(
          processedData.plateNumber,
          id,
        );
        if (!isUnique) {
          throw new BadRequestException(
            `A car with plate number "${processedData.plateNumber}" already exists. Please use a different plate number.`,
          );
        }
      }

      const existingCar = await this.dbService.db
        .select()
        .from(cars)
        .where(and(eq(cars.id, id), ne(cars.status, 'deleted')));

      if (!existingCar.length) {
        throw new NotFoundException('Car not found or deleted');
      }

      const finalUpdateData = {
        ...processedData,
        updatedAt: new Date(),
      };

      await this.dbService.db
        .update(cars)
        .set(finalUpdateData)
        .where(eq(cars.id, id));

      // 🔔 Add notification for status changes
      if (updateData.status && userId) {
        const car = existingCar[0];
        const orgOwner = await this.getOrgOwner(car.orgId);

        if (orgOwner) {
          await this.notificationsService.createNotification({
            userId: orgOwner.userId,
            orgId: car.orgId,
            category: 'CAR',
            type: 'CAR_AVAILABLE',
            priority: updateData.status === 'maintenance' ? 'MEDIUM' : 'LOW',
            title: 'Car Status Updated',
            message: `${car.make} ${car.model} status changed to ${updateData.status}`,
            actionUrl: `/cars/${id}`,
            actionLabel: 'View Car',
            metadata: {
              carId: id,
              oldStatus: car.status,
              newStatus: updateData.status,
            },
          });
        }
      }

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
  /** Utility: compute target KPIs */
  private enrichTarget(target: any) {
    const now = new Date();
    const end = new Date(target.endDate);
    const daysRemaining = Math.max(
      0,
      Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    );

    const revenueProgress = target.revenueGoal
      ? (target.actualRevenue / target.revenueGoal) * 100
      : 0;

    const rentProgress = target.targetRents
      ? (target.actualRents / target.targetRents) * 100
      : 0;

    return {
      ...target,
      daysRemaining,
      revenueProgress,
      rentProgress,
      isExpired: end < now,
    };
  }
  /** Get car details */
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

      // ✅ Rental history
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

      // ✅ Maintenance logs
      const maintenanceLogsData = await this.dbService.db
        .select()
        .from(maintenanceLogs)
        .where(eq(maintenanceLogs.carId, carId))
        .orderBy(sql`${maintenanceLogs.createdAt} DESC`)
        .limit(10);

      // ✅ Targets (fixed to only count this car’s rents)
      const targetsData = await this.dbService.db
        .select({
          id: carMonthlyTargets.id,
          startDate: carMonthlyTargets.startDate,
          endDate: carMonthlyTargets.endDate,
          targetRents: carMonthlyTargets.targetRents,
          revenueGoal: carMonthlyTargets.revenueGoal,
          createdAt: carMonthlyTargets.createdAt,
          actualRents: sql<number>`(
          SELECT COUNT(*) FROM ${rents} 
          WHERE ${rents.carId} = ${carId} -- ✅ filter by this car
          AND ${rents.startDate} >= ${carMonthlyTargets.startDate}
          AND ${rents.startDate} <= ${carMonthlyTargets.endDate}
          AND ${rents.isDeleted} = false
          AND ${rents.status} != 'canceled'
        )`,
          actualRevenue: sql<number>`(
          SELECT COALESCE(SUM(${rents.totalPaid}), 0) FROM ${rents}
          WHERE ${rents.carId} = ${carId} -- ✅ filter by this car
          AND ${rents.startDate} >= ${carMonthlyTargets.startDate}
          AND ${rents.startDate} <= ${carMonthlyTargets.endDate}
          AND ${rents.isDeleted} = false
          AND ${rents.status} != 'canceled'
        )`,
        })
        .from(carMonthlyTargets)
        .where(eq(carMonthlyTargets.carId, carId))
        .orderBy(sql`${carMonthlyTargets.startDate} DESC`)
        .limit(5);

      // ✅ Enrich targets with KPIs
      const enrichedTargets = targetsData.map((t) => this.enrichTarget(t));

      // ✅ Financial stats (still for the whole car, not per target)
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

        targets: enrichedTargets, // ✅ now correct per car
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

      // ✅ Check if there is already an active target
      const now = new Date();
      const [activeTarget] = await this.dbService.db
        .select()
        .from(carMonthlyTargets)
        .where(
          and(
            eq(carMonthlyTargets.carId, carId),
            sql`${carMonthlyTargets.startDate} <= ${now}`,
            sql`${carMonthlyTargets.endDate} >= ${now}`,
          ),
        )
        .limit(1);

      if (activeTarget) {
        throw new BadRequestException(
          'This car already has an active target. Please wait until it ends.',
        );
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
      // 🔔 Add notification
      const orgOwner = await this.getOrgOwner(orgId);
      if (orgOwner) {
        await this.notificationsService.createNotification({
          userId: orgOwner.userId,
          orgId,
          category: 'FINANCIAL',
          type: 'REVENUE_TARGET_MET',
          priority: 'LOW',
          title: 'New Target Set',
          message: `Monthly target created for ${car.make} ${car.model}: ${targetDto.targetRents} rentals, ${targetDto.revenueGoal}MAD revenue`,
          actionUrl: `/cars/${carId}`,
          actionLabel: 'View Car',
          metadata: {
            carId,
            targetId,
            targetRents: targetDto.targetRents,
            revenueGoal: targetDto.revenueGoal,
          },
        });
      }
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

  async getCarTargets(carId: string, page = 1, pageSize = 10, userId?: string) {
    const offset = (page - 1) * pageSize;

    const [{ count }] = await this.dbService.db
      .select({ count: sql<number>`count(*)` })
      .from(carMonthlyTargets)
      .where(eq(carMonthlyTargets.carId, carId));

    const targets = await this.dbService.db
      .select({
        id: carMonthlyTargets.id,
        startDate: carMonthlyTargets.startDate,
        endDate: carMonthlyTargets.endDate,
        targetRents: carMonthlyTargets.targetRents,
        revenueGoal: carMonthlyTargets.revenueGoal,
        createdAt: carMonthlyTargets.createdAt,

        // Overlapping rents count (correlated subquery)
        actualRents: sql<number>`
      (
        SELECT COUNT(*)
        FROM ${rents} r
        WHERE r.car_id = ${carId}
          AND r.is_deleted = false
          AND r.status <> 'canceled'
          AND r.start_date <= ${carMonthlyTargets.endDate}
          AND COALESCE(r.returned_at, r.expected_end_date, r.start_date) >= ${carMonthlyTargets.startDate}
      )
    `,

        // Prorated revenue (correlated subquery)
        actualRevenue: sql<number>`
      (
        SELECT COALESCE(
          SUM(
            CASE
              WHEN r.total_paid > 0 THEN
                r.total_paid::numeric *
                (
                  GREATEST(
                    0::numeric,
                    LEAST(
                      EXTRACT(EPOCH FROM ${carMonthlyTargets.endDate}) / 86400.0,
                      EXTRACT(EPOCH FROM COALESCE(r.returned_at, r.expected_end_date, r.start_date)) / 86400.0
                    )
                    -
                    GREATEST(
                      EXTRACT(EPOCH FROM ${carMonthlyTargets.startDate}) / 86400.0,
                      EXTRACT(EPOCH FROM r.start_date) / 86400.0
                    )
                    + 1
                  )
                  /
                  GREATEST(
                    1::numeric,
                    EXTRACT(EPOCH FROM COALESCE(r.returned_at, r.expected_end_date, r.start_date)) / 86400.0
                    - EXTRACT(EPOCH FROM r.start_date) / 86400.0
                    + 1
                  )
                )
              ELSE 0
            END
          ),
          0
        )::numeric(12,2)
        FROM ${rents} r
        WHERE r.car_id = ${carId}
          AND r.is_deleted = false
          AND r.status <> 'canceled'
          AND r.start_date <= ${carMonthlyTargets.endDate}
          AND COALESCE(r.returned_at, r.expected_end_date, r.start_date) >= ${carMonthlyTargets.startDate}
      )
    `,
      })
      .from(carMonthlyTargets)
      .where(eq(carMonthlyTargets.carId, carId))
      .orderBy(sql`${carMonthlyTargets.startDate} DESC`)
      .offset(offset)
      .limit(pageSize);

    const enrichedTargets = targets.map((t) =>
      this.enrichTarget({
        ...t,
        actualRevenue: Number((t as any).actualRevenue ?? 0),
        actualRents: Number((t as any).actualRents ?? 0),
      }),
    );

    return {
      data: enrichedTargets,
      page,
      pageSize,
      total: Number(count),
      totalPages: Math.ceil(Number(count) / pageSize),
    };
  }
  // ✅ Paginated Maintenance Logs
  async getCarMaintenanceLogs(carId: string, page = 1, pageSize = 10) {
    const offset = (page - 1) * pageSize;

    const [{ count }] = await this.dbService.db
      .select({ count: sql<number>`count(*)` })
      .from(maintenanceLogs)
      .where(eq(maintenanceLogs.carId, carId));

    const logs = await this.dbService.db
      .select()
      .from(maintenanceLogs)
      .where(eq(maintenanceLogs.carId, carId))
      .orderBy(sql`${maintenanceLogs.createdAt} DESC`)
      .offset(offset)
      .limit(pageSize);

    return {
      data: logs,
      page,
      pageSize,
      total: Number(count),
      totalPages: Math.ceil(Number(count) / pageSize),
    };
  }

  // ✅ Paginated Rentals
  async getCarRentals(carId: string, page = 1, pageSize = 10) {
    const offset = (page - 1) * pageSize;

    const [{ count }] = await this.dbService.db
      .select({ count: sql<number>`count(*)` })
      .from(rents)
      .where(and(eq(rents.carId, carId), eq(rents.isDeleted, false)));

    const rentalHistory = await this.dbService.db
      .select({
        id: rents.id,
        startDate: rents.startDate,
        endDate: rents.expectedEndDate,
        returnedAt: rents.returnedAt,
        totalPrice: rents.totalPrice,
        totalPaid: rents.totalPaid,
        status: rents.status,
        isOpenContract: rents.isOpenContract,
      })
      .from(rents)
      .where(and(eq(rents.carId, carId), eq(rents.isDeleted, false)))
      .orderBy(sql`${rents.startDate} DESC`)
      .offset(offset)
      .limit(pageSize);

    return {
      data: rentalHistory,
      page,
      pageSize,
      total: Number(count),
      totalPages: Math.ceil(Number(count) / pageSize),
    };
  }
  // cars.service.ts
  async addMaintenanceLog(
    carId: string,
    dto: CreateMaintenanceDto,
    userId?: string,
  ) {
    try {
      // Ensure car exists
      const car = await this.findOne(carId);
      if (!car) throw new NotFoundException('Car not found');

      const id = createId();
      const orgId = car.orgId;

      await this.dbService.db.insert(maintenanceLogs).values({
        id,
        carId,
        orgId,
        ...dto,
      });

      // 🔔 Add notification
      const orgOwner = await this.getOrgOwner(orgId);
      if (orgOwner) {
        await this.notificationsService.createNotification({
          userId: orgOwner.userId,
          orgId,
          category: 'MAINTENANCE',
          type: 'CAR_MAINTENANCE_DUE',
          priority: dto.type === ('repair' as any) ? 'HIGH' : 'MEDIUM',
          title: 'Maintenance Log Added',
          message: `Maintenance recorded for ${car.make} ${car.model}: ${dto.description}`,
          actionUrl: `/cars/${carId}`,
          actionLabel: 'View Car',
          metadata: { carId, maintenanceId: id, maintenanceType: dto.type },
        });
      }
      return this.safeReturn({
        success: true,
        message: 'Maintenance log added successfully',
        data: { id, carId, ...dto },
      });
    } catch (error) {
      this.handleDbError(error);
    }
  }
  async checkCarInsuranceStatus(carId: string, userId?: string) {
    try {
      const car = await this.findOne(carId);
      if (!car) throw new NotFoundException('Car not found');

      const now = new Date();
      const insuranceDate = new Date(car.insuranceExpiryDate);
      const daysUntilExpiry = Math.ceil(
        (insuranceDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      let status: 'valid' | 'expiring_soon' | 'expiring_very_soon' | 'expired';
      let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
      let message: string;

      if (daysUntilExpiry < 0) {
        status = 'expired';
        priority = 'URGENT';
        message = `Insurance expired ${Math.abs(daysUntilExpiry)} days ago`;
      } else if (daysUntilExpiry <= 3) {
        status = 'expiring_very_soon';
        priority = 'URGENT';
        message = `Insurance expires in ${daysUntilExpiry} days`;
      } else if (daysUntilExpiry <= 7) {
        status = 'expiring_soon';
        priority = 'HIGH';
        message = `Insurance expires in ${daysUntilExpiry} days`;
      } else if (daysUntilExpiry <= 30) {
        status = 'expiring_soon';
        priority = 'MEDIUM';
        message = `Insurance expires in ${daysUntilExpiry} days`;
      } else {
        status = 'valid';
        priority = 'LOW';
        message = `Insurance valid for ${daysUntilExpiry} days`;
      }

      return this.safeReturn({
        carId,
        status,
        priority,
        message,
        daysUntilExpiry,
        insuranceExpiryDate: insuranceDate,
        isExpired: daysUntilExpiry < 0,
        needsAttention: daysUntilExpiry <= 30,
      });
    } catch (error) {
      this.handleDbError(error);
    }
  }

  /** Get all cars with insurance issues */
  async getCarsWithInsuranceIssues(userId: string) {
    try {
      const userOrg = await this.dbService.db
        .select({ id: organization.id })
        .from(organization)
        .where(eq(organization.userId, userId));

      if (!userOrg.length) {
        throw new BadRequestException('No organization found for this user.');
      }

      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const carsWithIssues = await this.dbService.db
        .select({
          id: cars.id,
          make: cars.make,
          model: cars.model,
          year: cars.year,
          insuranceExpiryDate: cars.insuranceExpiryDate,
          status: cars.status,
          pricePerDay: cars.pricePerDay,
        })
        .from(cars)
        .where(
          and(
            eq(cars.orgId, userOrg[0].id),
            lte(cars.insuranceExpiryDate, thirtyDaysFromNow),
            eq(cars.status, 'active'),
          ),
        )
        .orderBy(cars.insuranceExpiryDate);

      const enrichedCars = carsWithIssues.map((car) => {
        const daysUntilExpiry = Math.ceil(
          (car.insuranceExpiryDate.getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24),
        );

        let urgency: 'expired' | 'critical' | 'warning' | 'info';
        if (daysUntilExpiry < 0) urgency = 'expired';
        else if (daysUntilExpiry <= 3) urgency = 'critical';
        else if (daysUntilExpiry <= 7) urgency = 'warning';
        else urgency = 'info';

        return {
          ...car,
          daysUntilExpiry,
          urgency,
          isExpired: daysUntilExpiry < 0,
        };
      });

      return this.safeReturn({
        cars: enrichedCars,
        summary: {
          total: enrichedCars.length,
          expired: enrichedCars.filter((c) => c.isExpired).length,
          critical: enrichedCars.filter((c) => c.urgency === 'critical').length,
          warning: enrichedCars.filter((c) => c.urgency === 'warning').length,
        },
      });
    } catch (error) {
      this.handleDbError(error);
    }
  }

  // cars.service.ts (add below other methods)

  async getActiveTargetCard(
    carId: string,
    onDate?: Date, // optional reference date; default now
  ): Promise<{
    id: string;
    startDate: Date;
    endDate: Date;
    targetRents: number;
    revenueGoal: number;
    actualRents: number;
    actualRevenue: number;
    revenueProgress: number;
    rentProgress: number;
    daysRemaining: number;
    isExpired: boolean;
  } | null> {
    const ref = onDate ? new Date(onDate) : new Date();

    // 1) Find the active target for this car on ref date
    const [t] = await this.dbService.db
      .select({
        id: carMonthlyTargets.id,
        startDate: carMonthlyTargets.startDate,
        endDate: carMonthlyTargets.endDate,
        targetRents: carMonthlyTargets.targetRents,
        revenueGoal: carMonthlyTargets.revenueGoal,
        orgId: carMonthlyTargets.orgId,
        carId: carMonthlyTargets.carId,
      })
      .from(carMonthlyTargets)
      .where(
        and(
          eq(carMonthlyTargets.carId, carId),
          sql`${carMonthlyTargets.startDate} <= ${ref}`,
          sql`${carMonthlyTargets.endDate} >= ${ref}`,
        ),
      )
      .limit(1);

    if (!t) return null;

    // 2) Compute actuals with the SAME logic as TargetsMetrics
    const [actuals] = await this.dbService.db
      .select({
        revenue: sql<number>`
        COALESCE(
          SUM(
            CASE 
              WHEN ${rents.totalPaid} > 0 THEN
                ${rents.totalPaid} * (
                  GREATEST(0, 
                    LEAST(
                      EXTRACT(epoch FROM ${t.endDate}::timestamp) / 86400.0,
                      EXTRACT(epoch FROM COALESCE(${rents.returnedAt}, ${rents.expectedEndDate})::timestamp) / 86400.0
                    ) - 
                    GREATEST(
                      EXTRACT(epoch FROM ${t.startDate}::timestamp) / 86400.0,
                      EXTRACT(epoch FROM ${rents.startDate}) / 86400.0
                    ) + 1
                  ) / 
                  GREATEST(1,
                    EXTRACT(epoch FROM COALESCE(${rents.returnedAt}, ${rents.expectedEndDate})::timestamp) / 86400.0 - 
                    EXTRACT(epoch FROM ${rents.startDate}) / 86400.0 + 1
                  )
                )
              ELSE 0
            END
          ), 
          0
        )
      `,
        rentsCount: sql<number>`COUNT(*)`,
      })
      .from(rents)
      .where(
        and(
          eq(rents.orgId, t.orgId),
          eq(rents.carId, t.carId),
          sql`${rents.isDeleted} = false`,
          // overlap with target
          sql`${rents.startDate} <= ${t.endDate}`,
          sql`(
          ${rents.returnedAt} >= ${t.startDate} 
          OR ${rents.expectedEndDate} >= ${t.startDate} 
          OR ${rents.status} IN ('active', 'reserved') 
          OR ${rents.isOpenContract} = true
        )`,
        ),
      );

    // 3) Derive card KPIs
    const now = ref;
    const end = new Date(t.endDate);
    const daysRemaining = Math.max(
      0,
      Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    );

    const actualRevenue = Math.round(actuals?.revenue ?? 0);
    const actualRents = actuals?.rentsCount ?? 0;

    const revenueProgress =
      t.revenueGoal > 0 ? (actualRevenue / t.revenueGoal) * 100 : 0;
    const rentProgress =
      t.targetRents > 0 ? (actualRents / t.targetRents) * 100 : 0;

    return {
      id: t.id,
      startDate: t.startDate,
      endDate: t.endDate,
      targetRents: t.targetRents,
      revenueGoal: t.revenueGoal,
      actualRents,
      actualRevenue,
      revenueProgress,
      rentProgress,
      daysRemaining,
      isExpired: end < now,
    };
  }

  async checkCarTechnicalVisiteStatus(carId: string, userId?: string) {
    try {
      const car = await this.findOne(carId);
      if (!car) throw new NotFoundException('Car not found');

      const now = new Date();
      const technicalVisiteDate = new Date(car.technicalVisiteExpiryDate);
      const daysUntilExpiry = Math.ceil(
        (technicalVisiteDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      let status: 'valid' | 'expiring_soon' | 'expiring_very_soon' | 'expired';
      let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
      let message: string;

      if (daysUntilExpiry < 0) {
        status = 'expired';
        priority = 'URGENT';
        message = `Technical visit expired ${Math.abs(daysUntilExpiry)} days ago`;
      } else if (daysUntilExpiry <= 3) {
        status = 'expiring_very_soon';
        priority = 'URGENT';
        message = `Technical visit expires in ${daysUntilExpiry} days`;
      } else if (daysUntilExpiry <= 7) {
        status = 'expiring_soon';
        priority = 'HIGH';
        message = `Technical visit expires in ${daysUntilExpiry} days`;
      } else if (daysUntilExpiry <= 30) {
        status = 'expiring_soon';
        priority = 'MEDIUM';
        message = `Technical visit expires in ${daysUntilExpiry} days`;
      } else {
        status = 'valid';
        priority = 'LOW';
        message = `Technical visit valid for ${daysUntilExpiry} days`;
      }

      return this.safeReturn({
        carId,
        status,
        priority,
        message,
        daysUntilExpiry,
        technicalVisiteExpiryDate: technicalVisiteDate,
        isExpired: daysUntilExpiry < 0,
        needsAttention: daysUntilExpiry <= 30,
      });
    } catch (error) {
      this.handleDbError(error);
    }
  }
  /** Get all cars with technical visit issues */
  async getCarsWithTechnicalVisiteIssues(userId: string) {
    try {
      const userOrg = await this.dbService.db
        .select({ id: organization.id })
        .from(organization)
        .where(eq(organization.userId, userId));

      if (!userOrg.length) {
        throw new BadRequestException('No organization found for this user.');
      }

      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const carsWithIssues = await this.dbService.db
        .select({
          id: cars.id,
          make: cars.make,
          model: cars.model,
          year: cars.year,
          technicalVisiteExpiryDate: cars.technicalVisiteExpiryDate,
          status: cars.status,
          pricePerDay: cars.pricePerDay,
        })
        .from(cars)
        .where(
          and(
            eq(cars.orgId, userOrg[0].id),
            lte(cars.technicalVisiteExpiryDate, thirtyDaysFromNow),
            eq(cars.status, 'active'),
          ),
        )
        .orderBy(cars.technicalVisiteExpiryDate);

      const enrichedCars = carsWithIssues.map((car) => {
        const daysUntilExpiry = Math.ceil(
          (car.technicalVisiteExpiryDate.getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24),
        );

        let urgency: 'expired' | 'critical' | 'warning' | 'info';
        if (daysUntilExpiry < 0) urgency = 'expired';
        else if (daysUntilExpiry <= 3) urgency = 'critical';
        else if (daysUntilExpiry <= 7) urgency = 'warning';
        else urgency = 'info';

        return {
          ...car,
          daysUntilExpiry,
          urgency,
          isExpired: daysUntilExpiry < 0,
        };
      });

      return this.safeReturn({
        cars: enrichedCars,
        summary: {
          total: enrichedCars.length,
          expired: enrichedCars.filter((c) => c.isExpired).length,
          critical: enrichedCars.filter((c) => c.urgency === 'critical').length,
          warning: enrichedCars.filter((c) => c.urgency === 'warning').length,
        },
      });
    } catch (error) {
      this.handleDbError(error);
    }
  }
}
