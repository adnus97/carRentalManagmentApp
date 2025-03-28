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
import { AuthGuard, CurrentUser, CustomUser, Auth } from 'src/auth/auth.guard';

@Auth()
@Controller('organization')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Get()
  findAll() {
    return this.organizationService.findAll();
  }
  @Get('/user')
  findOrganizationByUserId(@CurrentUser() user: CustomUser) {
    const userId = user.id;
    return this.organizationService.findOrganizationByUserId(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.organizationService.findOne(id);
  }

  @Post()
  createOrganization(
    @Body(ValidationPipe) createOrganizationDto: CreateOrganizationDto,
    @CurrentUser() user: CustomUser,
    @Req() req, // Get the request object
  ) {
    const userId = user.id;
    const image = req.body.image;
    console.log('userId', userId);
    return this.organizationService.createOrganization(
      createOrganizationDto,
      userId,
      image,
    );
  }
  @Patch(':id')
  updateOrganization(
    @Param('id') id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
    @Req() req, // Get the request object
  ) {
    const image = req.body.image;
    return this.organizationService.updateOrganization(
      id,
      updateOrganizationDto,
      image,
    );
  }
  @Delete(':id')
  deleteOrganization(@Param('id') id: string) {
    return this.organizationService.deleteOrganization(id);
  }

  // Expose the upload configuration
}
