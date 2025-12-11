// src/organization/organization.repository.ts
import { Inject, Injectable } from '@nestjs/common';
import { DatabaseService, files } from '../db';
import { organization } from '../db/schema/organization';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export interface CreateOrganization {
  name: string;
  userId: string;
  email?: string;
  website?: string;
  phone?: string;
  address?: string;
  imageFileId?: string;
  fleetListFileId?: string;
  modelGFileId?: string;
  rcFileId?: string;
  statusFileId?: string;
  identifiantFiscaleFileId?: string;
  decisionFileId?: string;
  ceoIdCardFileId?: string;
  bilanFileId?: string;
}

export interface UpdateOrganization extends Partial<CreateOrganization> {}

@Injectable()
export class OrganizationRepository {
  constructor(
    @Inject(DatabaseService) private dbService: DatabaseService, // ✅ Add @Inject()
  ) {
    console.log('🔧 OrganizationRepository constructor called');
    console.log('🔧 DatabaseService injected:', !!this.dbService);
    console.log('🔧 DatabaseService.db exists:', !!this.dbService?.db);
  }

  async create(data: CreateOrganization) {
    const id = uuidv4();

    const newOrganization = await this.dbService.db
      .insert(organization)
      .values({
        id,
        name: data.name,
        userId: data.userId,
        email: data.email,
        website: data.website,
        phone: data.phone,
        address: data.address,
        imageFileId: data.imageFileId,
        fleetListFileId: data.fleetListFileId,
        modelGFileId: data.modelGFileId,
        rcFileId: data.rcFileId,
        statusFileId: data.statusFileId,
        identifiantFiscaleFileId: data.identifiantFiscaleFileId,
        decisionFileId: data.decisionFileId,
        ceoIdCardFileId: data.ceoIdCardFileId,
        bilanFileId: data.bilanFileId,
      })
      .returning();

    return newOrganization;
  }

  async findAll() {
    return this.dbService.db.select().from(organization);
  }

  async findOne(id: string) {
    const [org] = await this.dbService.db
      .select()
      .from(organization)
      .where(eq(organization.id, id))
      .limit(1);

    return org;
  }

  async findByUserId(userId: string) {
    return this.dbService.db
      .select({
        // Organization fields
        id: organization.id,
        name: organization.name,
        userId: organization.userId,
        email: organization.email,
        website: organization.website,
        phone: organization.phone,
        address: organization.address,
        imageFileId: organization.imageFileId,
        fleetListFileId: organization.fleetListFileId,
        modelGFileId: organization.modelGFileId,
        rcFileId: organization.rcFileId,
        statusFileId: organization.statusFileId,
        identifiantFiscaleFileId: organization.identifiantFiscaleFileId,
        decisionFileId: organization.decisionFileId,
        ceoIdCardFileId: organization.ceoIdCardFileId,
        bilanFileId: organization.bilanFileId,
        createdAt: organization.createdAt,
        updatedAt: organization.updatedAt,
        // Image file fields
        imageFile: {
          id: files.id,
          name: files.name,
          url: files.url,
          type: files.type,
          size: files.size,
        },
      })
      .from(organization)
      .leftJoin(files, eq(organization.imageFileId, files.id))
      .where(eq(organization.userId, userId));
  }

  async update(id: string, data: UpdateOrganization) {
    const updateData: any = {};

    // Only include fields that are provided (not undefined)
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.website !== undefined) updateData.website = data.website;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.imageFileId !== undefined)
      updateData.imageFileId = data.imageFileId;
    if (data.fleetListFileId !== undefined)
      updateData.fleetListFileId = data.fleetListFileId;
    if (data.modelGFileId !== undefined)
      updateData.modelGFileId = data.modelGFileId;
    if (data.rcFileId !== undefined) updateData.rcFileId = data.rcFileId;
    if (data.statusFileId !== undefined)
      updateData.statusFileId = data.statusFileId;
    if (data.identifiantFiscaleFileId !== undefined)
      updateData.identifiantFiscaleFileId = data.identifiantFiscaleFileId;
    if (data.decisionFileId !== undefined)
      updateData.decisionFileId = data.decisionFileId;
    if (data.ceoIdCardFileId !== undefined)
      updateData.ceoIdCardFileId = data.ceoIdCardFileId;
    if (data.bilanFileId !== undefined)
      updateData.bilanFileId = data.bilanFileId;

    // Add updatedAt
    updateData.updatedAt = new Date();

    const [updated] = await this.dbService.db
      .update(organization)
      .set(updateData)
      .where(eq(organization.id, id))
      .returning();

    return updated;
  }

  async delete(id: string) {
    await this.dbService.db.delete(organization).where(eq(organization.id, id));
  }
}
