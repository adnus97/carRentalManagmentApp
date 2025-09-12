// src/files/files.repository.ts
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../db';
import { files } from '../db/schema/files';
import { eq, and, desc } from 'drizzle-orm';

export interface CreateFileData {
  id: string;
  name: string;
  path: string;
  type: string;
  size: number;
  isPublic: boolean;
  checksum: string;
  createdBy: string;
  orgId?: string;
  metadata?: any;
}

@Injectable()
export class FilesRepository {
  constructor(private dbService: DatabaseService) {}

  async create(data: CreateFileData) {
    // Fix: Properly handle the returning result
    const result = await this.dbService.db
      .insert(files)
      .values({
        id: data.id,
        name: data.name,
        path: data.path,
        type: data.type,
        size: data.size,
        url: data.isPublic
          ? `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${data.path}`
          : null,
        isPublic: data.isPublic,
        checksum: data.checksum,
        createdBy: data.createdBy,
        orgId: data.orgId,
        metadata: data.metadata,
      })
      .returning();

    // Return the first item from the array result
    return result[0];
  }

  async findOne(id: string) {
    const result = await this.dbService.db
      .select()
      .from(files)
      .where(eq(files.id, id))
      .limit(1);

    return result[0];
  }

  async findByUser(userId: string) {
    return this.dbService.db
      .select()
      .from(files)
      .where(eq(files.createdBy, userId))
      .orderBy(desc(files.createdAt));
  }

  async findByChecksum(checksum: string, userId: string) {
    const result = await this.dbService.db
      .select()
      .from(files)
      .where(and(eq(files.checksum, checksum), eq(files.createdBy, userId)))
      .limit(1);

    return result[0];
  }

  async delete(id: string) {
    await this.dbService.db.delete(files).where(eq(files.id, id));
  }
}
