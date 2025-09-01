// src/notifications/notifications.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { customers, DatabaseService, users } from '../db';
import { createId } from '@paralleldrive/cuid2';
import { notifications } from '../db/schema/notifications';
import { eq, and, sql } from 'drizzle-orm';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly dbService: DatabaseService) {}

  /** ✅ Create notification - Direct pg client access */
  private async validateUserExists(userId: string): Promise<boolean> {
    try {
      const user = await this.dbService.db
        .select({ id: users.id })
        .from(users) // ✅ Correct table
        .where(eq(users.id, userId))
        .limit(1);

      return user.length > 0;
    } catch {
      return false;
    }
  }

  /** ✅ Create notification with user validation */
  async createNotification(dto: CreateNotificationDto) {
    const id = createId();

    // ✅ Check if user exists in users table
    const userExists = await this.validateUserExists(dto.userId);
    if (!userExists) {
      this.logger.warn(`Skipping notification - User ${dto.userId} not found`);
      throw new BadRequestException(`User ${dto.userId} does not exist`);
    }

    // Handle metadata
    let metadataObj: Record<string, any> | null = null;
    if (dto.metadata) {
      try {
        metadataObj =
          typeof dto.metadata === 'string'
            ? JSON.parse(dto.metadata)
            : dto.metadata;
      } catch {
        throw new BadRequestException('Invalid metadata format');
      }
    }

    try {
      // Get the underlying pg pool from Drizzle
      const pool = (this.dbService.db as any)._.session.client;

      const result = await pool.query(
        `INSERT INTO notifications (
          id, user_id, org_id, type, message, level, read, expires_at, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
        RETURNING *`,
        [
          id,
          dto.userId,
          dto.orgId || null,
          dto.type,
          dto.message,
          dto.level || 'info',
          dto.read || false,
          dto.expiresAt || null,
          metadataObj,
        ],
      );

      this.logger.debug('✅ Insert successful');
      return result.rows[0];
    } catch (err: any) {
      this.logger.error('Database insert failed:', {
        error: err.message,
        code: err.code,
        detail: err.detail,
        userId: dto.userId,
      });
      throw new BadRequestException(
        `Failed to create notification: ${err.message}`,
      );
    }
  }

  // ... rest of your methods remain the same

  // Keep other methods using Drizzle (they work fine for reads)
  async getUserNotifications(userId: string, onlyUnread = false) {
    const rows = await this.dbService.db
      .select()
      .from(notifications)
      .where(
        onlyUnread
          ? and(eq(notifications.userId, userId), eq(notifications.read, false))
          : eq(notifications.userId, userId),
      )
      .orderBy(sql`${notifications.createdAt} DESC`);

    return rows;
  }

  async markAsRead(notificationId: string) {
    const result = await this.dbService.db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, notificationId))
      .returning();

    if (result.length === 0) {
      throw new NotFoundException(
        `Notification with id ${notificationId} not found`,
      );
    }

    return { success: true };
  }

  async markAllAsRead(userId: string) {
    await this.dbService.db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.userId, userId));

    return { success: true };
  }
}
