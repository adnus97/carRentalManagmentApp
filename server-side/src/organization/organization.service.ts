import { Get, Injectable } from '@nestjs/common';
import { DatabaseService, organization } from '../db';
import { eq } from 'drizzle-orm';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { createId } from '@paralleldrive/cuid2';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { UploadService } from 'src/upload/upload.service';
import { File as MulterFile } from 'multer';

@Injectable()
export class OrganizationService {
  constructor(
    private readonly dbService: DatabaseService,
    private readonly uploadService: UploadService,
  ) {}

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
    file?: MulterFile,
  ) {
    const id = createId();
    let imageUrl = null;

    if (file) {
      const uploadResponse = await this.uploadService.uploadFile(file);
      imageUrl = uploadResponse.url;
    }

    return this.dbService.db.insert(organization).values({
      id,
      userId: userId,
      image: imageUrl,
      ...createOrganizationDto,
    });
  }

  async updateOrganization(
    id: string,
    updateOrganizationDto: UpdateOrganizationDto,
    file?: MulterFile,
  ) {
    let imageUrl = updateOrganizationDto.image;

    if (file) {
      const uploadResponse = await this.uploadService.uploadFile(file);
      imageUrl = uploadResponse.url;
    }
    return this.dbService.db
      .update(organization)
      .set({ updatedAt: new Date(), image: imageUrl, ...updateOrganizationDto })
      .where(eq(organization.id, id));
  }

  async deleteOrganization(id: string) {
    return this.dbService.db
      .delete(organization)
      .where(eq(organization.id, id));
  }
}
