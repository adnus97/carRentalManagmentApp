// src/organization/organization.service.ts
import { Injectable, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { OrganizationRepository } from './organization.repository';
import { CustomUser } from 'src/auth/auth.guard';
import { FilesService } from 'src/files/files.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationService {
  constructor(
    @Inject(OrganizationRepository)
    private organizationRepository: OrganizationRepository,
    @Inject(FilesService)
    private filesService: FilesService,
  ) {}

  async create(user: CustomUser, body: CreateOrganizationDto) {
    try {
      // Check if user already has an organization
      const existing = await this.organizationRepository.findByUserId(user.id);
      if (existing && existing.length > 0) {
        throw new HttpException(
          'User already has an organization',
          HttpStatus.CONFLICT,
        );
      }

      const organization = await this.organizationRepository.create({
        name: body.name,
        userId: user.id,
        email: body.email,
        website: body.website,
        phone: body.phone,
        address: body.address,
        imageFileId: body.imageFileId,
        fleetListFileId: body.fleetListFileId,
        modelGFileId: body.modelGFileId,
        rcFileId: body.rcFileId,
        statusFileId: body.statusFileId,
        identifiantFiscaleFileId: body.identifiantFiscaleFileId,
        decisionFileId: body.decisionFileId,
        ceoIdCardFileId: body.ceoIdCardFileId,
        bilanFileId: body.bilanFileId,
      });

      return organization;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to create organization',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll() {
    try {
      return await this.organizationRepository.findAll();
    } catch (error) {
      throw new HttpException(
        'Failed to fetch organizations',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findOne(id: string) {
    try {
      if (!id || typeof id !== 'string') {
        throw new HttpException(
          'Invalid organization ID',
          HttpStatus.BAD_REQUEST,
        );
      }

      const organization = await this.organizationRepository.findOne(id);
      if (!organization) {
        throw new HttpException('Organization not found', HttpStatus.NOT_FOUND);
      }
      return organization;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to fetch organization',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findByUser(user: CustomUser) {
    try {
      const organizations = await this.organizationRepository.findByUserId(
        user.id,
      );
      return organizations || [];
    } catch (error) {
      throw new HttpException(
        'Failed to fetch user organizations',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async update(id: string, user: CustomUser, body: UpdateOrganizationDto) {
    try {
      if (!id || typeof id !== 'string') {
        throw new HttpException(
          'Invalid organization ID',
          HttpStatus.BAD_REQUEST,
        );
      }

      const organization = await this.organizationRepository.findOne(id);
      if (!organization) {
        throw new HttpException('Organization not found', HttpStatus.NOT_FOUND);
      }

      // Ensure user owns this organization or has admin rights
      if (organization.userId !== user.id && user.role !== 'admin') {
        throw new HttpException(
          'You do not have permission to update this organization',
          HttpStatus.FORBIDDEN,
        );
      }

      // Filter out undefined values to only update provided fields
      const updateData: any = {};
      if (body.name !== undefined) updateData.name = body.name;
      if (body.email !== undefined) updateData.email = body.email;
      if (body.website !== undefined) updateData.website = body.website;
      if (body.phone !== undefined) updateData.phone = body.phone;
      if (body.address !== undefined) updateData.address = body.address;
      if (body.imageFileId !== undefined)
        updateData.imageFileId = body.imageFileId;
      if (body.fleetListFileId !== undefined)
        updateData.fleetListFileId = body.fleetListFileId;
      if (body.modelGFileId !== undefined)
        updateData.modelGFileId = body.modelGFileId;
      if (body.rcFileId !== undefined) updateData.rcFileId = body.rcFileId;
      if (body.statusFileId !== undefined)
        updateData.statusFileId = body.statusFileId;
      if (body.identifiantFiscaleFileId !== undefined)
        updateData.identifiantFiscaleFileId = body.identifiantFiscaleFileId;
      if (body.decisionFileId !== undefined)
        updateData.decisionFileId = body.decisionFileId;
      if (body.ceoIdCardFileId !== undefined)
        updateData.ceoIdCardFileId = body.ceoIdCardFileId;
      if (body.bilanFileId !== undefined)
        updateData.bilanFileId = body.bilanFileId;

      const updated = await this.organizationRepository.update(id, updateData);
      return updated;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to update organization',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async delete(id: string, user: CustomUser) {
    try {
      if (!id || typeof id !== 'string') {
        throw new HttpException(
          'Invalid organization ID',
          HttpStatus.BAD_REQUEST,
        );
      }

      const organization = await this.organizationRepository.findOne(id);
      if (!organization) {
        throw new HttpException('Organization not found', HttpStatus.NOT_FOUND);
      }

      // Ensure user owns this organization or has admin rights
      if (organization.userId !== user.id && user.role !== 'admin') {
        throw new HttpException(
          'You do not have permission to delete this organization',
          HttpStatus.FORBIDDEN,
        );
      }

      await this.organizationRepository.delete(id);
      return { success: true, message: 'Organization deleted successfully' };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to delete organization',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Helper method to get organization with populated file data
  async findOneWithFiles(id: string) {
    try {
      const organization = await this.findOne(id);

      // Create populated organization object
      const populatedOrg: any = { ...organization };

      // Helper function to safely get file data
      const getFileData = async (fileId: string | null) => {
        if (!fileId) return null;
        try {
          const fileData = await this.filesService.findOne(fileId);
          return fileData;
        } catch (error) {
          console.warn(`Failed to fetch file ${fileId}:`, error.message);
          return null;
        }
      };

      // Populate all file fields
      const fileFields = [
        'imageFileId',
        'fleetListFileId',
        'modelGFileId',
        'rcFileId',
        'statusFileId',
        'identifiantFiscaleFileId',
        'decisionFileId',
        'ceoIdCardFileId',
        'bilanFileId',
      ];

      for (const field of fileFields) {
        const fileId = organization[field];
        if (fileId) {
          const fileData = await getFileData(fileId);
          if (fileData) {
            populatedOrg[field.replace('FileId', 'File')] = fileData;
          }
        }
      }

      return populatedOrg;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to fetch organization with files',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Helper method to validate file IDs exist
  async validateFileIds(body: CreateOrganizationDto | UpdateOrganizationDto) {
    const fileIds = [
      body.imageFileId,
      body.fleetListFileId,
      body.modelGFileId,
      body.rcFileId,
      body.statusFileId,
      body.identifiantFiscaleFileId,
      body.decisionFileId,
      body.ceoIdCardFileId,
      body.bilanFileId,
    ].filter((id) => id); // Filter out undefined/null values

    for (const fileId of fileIds) {
      try {
        await this.filesService.findOne(fileId);
      } catch (error) {
        throw new HttpException(
          `File with ID ${fileId} not found`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }

  // Get organization statistics
  async getOrganizationStats(user: CustomUser) {
    try {
      const organizations = await this.findByUser(user);
      if (organizations.length === 0) {
        return {
          hasOrganization: false,
          documentsUploaded: 0,
          totalDocuments: 9, // Total possible documents
          completionPercentage: 0,
        };
      }

      const org = organizations[0];
      const documentFields = [
        org.imageFileId,
        org.fleetListFileId,
        org.modelGFileId,
        org.rcFileId,
        org.statusFileId,
        org.identifiantFiscaleFileId,
        org.decisionFileId,
        org.ceoIdCardFileId,
        org.bilanFileId,
      ];

      const documentsUploaded = documentFields.filter((id) => id).length;
      const totalDocuments = documentFields.length;
      const completionPercentage = Math.round(
        (documentsUploaded / totalDocuments) * 100,
      );

      return {
        hasOrganization: true,
        organizationId: org.id,
        organizationName: org.name,
        documentsUploaded,
        totalDocuments,
        completionPercentage,
        missingDocuments: totalDocuments - documentsUploaded,
        hasCompleteProfile: completionPercentage === 100,
      };
    } catch (error) {
      throw new HttpException(
        'Failed to get organization statistics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

export { CreateOrganizationDto };
