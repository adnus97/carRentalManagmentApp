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
  @Matches(/^\d{1,7}-[أبتثجحخدذرزسشصضطظعغفقكلمنهوي]-\d{1,2}$/, {
    message: 'Invalid Moroccan plate number format. Expected format: 12345-أ-6',
  })
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

  @IsDate()
  @Type(() => Date) // Ensure correct date transformation
  @IsNotEmpty()
  technicalVisiteExpiryDate: Date;

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
