// src/r2/r2.service.ts
import { Injectable } from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Readable } from 'node:stream';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class R2Service {
  public readonly client: S3Client;
  public readonly bucket: string;
  public readonly publicUrl: string;

  constructor() {
    const endpoint = process.env.CLOUDFLARE_R2_ENDPOINT!;
    const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!;
    const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!;
    const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME!;
    const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL!;

    if (
      !endpoint ||
      !accessKeyId ||
      !secretAccessKey ||
      !bucket ||
      !publicUrl
    ) {
      throw new Error('Missing R2 environment variables');
    }

    this.client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });

    this.bucket = bucket;
    this.publicUrl = publicUrl.replace(/\/$/, '');
  }

  async put(
    key: string,
    body: Buffer,
    metadata: PutObjectMetadata = {},
  ): Promise<void> {
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentDisposition: metadata.ContentDisposition,
          ContentType: metadata.contentType,
          ContentLength: metadata.contentLength,
        }),
      );
    } catch (e: any) {
      // 🔴 This shows the true reason uploads fail in production
      console.error('R2 put error:', {
        name: e?.name,
        message: e?.message,
        statusCode: e?.$metadata?.httpStatusCode,
        requestId: e?.$metadata?.requestId,
        extendedRequestId: e?.$metadata?.extendedRequestId,
        cfId: e?.$metadata?.cfId,
        stack: e?.stack,
      });
      throw new Error(`Failed to put object \`${key}\``);
    }
  }

  async get(key: string): Promise<{
    body?: Readable;
    metadata?: GetObjectMetadata;
  }> {
    try {
      const obj = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );

      if (!obj.Body) return {};

      return {
        body: obj.Body as Readable,
        metadata: {
          contentType: obj.ContentType!,
          contentLength: obj.ContentLength!,
          lastModified: obj.LastModified!,
          checksumCRC32: obj.ChecksumCRC32,
        },
      };
    } catch (e) {
      if (e instanceof NoSuchKey) return {};
      throw new Error(`Failed to read object \`${key}\``);
    }
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    try {
      const url = await getSignedUrl(
        this.client,
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
        { expiresIn },
      );
      return url || '';
    } catch (e) {
      if (e instanceof NoSuchKey) return '';
      throw new Error(`Failed to read object \`${key}\``);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
    } catch (e) {
      throw new Error(`Failed to delete object \`${key}\``);
    }
  }
}

export interface PutObjectMetadata {
  contentType?: string;
  contentLength?: number;
  checksumCRC32?: string;
  ContentDisposition?: string;
}

export interface GetObjectMetadata {
  contentType: string;
  contentLength: number;
  lastModified: Date;
  checksumCRC32?: string;
}
