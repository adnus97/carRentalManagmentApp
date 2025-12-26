import { Transform } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsEmail,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  Min,
} from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  firstName: string;

  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  lastName: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : value))
  phone?: string;

  @IsOptional()
  @IsEmail()
  @Transform(({ value }) => (value === '' ? undefined : value))
  email?: string;

  @IsString()
  @IsNotEmpty({ message: 'Address is required' })
  address: string;

  @IsString()
  @IsNotEmpty({ message: 'Document ID is required' })
  documentId: string;

  @IsEnum(['passport', 'id_card'], {
    message: 'Document type must be passport or id_card',
  })
  documentType: 'passport' | 'id_card';

  @IsOptional()
  @IsString()
  driversLicense?: string;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Rating must be a positive number' })
  rating?: number = 0;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Rating count must be a positive number' })
  ratingCount?: number = 0;

  @IsOptional()
  @IsString()
  idCardId?: string;

  @IsOptional()
  @IsString()
  driversLicenseId?: string;
}
