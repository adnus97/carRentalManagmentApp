// src/files/files.controller.ts
import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
  Req, // Add this import
  StreamableFile,
  UploadedFile,
  UseInterceptors,
  Delete,
  Logger,
  Inject,
} from '@nestjs/common';
import { FilesService } from './files.service';
import { Auth, CurrentUser, CustomUser } from 'src/auth/auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express'; // Add Request import

@Auth()
@Controller('files')
export class FilesController {
  private readonly logger = new Logger(FilesController.name);
  constructor(
    @Inject(FilesService) private readonly fileService: FilesService, // ✅ Add @Inject()
  ) {
    console.log('🔧 FilesController constructor called');
    console.log('🔧 FilesService injected:', !!this.fileService);
  }
  @UseInterceptors(FileInterceptor('file'))
  @Post()
  async uploadFile(
    @CurrentUser() user: CustomUser,
    @UploadedFile() file?: Express.Multer.File,
    @Body()
    body?: {
      is_public?: string;
      type?: string;
      folder?: string;
      organizationId?: string;
      ids?: string;
    },
  ) {
    try {
      if (!file) {
        throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
      }

      this.logger.log(
        `File upload request: ${file.originalname} by user ${user.id}`,
      );

      const isPublic = body?.is_public === 'true';
      const type = body?.type || 'organization';
      const folder = body?.folder;
      let organizationId = body?.organizationId;

      if (!organizationId && body?.ids) {
        try {
          const parsedIds = JSON.parse(body.ids);
          organizationId = parsedIds.organizationId;
        } catch (error) {
          this.logger.warn('Failed to parse ids JSON:', error);
        }
      }

      const result = await this.fileService.uploadFile(file, user, {
        type,
        isPublic,
        organizationId,
        folder,
      });

      this.logger.log(`File uploaded successfully: ${result.id}`);
      return result;
    } catch (error) {
      this.logger.error('File upload error (controller):', error);

      // 🔴 TEMP: show real error in response
      const msg =
        error?.message ||
        error?.response?.data?.message ||
        'File upload failed (unknown error).';
      throw new HttpException(msg, HttpStatus.INTERNAL_SERVER_ERROR);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        error.message || 'File upload failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  async findAll(@CurrentUser() user: CustomUser) {
    try {
      return await this.fileService.findAllByUser(user);
    } catch (error) {
      this.logger.error('Find all files error:', error);
      throw new HttpException(
        'Failed to retrieve files',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: CustomUser) {
    try {
      const file = await this.fileService.findOne(id);

      if (!file) {
        throw new HttpException('File not found', HttpStatus.NOT_FOUND);
      }

      if (
        !file.isPublic &&
        file.createdBy !== user.id &&
        user.role !== 'admin'
      ) {
        throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
      }

      return file;
    } catch (error) {
      this.logger.error(`Find file error for ${id}:`, error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to retrieve file',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id/serve')
  async serveFile(
    @Param('id') id: string,
    @CurrentUser() user: CustomUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Query('download') download?: string,
  ): Promise<StreamableFile> {
    try {
      const forceDownload = download === 'true';
      const result = await this.fileService.serveFile(id, user);

      if (!result?.stream || !result?.metadata) {
        throw new HttpException('File not found', HttpStatus.NOT_FOUND);
      }

      const { contentType, contentLength } = result.metadata;

      // Base headers
      const headers: Record<string, string> = {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        ETag: `"${id}"`,
        'Accept-Ranges': 'bytes',
      };

      // Only set Content-Disposition for downloads or non-images
      if (forceDownload) {
        headers['Content-Disposition'] =
          `attachment; filename="${result.metadata.filename}"`;
      } else if (!contentType?.startsWith('image/')) {
        // Allow inline viewing for non-images like PDFs
        headers['Content-Disposition'] =
          `inline; filename="${result.metadata.filename}"`;
      }
      // IMPORTANT: for images we do NOT set Content-Disposition at all

      if (typeof contentLength === 'number') {
        headers['Content-Length'] = String(contentLength);
      }

      // Byte-range support
      const range = req.headers.range;
      if (range && !forceDownload && typeof contentLength === 'number') {
        const ranges = this.parseRange(range, contentLength);
        if (ranges && ranges.length === 1) {
          const { start, end } = ranges[0];
          if (
            Number.isFinite(start) &&
            Number.isFinite(end) &&
            start >= 0 &&
            end >= start &&
            end < contentLength
          ) {
            const chunkSize = end - start + 1;
            res.status(206);
            headers['Content-Range'] = `bytes ${start}-${end}/${contentLength}`;
            headers['Content-Length'] = String(chunkSize);
            headers['Accept-Ranges'] = 'bytes';
          }
        }
      }

      // Apply headers
      for (const [k, v] of Object.entries(headers)) {
        if (v !== undefined && v !== null) res.set(k, v);
      }

      this.logger.log(`Serving file ${id} to user ${user.id}`);
      return new StreamableFile(result.stream);
    } catch (error) {
      this.logger.error(`Serve file error for ${id}:`, error);
      if (error instanceof HttpException) throw error;
      throw new HttpException('File not found', HttpStatus.NOT_FOUND);
    }
  }

  @Get(':id/download')
  async downloadFile(
    @Param('id') id: string,
    @CurrentUser() user: CustomUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    try {
      const result = await this.fileService.serveFile(id, user);

      const headers: Record<string, string> = {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${result.metadata.filename}"`,
        'Cache-Control': 'no-cache',
      };

      if (result.metadata.contentLength) {
        headers['Content-Length'] = result.metadata.contentLength.toString();
      }

      Object.entries(headers).forEach(([key, value]) => {
        if (value) {
          res.set(key, value);
        }
      });

      this.logger.log(`Downloading file ${id} for user ${user.id}`);
      return new StreamableFile(result.stream);
    } catch (error) {
      this.logger.error(`Download file error for ${id}:`, error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException('File not found', HttpStatus.NOT_FOUND);
    }
  }

  @Delete(':id')
  async deleteFile(@Param('id') id: string, @CurrentUser() user: CustomUser) {
    try {
      const result = await this.fileService.deleteFile(id, user);
      this.logger.log(`File ${id} deleted by user ${user.id}`);
      return result;
    } catch (error) {
      this.logger.error(`Delete file error for ${id}:`, error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to delete file',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/delete')
  async deleteFileLegacy(
    @Param('id') id: string,
    @CurrentUser() user: CustomUser,
  ) {
    return this.deleteFile(id, user);
  }

  @Get(':id/metadata')
  async getFileMetadata(
    @Param('id') id: string,
    @CurrentUser() user: CustomUser,
  ) {
    try {
      const file = await this.fileService.findOne(id);

      if (!file) {
        throw new HttpException('File not found', HttpStatus.NOT_FOUND);
      }

      if (
        !file.isPublic &&
        file.createdBy !== user.id &&
        user.role !== 'admin'
      ) {
        throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
      }

      return {
        id: file.id,
        name: file.name,
        type: file.type,
        size: file.size,
        isPublic: file.isPublic,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
        checksum: file.checksum,
      };
    } catch (error) {
      this.logger.error(`Get metadata error for ${id}:`, error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to get file metadata',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Helper method to parse range header
  private parseRange(
    rangeHeader: string,
    contentLength: number,
  ): Array<{ start: number; end: number }> | null {
    const ranges = [];
    const rangeMatch = rangeHeader.match(/bytes=(.+)/);

    if (!rangeMatch) {
      return null;
    }

    const rangeSpecs = rangeMatch[1].split(',');

    for (const rangeSpec of rangeSpecs) {
      const rangeParts = rangeSpec.trim().split('-');
      let start = parseInt(rangeParts[0], 10);
      let end = parseInt(rangeParts[1], 10);

      if (isNaN(start)) {
        start = contentLength - end;
        end = contentLength - 1;
      } else if (isNaN(end)) {
        end = contentLength - 1;
      }

      if (start >= contentLength || end >= contentLength || start > end) {
        return null;
      }

      ranges.push({ start, end });
    }
    return ranges;
  }
}
