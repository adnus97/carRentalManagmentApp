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

export class CreateMaintenanceDto {
  @IsNotEmpty()
  type: string; // 'oil_change', 'tire_rotation', 'inspection', etc.

  @IsOptional()
  description: string;

  @IsNumber()
  @IsOptional()
  cost?: number;

  @IsNumber()
  @IsOptional()
  mileage?: number;
}
