import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { create } from 'domain';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { File as MulterFile } from 'multer';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('organization')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}
  @UseGuards(AuthGuard) // Ensure only authenticated users can create organizations
  @Get()
  async findAll() {
    return await this.organizationService.findAll();
  }
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.organizationService.findOne(id);
  }
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async createOrganization(
    @Req() req: Request, // Get the request object
    @Body(ValidationPipe) createOrganizationDto: CreateOrganizationDto,
    @UploadedFile() file?: MulterFile,
  ) {
    const userId = req['userId'];
    return await this.organizationService.createOrganization(
      createOrganizationDto,
      file,
      userId,
    );
  }
  @Patch(':id')
  @UseInterceptors(FileInterceptor('file'))
  async updateOrganization(
    @Param('id') id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
    @UploadedFile() file?: MulterFile,
  ) {
    return await this.organizationService.updateOrganization(
      id,
      updateOrganizationDto,
      file,
    );
  }

  @Delete(':id')
  async deleteOrganization(@Param('id') id: string) {
    return await this.organizationService.deleteOrganization(id);
  }
}
