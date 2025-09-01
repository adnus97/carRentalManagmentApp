import {
  IsString,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsIn,
  IsObject,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateNotificationDto {
  @IsString()
  userId: string; // must match users.id

  @IsOptional()
  @IsString()
  orgId?: string | null; // optional, can be null

  @IsString()
  type: string; // e.g. RENT_STARTED, RENT_OVERDUE

  @IsString()
  message: string;

  @IsIn(['info', 'success', 'warning', 'error'])
  level: 'info' | 'success' | 'warning' | 'error' = 'info';

  @IsOptional()
  @IsBoolean()
  read?: boolean = false;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiresAt?: Date | null;

  @IsOptional()
  @IsObject()
  metadata?: string | Record<string, any> | null; // optional JSON object
}
