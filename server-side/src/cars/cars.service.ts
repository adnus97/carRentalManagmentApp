import { Injectable } from '@nestjs/common';
import { cars, DatabaseService, organization } from 'src/db';
import { eq, ne, and, sql } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { CreateCarDto } from './dto/create-car.dto';

@Injectable()
export class CarsService {
  constructor(private readonly dbService: DatabaseService) {}

  async findAll(page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;

    // Get total count for pagination
    const [{ count }] = await this.dbService.db
      .select({ count: sql<number>`count(*)` })
      .from(cars)
      .where(ne(cars.status, 'deleted'));

    // Get paginated cars
    const data = await this.dbService.db
      .select()
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

  async findOne(id: string) {
    return await this.dbService.db.select().from(cars).where(eq(cars.id, id));
  }

  async createCar(createCarDto: CreateCarDto, userId: string) {
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
    console.log('Org ID:', orgId);

    return await this.dbService.db
      .insert(cars)
      .values({ id, orgId, ...createCarDto });
  }

  async findCarsByOrgId(userId: string, page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;

    // Get total count for pagination
    const [{ count }] = await this.dbService.db
      .select({ count: sql<number>`count(*)` })
      .from(cars)
      .leftJoin(organization, eq(cars.orgId, organization.id))
      .where(and(eq(organization.userId, userId), ne(cars.status, 'deleted')));

    // Get paginated cars
    const rows = await this.dbService.db
      .select()
      .from(cars)
      .leftJoin(organization, eq(cars.orgId, organization.id))
      .where(and(eq(organization.userId, userId), ne(cars.status, 'deleted')))
      .orderBy(sql`${cars.createdAt} DESC`)
      .offset(offset)
      .limit(pageSize);

    // Map to car objects (if needed)
    const data = rows.map((row) => row.cars);

    return {
      data,
      page,
      pageSize,
      total: Number(count),
      totalPages: Math.ceil(Number(count) / pageSize),
    };
  }

  async updateCar(id: string, updateData: Partial<CreateCarDto>) {
    return await this.dbService.db
      .update(cars)
      .set(updateData)
      .where(eq(cars.id, id));
  }
}
