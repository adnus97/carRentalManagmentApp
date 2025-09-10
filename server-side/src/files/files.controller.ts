// src/files/files.controller.ts
import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FilesService } from './files.service';
import { Auth, CurrentUser, CustomUser } from 'src/auth/auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';

@Auth()
@Controller('files')
export class FilesController {
  constructor(private readonly fileService: FilesService) {}

  @UseInterceptors(FileInterceptor('file'))
  @Post()
  async uploadFile(
    @CurrentUser() user: CustomUser,
    @UploadedFile() file?: Express.Multer.File,
    @Body()
    body?: {
      is_public: boolean;
      type: 'rents' | 'customers' | 'organization';
      ids?: string; // JSON string
    },
  ) {
    try {
      if (!file) {
        throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
      }

      const parsedIds = body?.ids ? JSON.parse(body.ids) : {};

      const fileData = await this.fileService.create({
        user,
        buffer: file.buffer,
        name: file.originalname,
        path: file.path,
        type: file.mimetype,
        size: file.size,
        is_public: body?.is_public ?? false,
        file_type: body?.type ?? 'organization',
        ids: parsedIds,
      });

      return fileData;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Internal Server Error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  findAll(@CurrentUser() user: CustomUser) {
    return this.fileService.findAll(user);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.fileService.findOne(id);
  }

  // New endpoint for serving files directly (for images in UI)
  @Get(':id/serve')
  async serveFile(@Param('id') id: string, @Res() res: Response) {
    try {
      const fileData = await this.fileService.findOne(id);

      if (fileData.url) {
        return res.redirect(fileData.url);
      }

      throw new HttpException('File URL not available', HttpStatus.NOT_FOUND);
    } catch (error) {
      throw new HttpException('File not found', HttpStatus.NOT_FOUND);
    }
  }

  @Post(':id/delete')
  remove(@Param('id') id: string) {
    return this.fileService.delete(id);
  }
}
