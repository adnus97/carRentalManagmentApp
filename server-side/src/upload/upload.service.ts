import { Injectable, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import * as FormData from 'form-data';
import { File as MulterFile } from 'multer';

@Injectable()
export class UploadService {
  private UPLOADTHING_API_URL = 'https://uploadthing.com/api/upload';
  private API_KEY =
    process.env.UPLOADTHING_SECRET ||
    'eyJhcGlLZXkiOiJza19saXZlXzUwNGE4NzE2M2E5YmI5ODljZTNiZjg5N2M2YjI4OWQxNDk0N2VmM2VjNDY3MDM1OTFjMzIyM2QyMTRiZmY2YWYiLCJhcHBJZCI6Im11bjVhMmVoYTEiLCJyZWdpb25zIjpbInNlYTEiXX0=';
  async uploadFile(file: MulterFile) {
    if (!file) throw new BadRequestException('No file provided');

    const formData = new FormData();
    formData.append('file', file.buffer, file.originalname);

    try {
      const response = await axios.post(this.UPLOADTHING_API_URL, formData, {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${this.API_KEY}`,
        },
      });

      return response.data;
    } catch (error) {
      throw new BadRequestException(`Upload failed: ${error.message}`);
    }
  }
}
