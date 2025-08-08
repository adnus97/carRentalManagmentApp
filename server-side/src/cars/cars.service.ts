import { Injectable } from '@nestjs/common';
import { cars, DatabaseService, organization } from 'src/db';
import { eq, ne, and, sql } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { CreateCarDto } from './dto/create-car.dto';
import { rents } from 'src/db/schema/rents';

@Injectable()
export class CarsService {
  constructor(private readonly dbService: DatabaseService) {}

  /**
   * Get all cars with dynamic availability and next available date
   */
  async findAll(page = 1, pageSize = 20) {
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
        isAvailable: sql<boolean>`
          NOT EXISTS (
            SELECT 1 FROM ${rents}
            WHERE ${rents.carId} = ${cars.id}
              AND ${rents.isDeleted} = false
              AND ${rents.status} = 'active'
              AND ${rents.returnedAt} > NOW()
              AND ${rents.startDate} <= NOW()
              AND ${rents.returnedAt} >= NOW()
          )
        `.as('isAvailable'),
        nextAvailableDate: sql<Date | null>`
          (
            SELECT MIN(${rents.returnedAt})
            FROM ${rents}
            WHERE ${rents.carId} = ${cars.id}
              AND ${rents.isDeleted} = false
              AND ${rents.status} = 'active'
              AND ${rents.returnedAt} > NOW()
          )
        `.as('nextAvailableDate'),
      })
      .from(cars)
      .where(ne(cars.status, 'deleted'))
      .orderBy(sql`${cars.createdAt} DESC`)
      .offset(offset)
      .limit(pageSize);

    return {
      data,
      page,
      pageSize,
      total: Number(count),
      totalPages: Math.ceil(Number(count) / pageSize),
    };
  }

  /**
   * Get a single car with dynamic availability and next available date
   */
  async findOne(id: string) {
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
        isAvailable: sql<boolean>`
          NOT EXISTS (
            SELECT 1 FROM ${rents}
            WHERE ${rents.carId} = ${cars.id}
              AND ${rents.isDeleted} = false
              AND ${rents.status} = 'active'
              AND ${rents.returnedAt} > NOW()
              AND ${rents.startDate} <= NOW()
              AND ${rents.returnedAt} >= NOW()
          )
        `.as('isAvailable'),
        nextAvailableDate: sql<Date | null>`
          (
            SELECT MIN(${rents.returnedAt})
            FROM ${rents}
            WHERE ${rents.carId} = ${cars.id}
              AND ${rents.isDeleted} = false
              AND ${rents.status} = 'active'
              AND ${rents.returnedAt} > NOW()
          )
        `.as('nextAvailableDate'),
      })
      .from(cars)
      .where(eq(cars.id, id));

    return car;
  }

  /**
   * Get cars by organization with dynamic availability and next available date
   */
  async findCarsByOrgId(userId: string, page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;

    const [{ count }] = await this.dbService.db
      .select({ count: sql<number>`count(*)` })
      .from(cars)
      .leftJoin(organization, eq(cars.orgId, organization.id))
      .where(and(eq(organization.userId, userId), ne(cars.status, 'deleted')));

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
        isAvailable: sql<boolean>`
          NOT EXISTS (
            SELECT 1 FROM ${rents}
            WHERE ${rents.carId} = ${cars.id}
              AND ${rents.isDeleted} = false
              AND ${rents.status} = 'active'
              AND ${rents.returnedAt} > NOW()
              AND ${rents.startDate} <= NOW()
              AND ${rents.returnedAt} >= NOW()
          )
        `.as('isAvailable'),
        nextAvailableDate: sql<Date | null>`
          (
            SELECT MIN(${rents.returnedAt})
            FROM ${rents}
            WHERE ${rents.carId} = ${cars.id}
              AND ${rents.isDeleted} = false
              AND ${rents.status} = 'active'
              AND ${rents.returnedAt} > NOW()
          )
        `.as('nextAvailableDate'),
      })
      .from(cars)
      .leftJoin(organization, eq(cars.orgId, organization.id))
      .where(and(eq(organization.userId, userId), ne(cars.status, 'deleted')))
      .orderBy(sql`${cars.createdAt} DESC`)
      .offset(offset)
      .limit(pageSize);

    return {
      data: rows,
      page,
      pageSize,
      total: Number(count),
      totalPages: Math.ceil(Number(count) / pageSize),
    };
  }

  async createCar(createCarDto: CreateCarDto, userId: string) {
    const id = createId();
    const currentUserOrgId = await this.dbService.db
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.userId, userId));

    if (!currentUserOrgId.length) {
      throw new Error('Organization not found for this user');
    }

    const orgId = currentUserOrgId[0].id;

    return await this.dbService.db
      .insert(cars)
      .values({ id, orgId, ...createCarDto });
  }

  async updateCar(id: string, updateData: Partial<CreateCarDto>) {
    return await this.dbService.db
      .update(cars)
      .set(updateData)
      .where(eq(cars.id, id));
  }
}
