// src/notifications/notifications.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../db';
import { createId } from '@paralleldrive/cuid2';
import { notifications } from '../db/schema/notifications';
import { eq, and, sql } from 'drizzle-orm';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly dbService: DatabaseService) {}

  /** ✅ Create a new notification */
  async createNotification(dto: CreateNotificationDto) {
    const id = createId();
    let metadata: any = dto.metadata ?? null;

    // ✅ If metadata is accidentally a string, parse it
    if (typeof metadata === 'string') {
      try {
        metadata = JSON.parse(metadata);
      } catch {
        throw new BadRequestException(
          'Invalid metadata format, must be object or null',
        );
      }
    }
    const newNotif: any = {
      id,
      userId: dto.userId,
      orgId: dto.orgId && dto.orgId.trim() !== '' ? dto.orgId : null,
      type: dto.type,
      message: dto.message,
      level: dto.level ?? 'info',
      read: dto.read ?? false,
      metadata,
      expiresAt: dto.expiresAt ?? null,
    };

    if (dto.expiresAt) {
      newNotif.expiresAt = dto.expiresAt;
    }
    console.log('[DEBUG] typeof metadata:', typeof newNotif.metadata);
    console.log('[DEBUG] metadata value:', newNotif.metadata);
    console.log('[DEBUG] Final notification object:', newNotif);

    const query = this.dbService.db
      .insert(notifications)
      .values(newNotif)
      .toSQL();
    console.log('[DEBUG] SQL generated:', query.sql);
    console.log('[DEBUG] SQL params:', query.params);

    try {
      await this.dbService.db.insert(notifications).values(newNotif);
      console.log('[DEBUG] ✅ Insert success');
    } catch (err) {
      console.error('[DEBUG] ❌ Insert failed:', err.message);
      throw err;
    }

    return newNotif;
  }

  /** ✅ Update an existing notification */
  async updateNotification(id: string, dto: UpdateNotificationDto) {
    const updateData: any = {};

    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.message !== undefined) updateData.message = dto.message;
    if (dto.level !== undefined) updateData.level = dto.level;
    if (dto.read !== undefined) updateData.read = dto.read;
    if (dto.metadata !== undefined) updateData.metadata = dto.metadata;
    if (dto.expiresAt !== undefined) updateData.expiresAt = dto.expiresAt;
    if (dto.orgId !== undefined) updateData.orgId = dto.orgId;

    try {
      const result = await this.dbService.db
        .update(notifications)
        .set(updateData)
        .where(eq(notifications.id, id));

      if (!result) {
        throw new NotFoundException(`Notification with id ${id} not found`);
      }

      return { success: true, data: { id, ...updateData } };
    } catch (err: any) {
      throw new BadRequestException(
        `Failed to update notification: ${err.message}`,
      );
    }
  }

  /** ✅ Get notifications for a user */
  async getUserNotifications(userId: string, onlyUnread = false) {
    return await this.dbService.db
      .select()
      .from(notifications)
      .where(
        onlyUnread
          ? and(eq(notifications.userId, userId), eq(notifications.read, false))
          : eq(notifications.userId, userId),
      )
      .orderBy(sql`${notifications.createdAt} DESC`);
  }

  /** ✅ Mark a single notification as read */
  async markAsRead(notificationId: string) {
    const result = await this.dbService.db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, notificationId));

    if (!result) {
      throw new NotFoundException(
        `Notification with id ${notificationId} not found`,
      );
    }

    return { success: true };
  }

  /** ✅ Mark all notifications as read for a user */
  async markAllAsRead(userId: string) {
    await this.dbService.db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.userId, userId));

    return { success: true };
  }
}
