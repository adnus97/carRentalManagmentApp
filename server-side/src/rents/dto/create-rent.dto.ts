// src/rents/dto/create-rent.dto.ts
import {
  IsOptional,
  IsBoolean,
  IsString,
  IsNumber,
  IsEnum,
  IsDate,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

const DateTransform = Transform(({ value }) => {
  if (value === '' || value === null || value === undefined) return undefined;
  if (value instanceof Date) return value;
  const d = new Date(value);
  return isNaN(d.getTime()) ? undefined : d;
});
const BoolTransform = Transform(({ value }) => {
  if (value === '' || value === null || value === undefined) return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (v === 'true') return true;
    if (v === 'false') return false;
  }
  return undefined;
});
const NumTransform = Transform(({ value }) => {
  if (value === '' || value === null || value === undefined) return undefined;
  if (typeof value === 'number') return value;
  const n = Number(value);
  return isNaN(n) ? undefined : n;
});

export class CreateRentDto {
  @IsString()
  carId: string;

  @IsString()
  customerId: string;

  @DateTransform
  @IsDate()
  startDate: Date;

  @IsOptional()
  @DateTransform
  @IsDate()
  expectedEndDate?: Date;

  @IsOptional()
  @BoolTransform
  @IsBoolean()
  isOpenContract?: boolean;

  @IsOptional()
  @DateTransform
  @IsDate()
  returnedAt?: Date;

  @IsOptional()
  @NumTransform
  @IsNumber()
  @Type(() => Number)
  totalPrice?: number;

  @IsOptional()
  @NumTransform
  @IsNumber()
  @Type(() => Number)
  deposit?: number;

  @IsOptional()
  @NumTransform
  @IsNumber()
  @Type(() => Number)
  guarantee?: number;

  @IsOptional()
  @NumTransform
  @IsNumber()
  @Type(() => Number)
  lateFee?: number;

  @IsOptional()
  @NumTransform
  @IsNumber()
  @Type(() => Number)
  totalPaid?: number;

  @IsOptional()
  @BoolTransform
  @IsBoolean()
  isFullyPaid?: boolean;

  @IsOptional()
  @IsEnum(['reserved', 'active', 'completed', 'canceled'])
  status?: 'reserved' | 'active' | 'completed' | 'canceled';

  @IsOptional()
  @IsString()
  damageReport?: string;

  @IsOptional()
  @BoolTransform
  @IsBoolean()
  isDeleted?: boolean;

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
