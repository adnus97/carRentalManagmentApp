// src/files/files.service.ts
import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { FilesRepository } from './files.repository';
import { R2Service } from '../r2/r2.service';
import { CustomUser } from '../auth/auth.guard';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { fileTypeFromBuffer } from 'file-type';
import { Readable } from 'stream';

export interface FileUploadResult {
  id: string;
  name: string;
  path: string;
  type: string;
  size: number;
  url: string;
  checksum: string;
}

export interface FileValidationConfig {
  maxSize: number;
  allowedTypes: string[];
  allowedExtensions: string[];
  scanForMalware?: boolean;
}

const FILE_CONFIGS: Record<string, FileValidationConfig> = {
  image: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
  },
  document: {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: ['application/pdf'],
    allowedExtensions: ['.pdf'],
  },
  organization: {
    maxSize: 25 * 1024 * 1024, // 25MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.pdf'],
  },
};

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly uploadAttempts = new Map<string, number>();

  constructor(
    private readonly filesRepository: FilesRepository,
    private readonly r2Service: R2Service,
  ) {}

  async uploadFile(
    file: Express.Multer.File,
    user: CustomUser,
    metadata: {
      type: string;
      isPublic?: boolean;
      organizationId?: string;
      folder?: string;
    },
  ): Promise<FileUploadResult> {
    const uploadId = uuidv4();
    let filePath: string | undefined;

    try {
      this.logger.log(`Starting file upload ${uploadId} for user ${user.id}`);

      // Rate limiting check
      this.checkRateLimit(user.id);

      // Validate file
      await this.validateFile(file, metadata.type);

      // Generate file checksum
      const checksum = this.generateChecksum(file.buffer);

      // Check for duplicates
      const existingFile = await this.findDuplicateFile(checksum, user.id);
      if (existingFile) {
        this.logger.log(`Duplicate file found ${uploadId}, returning existing`);
        return this.mapFileToResult(existingFile);
      }

      // Generate secure file path
      filePath = this.generateSecureFilePath(file, metadata);

      // Upload to R2
      await this.r2Service.put(filePath, file.buffer, {
        contentType: file.mimetype,
        contentLength: file.size,
        ContentDisposition: `attachment; filename="${file.originalname}"`,
      });

      // Save to database
      const savedFile = await this.filesRepository.create({
        id: uuidv4(),
        name: file.originalname,
        path: filePath,
        type: file.mimetype,
        size: file.size,
        isPublic: metadata.isPublic || false,
        checksum,
        createdBy: user.id,
        orgId: metadata.organizationId,
        metadata: {
          uploadId,
          folder: metadata.folder,
          originalExtension: this.getFileExtension(file.originalname),
        },
      });

      // Generate URL
      const url = await this.generateFileUrl(savedFile);

      const result: FileUploadResult = {
        id: savedFile.id,
        name: savedFile.name,
        path: savedFile.path,
        type: savedFile.type,
        size: savedFile.size,
        url,
        checksum: savedFile.checksum,
      };
      console.log('📤 FilesService.uploadFile called:');
      console.log('   File:', file.originalname, file.size, 'bytes');
      console.log('   User:', user.id);

      this.logger.log(`File upload completed ${uploadId}`);
      return result;
    } catch (error) {
      this.logger.error(`File upload failed ${uploadId}:`, error);

      if (filePath) {
        await this.cleanupFailedUpload(filePath);
      }

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'File upload failed. Please try again.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // NEW METHOD: Find all files by user
  async findAllByUser(user: CustomUser) {
    try {
      this.logger.log(`Finding all files for user ${user.id}`);

      const files = await this.filesRepository.findByUser(user.id);

      // Map files to include proper URLs
      const mappedFiles = files.map((file) => ({
        ...file,
        url: this.generateFileUrl(file),
      }));

      return mappedFiles;
    } catch (error) {
      this.logger.error(`Failed to find files for user ${user.id}:`, error);
      throw new HttpException(
        'Failed to retrieve files',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // NEW METHOD: Delete file
  async deleteFile(fileId: string, user: CustomUser) {
    try {
      this.logger.log(`Deleting file ${fileId} for user ${user.id}`);

      const file = await this.filesRepository.findOne(fileId);

      if (!file) {
        throw new HttpException('File not found', HttpStatus.NOT_FOUND);
      }

      // Check permissions
      if (file.createdBy !== user.id && user.role !== 'admin') {
        throw new HttpException(
          'You do not have permission to delete this file',
          HttpStatus.FORBIDDEN,
        );
      }

      // Delete from storage
      try {
        await this.r2Service.delete(file.path);
      } catch (storageError) {
        this.logger.warn(
          `Failed to delete file from storage: ${file.path}`,
          storageError,
        );
        // Continue with database deletion even if storage deletion fails
      }

      // Delete from database
      await this.filesRepository.delete(fileId);

      this.logger.log(`File ${fileId} deleted successfully`);

      return {
        success: true,
        message: 'File deleted successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to delete file ${fileId}:`, error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to delete file',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findOne(fileId: string) {
    try {
      const file = await this.filesRepository.findOne(fileId);

      if (!file) {
        return null;
      }

      return {
        ...file,
        url: this.generateFileUrl(file),
      };
    } catch (error) {
      this.logger.error(`Failed to find file ${fileId}:`, error);
      throw new HttpException(
        'Failed to retrieve file',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async serveFile(
    fileId: string,
    user: CustomUser,
  ): Promise<{
    stream: Readable;
    metadata: any;
  }> {
    try {
      const file = await this.filesRepository.findOne(fileId);
      if (!file) {
        throw new HttpException('File not found', HttpStatus.NOT_FOUND);
      }

      // Access control
      if (
        !file.isPublic &&
        file.createdBy !== user.id &&
        user.role !== 'admin'
      ) {
        throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
      }

      const { body, metadata } = await this.r2Service.get(file.path);
      if (!body) {
        throw new HttpException(
          'File not found in storage',
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        stream: body as Readable,
        metadata: {
          contentType: file.type,
          contentLength: file.size,
          filename: file.name,
          ...metadata,
        },
      };
    } catch (error) {
      this.logger.error(`File serve error for ${fileId}:`, error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to serve file',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private checkRateLimit(userId: string): void {
    const key = `upload_${userId}_${Date.now().toString().slice(0, -4)}`;
    const attempts = this.uploadAttempts.get(key) || 0;

    if (attempts >= 10) {
      throw new HttpException(
        'Too many upload attempts. Please wait before trying again.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    this.uploadAttempts.set(key, attempts + 1);
    setTimeout(() => this.uploadAttempts.delete(key), 60000);
  }

  private async validateFile(
    file: Express.Multer.File,
    type: string,
  ): Promise<void> {
    const config = FILE_CONFIGS[type];
    if (!config) {
      throw new HttpException(
        'Invalid file type category',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Size validation
    if (file.size > config.maxSize) {
      throw new HttpException(
        `File too large. Maximum size: ${Math.round(config.maxSize / 1024 / 1024)}MB`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // MIME type validation
    if (!config.allowedTypes.includes(file.mimetype)) {
      throw new HttpException(
        `Invalid file type. Allowed: ${config.allowedExtensions.join(', ')}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // File extension validation
    const ext = this.getFileExtension(file.originalname).toLowerCase();
    if (!config.allowedExtensions.includes(ext)) {
      throw new HttpException(
        `Invalid file extension. Allowed: ${config.allowedExtensions.join(', ')}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // Magic number validation for additional security
    try {
      const detectedType = await fileTypeFromBuffer(file.buffer);
      if (detectedType && !config.allowedTypes.includes(detectedType.mime)) {
        throw new HttpException(
          'File content does not match extension',
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (error) {
      this.logger.warn(
        `File type detection failed for ${file.originalname}:`,
        error,
      );

      if (
        file.mimetype.startsWith('image/') ||
        file.mimetype === 'application/pdf'
      ) {
        throw new HttpException(
          'Unable to verify file content. Please ensure the file is valid.',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    await this.performSecurityScan(file);
  }

  private async performSecurityScan(file: Express.Multer.File): Promise<void> {
    const malwarePatterns = [
      /eval\s*\(/gi,
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /vbscript:/gi,
    ];

    const content = file.buffer.toString('utf8').slice(0, 1024);

    for (const pattern of malwarePatterns) {
      if (pattern.test(content)) {
        this.logger.warn(
          `Suspicious content detected in file: ${file.originalname}`,
        );
        throw new HttpException(
          'File contains suspicious content',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }

  private generateChecksum(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  private generateSecureFilePath(
    file: Express.Multer.File,
    metadata: { folder?: string; type: string },
  ): string {
    const timestamp = Date.now();
    const randomId = crypto.randomBytes(16).toString('hex');
    const ext = this.getFileExtension(file.originalname);
    const folder = metadata.folder || metadata.type;

    return `${folder}/${timestamp}_${randomId}${ext}`;
  }

  private getFileExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex === -1 ? '' : filename.slice(lastDotIndex);
  }

  private async findDuplicateFile(
    checksum: string,
    userId: string,
  ): Promise<any> {
    return this.filesRepository.findByChecksum(checksum, userId);
  }

  private generateFileUrl(file: any): string {
    if (file.isPublic && file.url) {
      return file.url;
    }
    return `/api/v1/files/${file.id}/serve`;
  }

  private async cleanupFailedUpload(filePath: string): Promise<void> {
    try {
      await this.r2Service.delete(filePath);
    } catch (error) {
      this.logger.warn(`Failed to cleanup file: ${filePath}`, error);
    }
  }

  private mapFileToResult(file: any): FileUploadResult {
    return {
      id: file.id,
      name: file.name,
      path: file.path,
      type: file.type,
      size: file.size,
      url: file.url || `/api/v1/files/${file.id}/serve`,
      checksum: file.checksum,
    };
  }
}
