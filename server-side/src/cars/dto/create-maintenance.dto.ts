import { Type } from 'class-transformer';
import {
  isEnum,
  IsString,
  IsEmpty,
  IsUrl,
  Min,
  IsNotEmpty,
  IsDate,
  IsNumber,
  Max,
  IsOptional,
} from 'class-validator';

export type MaintenanceType =
  | 'general'
  | 'oil_change'
  | 'tire_rotation'
  | 'inspection'
  | 'other';

export class CreateMaintenanceDto {
  @IsString()
  type: MaintenanceType;

  @IsOptional()
  description: string;

  @IsNumber()
  @IsOptional()
  cost?: number;

  @IsNumber()
  @IsOptional()
  mileage?: number;
}
