import { Get, Injectable } from '@nestjs/common';
import { DatabaseService, organization } from '../db';
import { eq } from 'drizzle-orm';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { createId } from '@paralleldrive/cuid2';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationService {
  constructor(private readonly dbService: DatabaseService) {}

  async findAll() {
    return await this.dbService.db.select().from(organization);
  }

  async findOrganizationByUserId(userId: string) {
    return await this.dbService.db
      .select()
      .from(organization)
      .where(eq(organization.userId, userId));
  }

  async findOne(id: string) {
    return await this.dbService.db
      .select()
      .from(organization)
      .where(eq(organization.id, id));
  }

  async createOrganization(
    createOrganizationDto: CreateOrganizationDto,
    userId: string,
  ) {
    const id = createId();
    return await this.dbService.db.insert(organization).values({
      id,
      userId: userId,
      ...createOrganizationDto, // ✅ Now includes all the new fields
      updatedAt: new Date(),
    });
  }

  async updateOrganization(
    id: string,
    updateOrganizationDto: UpdateOrganizationDto,
  ) {
    return this.dbService.db
      .update(organization)
      .set({
        ...updateOrganizationDto, // ✅ Now includes all the new fields
        updatedAt: new Date(),
      })
      .where(eq(organization.id, id));
  }

  async deleteOrganization(id: string) {
    return this.dbService.db
      .delete(organization)
      .where(eq(organization.id, id));
  }
}
