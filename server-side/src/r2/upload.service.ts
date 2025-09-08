import { Injectable } from '@nestjs/common';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuid } from 'uuid';
import { R2Service } from './r2.service';

export interface PresignDto {
  fileName: string;
  fileType: string;
  folder?: string;
}

export interface PresignResult {
  presignedUrl: string;
  key: string;
  url: string;
}

@Injectable()
export class UploadService {
  constructor(private readonly r2: R2Service) {}

  async createPresignedUrl(dto: PresignDto): Promise<PresignResult> {
    const { fileName, fileType } = dto;
    const folder = dto.folder ?? 'uploads';

    const cleanName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const key = `${folder}/${uuid()}-${cleanName}`;

    const command = new PutObjectCommand({
      Bucket: this.r2.bucket,
      Key: key,
      ContentType: fileType,
      // Add these headers to ensure proper CORS handling
      CacheControl: 'max-age=31536000',
      Metadata: {
        originalName: fileName,
        uploadedAt: new Date().toISOString(),
      },
    });

    const presignedUrl = await getSignedUrl(this.r2.client, command, {
      expiresIn: 3600, // 1 hour
    });

    const url = `${this.r2.publicUrl}/${key}`;

    return { presignedUrl, key, url };
  }
}
