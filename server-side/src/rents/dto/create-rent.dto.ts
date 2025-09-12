// src/rents/dto/create-rent.dto.ts
import {
  IsOptional,
  IsBoolean,
  IsString,
  IsNumber,
  IsEnum,
  IsDateString,
  IsDate,
  IsArray,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

// Custom date transformer
const DateTransform = Transform(({ value }) => {
  if (!value) return undefined;
  if (value instanceof Date) return value;

  // Handle various date formats
  const date = new Date(value);
  return isNaN(date.getTime()) ? undefined : date;
});

export class CreateRentDto {
  @IsString()
  carId: string;

  @IsString()
  customerId: string;

  @Transform(({ value }) => {
    if (!value) return undefined;
    if (value instanceof Date) return value;
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : date;
  })
  @IsDate()
  startDate: Date;

  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    if (value instanceof Date) return value;
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : date;
  })
  @IsDate()
  expectedEndDate?: Date;

  @IsOptional()
  @IsBoolean()
  isOpenContract?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    if (value instanceof Date) return value;
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : date;
  })
  @IsDate()
  returnedAt?: Date;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  totalPrice?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  deposit?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  guarantee?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  lateFee?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  totalPaid?: number;

  @IsOptional()
  @IsBoolean()
  isFullyPaid?: boolean;

  @IsOptional()
  @IsEnum(['reserved', 'active', 'completed', 'canceled'])
  status?: 'reserved' | 'active' | 'completed' | 'canceled';

  @IsOptional()
  @IsString()
  damageReport?: string;

  @IsOptional()
  @IsBoolean()
  isDeleted?: boolean;

  // 🆕 Car image IDs (will be populated after upload)
  @IsOptional()
  @IsString()
  carImg1Id?: string;

  @IsOptional()
  @IsString()
  carImg2Id?: string;

  @IsOptional()
  @IsString()
  carImg3Id?: string;

  @IsOptional()
  @IsString()
  carImg4Id?: string;
}
