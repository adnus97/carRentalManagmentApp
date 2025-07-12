import { Injectable } from '@nestjs/common';
import { cars, DatabaseService, organization } from 'src/db';
import { eq, ne, and } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { CreateCarDto } from './dto/create-car.dto';

@Injectable()
export class CarsService {
  constructor(private readonly dbService: DatabaseService) {}

  async findAll() {
    const allCars = await this.dbService.db.select().from(cars);
    console.log('All cars with status:', allCars);

    const filteredCars = await this.dbService.db
      .select()
      .from(cars)
      .where(ne(cars.status, 'deleted'));

    console.log('Filtered cars:', filteredCars);
    return filteredCars;
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

  async findCarsByOrgId(userId: string) {
    const result = await this.dbService.db
      .select()
      .from(cars)
      .leftJoin(organization, eq(cars.orgId, organization.id))
      .where(
        and(
          eq(organization.userId, userId),
          ne(cars.status, 'deleted'), // Add this line to filter out deleted cars
        ),
      );

    return result.map((row) => row.cars);
  }

  async updateCar(id: string, updateData: Partial<CreateCarDto>) {
    return await this.dbService.db
      .update(cars)
      .set(updateData)
      .where(eq(cars.id, id));
  }
}
