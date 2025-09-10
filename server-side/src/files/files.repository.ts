import { Inject, Injectable } from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';
import { eq } from 'drizzle-orm';
import { DatabaseService, schema } from 'src/db';
import { NewFile } from 'src/db/schema/files';

@Injectable()
export class FilesRepository {
  constructor(
    @Inject(DatabaseService) private databaseService: DatabaseService,
  ) {}

  async create({
    orgId,
    createdBy,
    name,
    path,
    type,
    size,
    url,
    isPublic,
  }: Omit<NewFile, 'id'>) {
    const fileId = createId();
    await this.databaseService.db.insert(schema.files).values({
      id: fileId,
      name,
      path,
      type,
      size,
      url,
      isPublic,
      orgId,
      createdBy,
    });
    return await this.findOne(fileId);

    //return res.length >= 1 ? res[0] : null;
  }

  async findOne(id: string) {
    const file = await this.databaseService.db.query.files.findFirst({
      where: eq(schema.files.id, id),
    });

    return file;
  }

  async findAll(org_id: string) {
    const files = await this.databaseService.db
      .select()
      .from(schema.files)
      .where(eq(schema.files.orgId, org_id));

    return files;
  }

  async delete(id: string) {
    const res = await this.databaseService.db
      .delete(schema.files)
      .where(eq(schema.files.id, id));

    return res;
  }
}
