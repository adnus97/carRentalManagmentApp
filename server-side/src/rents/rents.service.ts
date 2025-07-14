import { Injectable } from '@nestjs/common';
import { CreateRentDto } from './dto/create-rent.dto';
import { UpdateRentDto } from './dto/update-rent.dto';
import { createId } from '@paralleldrive/cuid2';
import { DatabaseService, organization } from 'src/db';
import { eq } from 'drizzle-orm';
import { rents } from 'src/db/schema/rents';

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

  findAll() {
    return `This action returns all rents`;
  }

  findOne(id: number) {
    return `This action returns a #${id} rent`;
  }

  update(id: number, updateRentDto: UpdateRentDto) {
    return `This action updates a #${id} rent`;
  }

  remove(id: number) {
    return `This action removes a #${id} rent`;
  }
}
