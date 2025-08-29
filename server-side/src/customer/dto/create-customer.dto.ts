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
  @IsEmail({}, { message: 'Invalid email format' })
  email?: string;

  @IsString()
  @IsNotEmpty({ message: 'Phone is required' })
  phone: string;

  @IsString()
  @IsNotEmpty({ message: 'Document ID is required' })
  documentId: string; // ✅ required, uniqueness enforced in DB + service

  @IsEnum(['passport', 'driver_license', 'id_card'], {
    message: 'Document type must be passport, driver_license, or id_card',
  })
  documentType: 'passport' | 'driver_license' | 'id_card'; // ✅ required

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Rating must be a positive number' })
  rating?: number = 0;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Rating count must be a positive number' })
  ratingCount?: number = 0;
}
