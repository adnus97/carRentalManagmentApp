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
    const blob = body;

    // metadata = await autoMetadata(blob, metadata);

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: blob,

          // metadata
          ContentDisposition: metadata.ContentDisposition,
          ContentType: metadata.contentType,
          ContentLength: metadata.contentLength,
        }),
      );

      //this.logger.verbose(`Object \`${key}\` put`);
    } catch (e) {
      throw new Error(`Failed to put object \`${key}\``, {
        cause: e,
      });
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

      if (!obj.Body) {
        //this.logger.verbose(`Object \`${key}\` not found`);
        return {};
      }

      //this.logger.verbose(`Read object \`${key}\``);
      return {
        // @ts-expect-errors ignore browser response type `Blob`
        body: obj.Body,
        metadata: {
          // always set when putting object
          contentType: obj.ContentType!,
          contentLength: obj.ContentLength!,
          lastModified: obj.LastModified!,
          checksumCRC32: obj.ChecksumCRC32,
        },
      };
    } catch (e) {
      // 404
      if (e instanceof NoSuchKey) {
        //this.logger.verbose(`Object \`${key}\` not found`);
        return {};
      } else {
        throw new Error(`Failed to read object \`${key}\``, {
          cause: e,
        });
      }
    }
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    try {
      const url = await getSignedUrl(
        this.client,
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
        {
          expiresIn,
        },
      );

      if (!url) {
        //this.logger.verbose(`Object \`${key}\` not found`);
        return '';
      }

      return url;
    } catch (e) {
      // 404
      if (e instanceof NoSuchKey) {
        // this.logger.verbose(`Object \`${key}\` not found`);
        return '';
      } else {
        throw new Error(`Failed to read object \`${key}\``, {
          cause: e,
        });
      }
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
      throw new Error(`Failed to delete object \`${key}\``, {
        cause: e,
      });
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
