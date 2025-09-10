import { Type } from 'class-transformer';
import {
  IsString,
  IsUrl,
  IsNotEmpty,
  IsOptional,
  IsEmail,
} from 'class-validator';

export class CreateOrganizationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  // Contact information
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  // File ID references (all like rcFileId)
  @IsOptional()
  @IsString()
  imageFileId?: string;

  @IsOptional()
  @IsString()
  fleetListFileId?: string;

  @IsOptional()
  @IsString()
  modelGFileId?: string;

  @IsOptional()
  @IsString()
  rcFileId?: string;

  @IsOptional()
  @IsString()
  statusFileId?: string;

  @IsOptional()
  @IsString()
  identifiantFiscaleFileId?: string;

  @IsOptional()
  @IsString()
  decisionFileId?: string;

  @IsOptional()
  @IsString()
  ceoIdCardFileId?: string;

  @IsOptional()
  @IsString()
  bilanFileId?: string;
}
