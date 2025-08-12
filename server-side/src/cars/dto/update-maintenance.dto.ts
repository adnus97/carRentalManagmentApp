import { PartialType } from '@nestjs/mapped-types';
import { CreateMaintenanceDto } from './create-maintenance.dto';

export class UpdateCreateMaintenanceDto extends PartialType(
  CreateMaintenanceDto,
) {}
