import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsDate,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsEnum,
} from 'class-validator';

export class CreateRentDto {
  @IsString()
  @IsNotEmpty()
  carId: string;

  @IsString()
  @IsNotEmpty()
  customerId: string;

  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  startDate: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expectedEndDate?: Date;

  @IsBoolean()
  isOpenContract: boolean;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  returnedAt?: Date;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  totalPrice?: number;

  @IsNumber()
  @Type(() => Number)
  deposit: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  totalPaid?: number;

  @IsOptional()
  @IsBoolean()
  isFullyPaid?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  guarantee?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  lateFee?: number;

  @IsEnum(['active', 'completed', 'canceled'])
  status: 'active' | 'completed' | 'canceled';

  @IsOptional()
  @IsString()
  damageReport?: string;

  @IsOptional()
  @IsBoolean()
  isDeleted?: boolean = false;
}
