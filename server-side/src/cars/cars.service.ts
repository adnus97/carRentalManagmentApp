import { Injectable } from '@nestjs/common';
import { cars, DatabaseService, organization } from 'src/db';
import { eq } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { CreateCarDto } from './dto/create-car.dto';

@Injectable()
export class CarsService {
  constructor(private readonly dbService: DatabaseService) {}
  async findAll() {
    return await this.dbService.db.select().from(cars);
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
}
