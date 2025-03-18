import { Get, Injectable } from '@nestjs/common';
import { DatabaseService, organization } from '../db';
import { eq } from 'drizzle-orm';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { createId } from '@paralleldrive/cuid2';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

import { File as MulterFile } from 'multer';
import { CurrentUser } from 'src/auth/auth.guard';

@Injectable()
export class OrganizationService {
  constructor(private readonly dbService: DatabaseService) {}

  async findAll() {
    return this.dbService.db.select().from(organization);
  }

  async findOne(id: string) {
    return this.dbService.db
      .select()
      .from(organization)
      .where(eq(organization.id, id));
  }

  async createOrganization(
    createOrganizationDto: CreateOrganizationDto,
    userId: string,
    image: string,
  ) {
    const id = createId();
    return this.dbService.db.insert(organization).values({
      id,
      userId: userId,
      image: image,
      ...createOrganizationDto,
    });
  }

  async updateOrganization(
    id: string,
    updateOrganizationDto: UpdateOrganizationDto,
  ) {
    return this.dbService.db
      .update(organization)
      .set({ ...updateOrganizationDto })
      .where(eq(organization.id, id));
  }

  async deleteOrganization(id: string) {
    return this.dbService.db
      .delete(organization)
      .where(eq(organization.id, id));
  }
}
