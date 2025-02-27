import { Type } from 'class-transformer';
import {
  isEnum,
  IsString,
  IsEmpty,
  IsUrl,
  Min,
  IsNotEmpty,
  IsDate,
} from 'class-validator';
import { isEmpty } from 'rxjs';

export class CreateOrganizationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  userId: string; // The user who owns the organization

  @IsUrl()
  image?: string;

  @Type(() => Date)
  @IsDate()
  createdAt: Date;

  @Type(() => Date)
  @IsDate()
  updatedAt: Date;
}
