// src/rents/rents.repository.ts
import { Inject, Injectable } from '@nestjs/common';
import { DatabaseService } from '../db';
import { rents } from '../db/schema/rents';
import { files } from '../db/schema/files';
import { cars } from '../db/schema/cars';
import { customers } from '../db/schema/customers';
import { eq, and, sql } from 'drizzle-orm';
import { RentStatus } from 'src/types/rent-status.type';

export interface CreateRentData {
  id: string;
  rentContractId: string;
  rentNumber: number;
  year: number;
  orgId: string;
  carId: string;
  customerId: string;
  startDate: Date;
  expectedEndDate?: Date;
  returnedAt?: Date;
  isOpenContract: boolean;
  totalPrice?: number;
  deposit?: number;
  guarantee?: number;
  lateFee?: number;
  totalPaid?: number;
  isFullyPaid: boolean;
  status: RentStatus;
  damageReport?: string;
  isDeleted: boolean;
  carImg1Id?: string;
  carImg2Id?: string;
  carImg3Id?: string;
  carImg4Id?: string;
}

@Injectable()
export class RentsRepository {
  constructor(
    @Inject(DatabaseService) private readonly dbService: DatabaseService, // ✅ Add @Inject()
  ) {
    console.log('🔧 RentsRepository constructor called');
    console.log('🔧 DatabaseService injected:', !!this.dbService);
    console.log('🔧 DatabaseService.db exists:', !!this.dbService?.db);
  }

  async create(data: CreateRentData) {
    const result = await this.dbService.db
      .insert(rents)
      .values(data)
      .returning();

    return result[0];
  }

  async findOneWithImages(rentId: string) {
    const result = await this.dbService.db
      .select({
        // Rent data
        id: rents.id,
        rentContractId: rents.rentContractId,
        rentNumber: rents.rentNumber,
        year: rents.year,
        orgId: rents.orgId,
        carId: rents.carId,
        customerId: rents.customerId,
        startDate: rents.startDate,
        expectedEndDate: rents.expectedEndDate,
        returnedAt: rents.returnedAt,
        isOpenContract: rents.isOpenContract,
        totalPrice: rents.totalPrice,
        deposit: rents.deposit,
        guarantee: rents.guarantee,
        lateFee: rents.lateFee,
        totalPaid: rents.totalPaid,
        isFullyPaid: rents.isFullyPaid,
        status: rents.status,
        damageReport: rents.damageReport,
        isDeleted: rents.isDeleted,
        carImg1Id: rents.carImg1Id,
        carImg2Id: rents.carImg2Id,
        carImg3Id: rents.carImg3Id,
        carImg4Id: rents.carImg4Id,
        // Car data
        carMake: cars.make,
        carModel: cars.model,
        pricePerDay: cars.pricePerDay,
        // Customer data
        customerName: sql<string>`CONCAT(${customers.firstName}, ' ', ${customers.lastName})`,
        // Image data
        img1Name: sql<string>`img1.name`,
        img1Path: sql<string>`img1.path`,
        img1Url: sql<string>`img1.url`,
        img2Name: sql<string>`img2.name`,
        img2Path: sql<string>`img2.path`,
        img2Url: sql<string>`img2.url`,
        img3Name: sql<string>`img3.name`,
        img3Path: sql<string>`img3.path`,
        img3Url: sql<string>`img3.url`,
        img4Name: sql<string>`img4.name`,
        img4Path: sql<string>`img4.path`,
        img4Url: sql<string>`img4.url`,
      })
      .from(rents)
      .leftJoin(cars, eq(rents.carId, cars.id))
      .leftJoin(customers, eq(rents.customerId, customers.id))
      .leftJoin(files.as('img1'), eq(rents.carImg1Id, sql`img1.id`))
      .leftJoin(files.as('img2'), eq(rents.carImg2Id, sql`img2.id`))
      .leftJoin(files.as('img3'), eq(rents.carImg3Id, sql`img3.id`))
      .leftJoin(files.as('img4'), eq(rents.carImg4Id, sql`img4.id`))
      .where(and(eq(rents.id, rentId), eq(rents.isDeleted, false)))
      .limit(1);

    return result[0];
  }

  async updateImages(
    rentId: string,
    imageIds: {
      carImg1Id?: string;
      carImg2Id?: string;
      carImg3Id?: string;
      carImg4Id?: string;
    },
  ) {
    const result = await this.dbService.db
      .update(rents)
      .set(imageIds)
      .where(eq(rents.id, rentId))
      .returning();

    return result[0];
  }

  async getAllWithImages(orgId: string, page = 1, pageSize = 10) {
    const offset = (page - 1) * pageSize;

    const [{ count }] = await this.dbService.db
      .select({ count: sql<number>`count(*)` })
      .from(rents)
      .where(and(eq(rents.isDeleted, false), eq(rents.orgId, orgId)));

    const rawData = await this.dbService.db
      .select({
        id: rents.id,
        rentContractId: rents.rentContractId,
        rentNumber: rents.rentNumber,
        year: rents.year,
        carId: rents.carId,
        customerId: rents.customerId,
        startDate: rents.startDate,
        expectedEndDate: rents.expectedEndDate,
        isOpenContract: rents.isOpenContract,
        returnedAt: rents.returnedAt,
        totalPrice: rents.totalPrice,
        deposit: rents.deposit,
        guarantee: rents.guarantee,
        lateFee: rents.lateFee,
        totalPaid: rents.totalPaid,
        isFullyPaid: rents.isFullyPaid,
        status: rents.status,
        damageReport: rents.damageReport,
        carModel: cars.model,
        carMake: cars.make,
        pricePerDay: cars.pricePerDay,
        customerName: sql<string>`CONCAT(${customers.firstName}, ' ', ${customers.lastName})`,
        customerEmail: customers.email,
        // Image IDs
        carImg1Id: rents.carImg1Id,
        carImg2Id: rents.carImg2Id,
        carImg3Id: rents.carImg3Id,
        carImg4Id: rents.carImg4Id,
      })
      .from(rents)
      .leftJoin(cars, eq(rents.carId, cars.id))
      .leftJoin(customers, eq(rents.customerId, customers.id))
      .where(and(eq(rents.isDeleted, false), eq(rents.orgId, orgId)))
      .orderBy(sql`${rents.startDate} DESC`)
      .offset(offset)
      .limit(pageSize);

    return {
      data: rawData,
      page,
      pageSize,
      total: Number(count),
      totalPages: Math.ceil(Number(count) / pageSize),
    };
  }
}
