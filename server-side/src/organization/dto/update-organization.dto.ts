import { CreateOrganizationDto } from './create-organization.dto';
import { PartialType } from '@nestjs/mapped-types';

export class UpdateOrganizationDto extends PartialType(CreateOrganizationDto) {}
