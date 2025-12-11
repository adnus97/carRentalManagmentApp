// src/organization/organization.service.ts
import {
  Injectable,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
} from '@nestjs/common';
import { OrganizationRepository } from './organization.repository';
import { CustomUser } from 'src/auth/auth.guard';
import { FilesService } from 'src/files/files.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { DatabaseService } from 'src/db';

@Injectable()
export class OrganizationService {
  private readonly logger = new Logger(OrganizationService.name);
  constructor(
    @Inject(OrganizationRepository)
    private organizationRepository: OrganizationRepository,
    @Inject(FilesService) private filesService: FilesService,
    @Inject(DatabaseService) private readonly dbService: DatabaseService,
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
    const transaction = this.dbService.db.transaction(async (tx) => {
      try {
        this.logger.log(`Updating organization ${id} by user ${user.id}`);

        // Validate organization exists and user has permission
        const organization = await this.organizationRepository.findOne(id);
        if (!organization) {
          throw new HttpException(
            'Organization not found',
            HttpStatus.NOT_FOUND,
          );
        }

        if (organization.userId !== user.id && user.role !== 'admin') {
          throw new HttpException(
            'You do not have permission to update this organization',
            HttpStatus.FORBIDDEN,
          );
        }

        // Validate all file IDs exist before updating
        await this.validateFileIds(body);

        // Prepare update data (only defined fields)
        const updateData = this.sanitizeUpdateData(body);

        // Perform update
        const updated = await this.organizationRepository.update(
          id,
          updateData,
        );

        this.logger.log(`Organization ${id} updated successfully`);
        return updated;
      } catch (error) {
        this.logger.error(`Failed to update organization ${id}:`, error);
        throw error;
      }
    });

    return transaction;
  }
  private sanitizeUpdateData(body: UpdateOrganizationDto): any {
    const updateData: any = {};

    // Only include defined values
    const fields = [
      'name',
      'email',
      'website',
      'phone',
      'address',
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

    for (const field of fields) {
      if (body[field] !== undefined) {
        // Sanitize string values
        if (typeof body[field] === 'string') {
          updateData[field] = body[field].trim() || null;
        } else {
          updateData[field] = body[field];
        }
      }
    }

    return updateData;
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

      // Small helper: pick a safe URL for any file
      const toSafeUrl = (f?: {
        id?: string;
        url?: string | null;
        isPublic?: boolean;
      }) => {
        if (!f?.id) return undefined;
        if (f.isPublic && f.url) return f.url; // already public
        return `/api/v1/files/${f.id}/serve`; // private or missing -> serve route
      };

      // Helper to fetch file and normalize its URL
      const getFileData = async (fileId?: string | null) => {
        if (!fileId) return null;
        try {
          const f = await this.filesService.findOne(fileId);
          return { ...f, url: toSafeUrl(f) };
        } catch (error: any) {
          console.warn(
            `Failed to fetch file ${fileId}:`,
            error?.message || error,
          );
          return null;
        }
      };

      const populatedOrg: any = { ...organization };

      // All file ID fields you store on the org
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
      ] as const;

      // Fetch in sequence (simple + readable). If you want faster, use Promise.all.
      for (const field of fileFields) {
        const fileId = (organization as any)[field] as string | undefined;
        if (fileId) {
          const fileData = await getFileData(fileId);
          if (fileData) {
            const targetKey = field.replace('FileId', 'File');
            populatedOrg[targetKey] = fileData;
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
  private async validateFileIds(body: UpdateOrganizationDto): Promise<void> {
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
    ].filter(Boolean);

    if (fileIds.length === 0) return;

    const validationPromises = fileIds.map(async (fileId) => {
      try {
        await this.filesService.findOne(fileId);
      } catch (error) {
        throw new HttpException(
          `File with ID ${fileId} not found`,
          HttpStatus.BAD_REQUEST,
        );
      }
    });

    await Promise.all(validationPromises);
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
