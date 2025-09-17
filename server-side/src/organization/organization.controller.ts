// src/organization/organization.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { Auth, CurrentUser, CustomUser } from 'src/auth/auth.guard';

@Auth()
@Controller('organizations')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Post()
  create(@CurrentUser() user: CustomUser, @Body() body: CreateOrganizationDto) {
    try {
      return this.organizationService.create(user, body);
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
  findAll() {
    return this.organizationService.findAll();
  }

  @Get('user')
  async findByUser(@CurrentUser() user: CustomUser) {
    try {
      return await this.organizationService.findByUser(user);
    } catch (error) {
      console.log('errrrrrrrr', error);
    }
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.organizationService.findOne(id);
  }

  @Get(':id/with-files')
  findOneWithFiles(@Param('id') id: string) {
    return this.organizationService.findOneWithFiles(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: CustomUser,
    @Body() body: UpdateOrganizationDto,
  ) {
    try {
      return this.organizationService.update(id, user, body);
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

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: CustomUser) {
    return this.organizationService.delete(id, user);
  }
}
