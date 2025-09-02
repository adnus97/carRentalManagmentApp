// src/notifications/dto/notification-query.dto.ts
import {
  IsOptional,
  IsString,
  IsBoolean,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { Transform } from 'class-transformer';
import {
  NotificationCategory,
  NotificationPriority,
} from '../../types/notification.types';

export class NotificationQueryDto {
  @IsOptional()
  @IsEnum([
    'RENTAL',
    'PAYMENT',
    'CUSTOMER',
    'CAR',
    'MAINTENANCE',
    'FINANCIAL',
    'SYSTEM',
  ])
  category?: NotificationCategory;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  unread?: boolean;

  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  priority?: NotificationPriority;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  limit?: number = 20;
}
