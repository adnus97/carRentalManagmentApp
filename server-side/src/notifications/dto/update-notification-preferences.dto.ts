// src/notifications/dto/update-preferences.dto.ts
import { IsOptional, IsBoolean, IsObject } from 'class-validator';
import { NotificationCategory } from '../../types/notification.types';

export class UpdateNotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @IsOptional()
  @IsObject()
  categories?: Partial<Record<NotificationCategory, boolean>>;

  @IsOptional()
  @IsObject()
  quietHours?: {
    start: string;
    end: string;
  };
}
