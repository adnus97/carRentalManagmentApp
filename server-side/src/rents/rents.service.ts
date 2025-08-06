import { Injectable } from '@nestjs/common';
import { CreateRentDto } from './dto/create-rent.dto';
import { UpdateRentDto } from './dto/update-rent.dto';
import { createId } from '@paralleldrive/cuid2';
import { cars, DatabaseService, organization } from 'src/db';
import { eq, sql, and } from 'drizzle-orm';
import { rents } from 'src/db/schema/rents';
import { customers } from 'src/db/schema/customers';

function ensureDate(value: any): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  const d = new Date(value);
  return isNaN(d.getTime()) ? undefined : d;
}
@Injectable()
export class RentsService {
  constructor(private readonly dbService: DatabaseService) {}

  async create(createRentDto: CreateRentDto, userId: string) {
    const id = createId();
    const currentUserOrgId = await this.dbService.db
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.userId, userId));

    // Check if organization exists
    if (!currentUserOrgId.length) {
      throw new Error('Organization not found for this user');
    }

    const orgId = currentUserOrgId[0].id;

    return await this.dbService.db
      .insert(rents)
      .values({ id, orgId, ...createRentDto });
  }
  async getAllRentsWithCarAndCustomer(page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;

    // Get total count for pagination
    const [{ count }] = await this.dbService.db
      .select({ count: sql<number>`count(*)` })
      .from(rents);

    // Get paginated data with joins
    const data = await this.dbService.db
      .select({
        id: rents.id,
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
      })
      .from(rents)
      .leftJoin(cars, eq(rents.carId, cars.id))
      .leftJoin(customers, eq(rents.customerId, customers.id))
      .orderBy(sql`${rents.startDate} DESC`)
      .offset(offset)
      .limit(pageSize);
    console.log('Pagination:', { page, pageSize, offset });
    return {
      data,
      page,
      pageSize,
      total: Number(count),
      totalPages: Math.ceil(Number(count) / pageSize),
    };
  }

  async findAll({ page = 1, pageSize = 20 }) {
    const offset = (page - 1) * pageSize;
    const rentsList = await this.dbService.db
      .select()
      .from(rents)
      .where(eq(rents.isDeleted, false))
      .limit(pageSize)
      .offset(offset);

    // Fetch total count for pagination UI
    const [{ count }] = await this.dbService.db
      .select({ count: sql<number>`count(*)` })
      .from(rents);

    return {
      data: rentsList,
      total: Number(count),
      page,
      pageSize,
    };
  }

  async findOne(id: string) {
    return await this.dbService.db
      .select()
      .from(rents)
      .where(and(eq(rents.id, id), eq(rents.isDeleted, false)));
  }

  async update(id: string, updateRentDto: Partial<CreateRentDto>) {
    const updateRentDtoFixed = {
      ...updateRentDto,
      ...(updateRentDto.startDate && {
        startDate: ensureDate(updateRentDto.startDate),
      }),
      ...(updateRentDto.expectedEndDate && {
        expectedEndDate: ensureDate(updateRentDto.expectedEndDate),
      }),
      ...(updateRentDto.returnedAt && {
        returnedAt: ensureDate(updateRentDto.returnedAt),
      }),
    };

    Object.keys(updateRentDtoFixed).forEach(
      (key) =>
        updateRentDtoFixed[key as keyof typeof updateRentDtoFixed] ===
          undefined &&
        delete updateRentDtoFixed[key as keyof typeof updateRentDtoFixed],
    );
    return await this.dbService.db
      .update(rents)
      .set(updateRentDtoFixed)
      .where(eq(rents.id, id));
  }

  async remove(id: string, updateData: Partial<CreateRentDto>) {
    return await this.dbService.db
      .update(rents)
      .set(updateData)
      .where(eq(rents.id, id));
  }
}
