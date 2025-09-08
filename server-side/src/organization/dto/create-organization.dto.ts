import { Type } from 'class-transformer';
import { IsString, IsUrl, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateOrganizationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsUrl()
  image?: string;

  // ✅ New document fields
  @IsOptional()
  @IsUrl()
  fleetList?: string;

  @IsOptional()
  @IsUrl()
  modelG?: string;

  @IsOptional()
  @IsUrl()
  rc?: string;

  @IsOptional()
  @IsUrl()
  status?: string;

  @IsOptional()
  @IsUrl()
  identifiantFiscale?: string;

  @IsOptional()
  @IsUrl()
  decision?: string;

  @IsOptional()
  @IsUrl()
  ceoIdCard?: string;

  @IsOptional()
  @IsUrl()
  bilan?: string;
}
