import { Injectable } from '@nestjs/common';
import { CreateRentDto } from './dto/create-rent.dto';
import { UpdateRentDto } from './dto/update-rent.dto';
import { createId } from '@paralleldrive/cuid2';
import { DatabaseService, organization } from 'src/db';
import { eq, sql, and } from 'drizzle-orm';
import { rents } from 'src/db/schema/rents';

function ensureDate(val: any) {
  if (val && typeof val === 'string') return new Date(val);
  return val;
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

  async findAll({ page = 1, pageSize = 20 }) {
    const offset = (page - 1) * pageSize;

    // Fetch paginated rents
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

  async update(id: string, updateRentDto: UpdateRentDto) {
    const updateRentDtoFixed = {
      ...updateRentDto,
      startDate: ensureDate(updateRentDto.startDate),
      expectedEndDate: ensureDate(updateRentDto.expectedEndDate),
      returnedAt: ensureDate(updateRentDto.returnedAt),
    };
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
