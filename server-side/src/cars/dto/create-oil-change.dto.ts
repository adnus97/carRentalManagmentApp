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

export class CreateOilChangeDto {
  @IsNumber()
  @IsNotEmpty()
  mileageAtChange: number;

  @IsNumber()
  @IsOptional()
  nextDueAtKm?: number;

  @IsNumber()
  @IsOptional()
  cost?: number;
}
