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
  IsBoolean,
  IsOptional,
} from 'class-validator';
export class CreateRentDto {
  @IsString()
  @IsNotEmpty()
  carId: string;

  @IsString()
  @IsNotEmpty()
  customerId: string;

  @IsDate()
  @Type(() => Date) // Ensure correct date transformation
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

  @IsNumber()
  totalPrice?: number;

  @IsNumber()
  customPrice?: number;

  @IsNumber()
  deposit: number;

  @IsNumber()
  guarantee: number;

  @IsNumber()
  lateFee: number;

  @IsString()
  status: 'active' | 'completed' | 'canceled';

  @IsString()
  damageReport?: string;

  @IsBoolean()
  isDeleted: boolean = false; // Default to false
}
