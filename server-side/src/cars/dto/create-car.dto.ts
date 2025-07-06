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
} from 'class-validator';
import { isEmpty } from 'rxjs';

export class CreateCarDto {
  @IsString()
  @IsNotEmpty()
  make: string;

  @IsString()
  @IsNotEmpty()
  model: string;

  @IsNumber()
  @Min(2010)
  @Max(new Date().getFullYear())
  @IsNotEmpty()
  year: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  purchasePrice: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  pricePerDay: number;

  @IsNumber()
  @IsNotEmpty()
  mileage: number;

  @IsNumber()
  @IsNotEmpty()
  monthlyLeasePrice: number;

  @IsDate()
  @IsNotEmpty()
  lastOilChangeAt: Date;

  @IsDate()
  @IsNotEmpty()
  insuranceExpiryDate: Date;

  @IsString()
  @IsNotEmpty()
  status: string; // e.g., 'active', 'sold', 'leased'
}
