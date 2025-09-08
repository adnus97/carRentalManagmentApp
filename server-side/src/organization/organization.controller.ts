import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  ValidationPipe,
} from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
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
  ) {
    const userId = user.id;
    console.log('createOrganizationDto', createOrganizationDto);
    return this.organizationService.createOrganization(
      createOrganizationDto,
      userId,
    );
  }

  @Patch(':id')
  updateOrganization(
    @Param('id') id: string,
    @Body(ValidationPipe) updateOrganizationDto: UpdateOrganizationDto,
  ) {
    return this.organizationService.updateOrganization(
      id,
      updateOrganizationDto,
    );
  }

  @Delete(':id')
  deleteOrganization(@Param('id') id: string) {
    return this.organizationService.deleteOrganization(id);
  }
}
