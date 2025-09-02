import {
  IsString,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsIn,
  IsObject,
  IsDate,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  NotificationCategory,
  NotificationPriority,
  NotificationType,
} from 'src/types/notification.types';

export class CreateNotificationDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  orgId?: string;

  @IsEnum([
    'RENTAL',
    'PAYMENT',
    'CUSTOMER',
    'CAR',
    'MAINTENANCE',
    'FINANCIAL',
    'SYSTEM',
  ])
  category: NotificationCategory;

  @IsString()
  type: NotificationType | string;

  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  priority?: NotificationPriority | string;

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsEnum(['info', 'success', 'warning', 'error'])
  level?: 'info' | 'success' | 'warning' | 'error' | string;

  @IsOptional()
  @IsString()
  actionUrl?: string;

  @IsOptional()
  @IsString()
  actionLabel?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
