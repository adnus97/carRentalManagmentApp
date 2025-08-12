import { PartialType } from '@nestjs/mapped-types';
import { CreateMonthlyTargetDto } from './create-monthly-target.dto';

export class UpdateMonthlyTargetDto extends PartialType(
  CreateMonthlyTargetDto,
) {}
