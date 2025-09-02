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
  Matches,
} from 'class-validator';
import { isEmpty } from 'rxjs';

export class CreateCarDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^[A-Z0-9-]+$/i, {
    message: 'Plate number can only contain letters, numbers, and hyphens',
  }) // ✅ Optional: Add format validation
  plateNumber: string;

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
  @Type(() => Date) // Ensure correct date transformation
  @IsNotEmpty()
  insuranceExpiryDate: Date;

  @IsString()
  @IsNotEmpty()
  status: string; // e.g., 'active', 'sold', 'leased'

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  fuelType?: string;
}
