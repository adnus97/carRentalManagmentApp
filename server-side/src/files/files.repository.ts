// src/files/files.repository.ts
import { Inject, Injectable } from '@nestjs/common';
import { DatabaseService } from '../db';
import { files } from '../db/schema/files';
import { eq, and, desc } from 'drizzle-orm';
import type { File as FileRow } from '../db/schema/files'; // <-- import the inferred row type

export interface CreateFileData {
  id: string;
  name: string;
  path: string;
  type: string;
  size: number;
  isPublic: boolean;
  checksum: string;
  createdBy: string;
  orgId?: string | null;
  metadata?: unknown | null;
}

@Injectable()
export class FilesRepository {
  constructor(
    @Inject(DatabaseService) private dbService: DatabaseService, // ✅ Add @Inject()
  ) {
    console.log('🔧 FilesRepository constructor called');
    console.log('🔧 DatabaseService injected:', !!this.dbService);
    console.log('🔧 DatabaseService.db exists:', !!this.dbService?.db);
  }

  async create(data: CreateFileData): Promise<FileRow> {
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
        orgId: data.orgId ?? null,
        metadata: data.metadata ?? null,
      })
      .returning();

    // Drizzle returns FileRow[]; pick the first row
    return result[0];
  }

  async findOne(id: string): Promise<FileRow | null> {
    const result = await this.dbService.db
      .select()
      .from(files)
      .where(eq(files.id, id))
      .limit(1);

    // result is FileRow[]; return FileRow | null
    return result.length ? (result[0] as FileRow) : null;
  }

  async findByUser(userId: string): Promise<FileRow[]> {
    const rows = await this.dbService.db
      .select()
      .from(files)
      .where(eq(files.createdBy, userId))
      .orderBy(desc(files.createdAt));

    // rows is FileRow[]
    return rows as FileRow[];
  }

  async findByChecksum(
    checksum: string,
    userId: string,
  ): Promise<FileRow | null> {
    const result = await this.dbService.db
      .select()
      .from(files)
      .where(and(eq(files.checksum, checksum), eq(files.createdBy, userId)))
      .limit(1);

    return result.length ? (result[0] as FileRow) : null;
  }

  async delete(id: string): Promise<void> {
    await this.dbService.db.delete(files).where(eq(files.id, id));
  }
}
