// src/cars/dto/create-monthly-target.dto.ts
import {
  IsNotEmpty,
  IsNumber,
  IsDateString,
  IsOptional,
} from 'class-validator';

export class CreateMonthlyTargetDto {
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @IsNumber()
  @IsNotEmpty()
  targetRents: number;

  @IsNumber()
  @IsNotEmpty()
  revenueGoal: number; // in MAD
}
