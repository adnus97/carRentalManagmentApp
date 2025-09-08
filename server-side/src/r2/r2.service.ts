import { Injectable } from '@nestjs/common';
import { S3Client } from '@aws-sdk/client-s3';

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
}
