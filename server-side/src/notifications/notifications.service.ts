// src/notifications/notifications.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  Inject,
} from '@nestjs/common';
import { customers, DatabaseService, users } from '../db';
import { createId } from '@paralleldrive/cuid2';
import {
  notifications,
  userNotificationPreferences,
} from '../db/schema/notifications';
import { eq, and, sql, desc } from 'drizzle-orm';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import {
  NotificationCategory,
  NotificationPreferences,
  NotificationPriority,
  NotificationSummary,
} from 'src/types/notification.types';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject(DatabaseService) private readonly dbService: DatabaseService, // Add @Inject()
  ) {}

  /**
   * Create a new notification
   */
  async createNotification(dto: CreateNotificationDto) {
    try {
      // Validate user exists
      const userExists = await this.validateUserExists(dto.userId);
      if (!userExists) {
        this.logger.warn(`User ${dto.userId} not found, skipping notification`);
        return null;
      }

      // Check user preferences
      const userPrefs = await this.getUserPreferences(dto.userId);

      // Skip if category is disabled
      if (!userPrefs.categories[dto.category]) {
        this.logger.debug(
          `Category ${dto.category} disabled for user ${dto.userId}`,
        );
        return null;
      }

      const id = createId();

      const notificationData = {
        id,
        userId: dto.userId,
        orgId: dto.orgId || null,
        category: dto.category,
        type: dto.type,
        priority: dto.priority || 'MEDIUM',
        title: dto.title,
        message: dto.message,
        level: dto.level || 'info',
        actionUrl: dto.actionUrl || null,
        actionLabel: dto.actionLabel || null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        metadata: dto.metadata || null,
        read: false,
        dismissed: false,
        emailSent: false,
      };

      await this.dbService.db.insert(notifications).values(notificationData);

      // Send email for high priority notifications if enabled
      if (
        userPrefs.emailEnabled &&
        ['HIGH', 'URGENT'].includes(dto.priority || 'MEDIUM')
      ) {
        await this.scheduleEmailNotification(dto.userId, notificationData);
      }

      this.logger.debug(`Notification created: ${id} for user ${dto.userId}`);
      return notificationData;
    } catch (error) {
      this.logger.error('Failed to create notification:', error);
      throw new BadRequestException('Failed to create notification');
    }
  }

  /**
   * Get user notifications with filtering
   */
  async getUserNotifications(
    userId: string,
    options: {
      category?: NotificationCategory;
      unread?: boolean;
      priority?: NotificationPriority;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const { category, unread, priority, page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    const conditions = [
      eq(notifications.userId, userId),
      eq(notifications.dismissed, false),
    ];

    if (category) conditions.push(eq(notifications.category, category));
    if (unread) conditions.push(eq(notifications.read, false));
    if (priority) conditions.push(eq(notifications.priority, priority));

    // Get total count
    const [{ count: totalCount }] = await this.dbService.db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(...conditions));

    // Get paginated data
    const data = await this.dbService.db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      data: this.safeReturn(data),
      page,
      limit,
      total: Number(totalCount),
      totalPages: Math.ceil(Number(totalCount) / limit),
    };
  }

  /**
   * Get notification summary
   */
  async getNotificationSummary(userId: string): Promise<NotificationSummary> {
    // Get overall counts
    const [{ total }] = await this.dbService.db
      .select({ total: sql<number>`count(*)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.dismissed, false),
        ),
      );

    const [{ unread }] = await this.dbService.db
      .select({ unread: sql<number>`count(*)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.read, false),
          eq(notifications.dismissed, false),
        ),
      );

    // Get counts by category
    const categoryData = await this.dbService.db
      .select({
        category: notifications.category,
        count: sql<number>`count(*)`,
      })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.read, false),
          eq(notifications.dismissed, false),
        ),
      )
      .groupBy(notifications.category);

    // Get counts by priority
    const priorityData = await this.dbService.db
      .select({
        priority: notifications.priority,
        count: sql<number>`count(*)`,
      })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.read, false),
          eq(notifications.dismissed, false),
        ),
      )
      .groupBy(notifications.priority);

    const byCategory = categoryData.reduce(
      (acc, item) => {
        acc[item.category as NotificationCategory] = Number(item.count);
        return acc;
      },
      {} as Record<NotificationCategory, number>,
    );

    const byPriority = priorityData.reduce(
      (acc, item) => {
        acc[item.priority as NotificationPriority] = Number(item.count);
        return acc;
      },
      {} as Record<NotificationPriority, number>,
    );

    return {
      total: Number(total),
      unread: Number(unread),
      byCategory,
      byPriority,
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string) {
    const result = await this.dbService.db
      .update(notifications)
      .set({
        read: true,
        readAt: new Date(),
      })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId),
        ),
      );

    return { success: true };
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string) {
    await this.dbService.db
      .update(notifications)
      .set({
        read: true,
        readAt: new Date(),
      })
      .where(
        and(eq(notifications.userId, userId), eq(notifications.read, false)),
      );

    return { success: true };
  }

  /**
   * Dismiss notification
   */
  async dismissNotification(notificationId: string, userId: string) {
    await this.dbService.db
      .update(notifications)
      .set({ dismissed: true })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId),
        ),
      );

    return { success: true };
  }

  /**
   * Get user notification preferences
   */
  async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    const [prefs] = await this.dbService.db
      .select()
      .from(userNotificationPreferences)
      .where(eq(userNotificationPreferences.userId, userId));

    const defaultCategories: Record<NotificationCategory, boolean> = {
      RENTAL: true,
      PAYMENT: true,
      CUSTOMER: true,
      CAR: true,
      MAINTENANCE: true,
      FINANCIAL: true,
      SYSTEM: true,
    };

    if (!prefs) {
      return {
        emailEnabled: true,
        pushEnabled: true,
        categories: defaultCategories,
      };
    }

    return {
      emailEnabled: prefs.emailEnabled,
      pushEnabled: prefs.pushEnabled,
      categories: {
        ...defaultCategories,
        ...prefs.categoryPreferences,
      },
      quietHours:
        prefs.quietHoursStart && prefs.quietHoursEnd
          ? {
              start: prefs.quietHoursStart,
              end: prefs.quietHoursEnd,
            }
          : undefined,
    };
  }
  /**
   * Update user notification preferences
   */
  async updateUserPreferences(
    userId: string,
    dto: UpdateNotificationPreferencesDto,
  ) {
    const existingPrefs = await this.dbService.db
      .select()
      .from(userNotificationPreferences)
      .where(eq(userNotificationPreferences.userId, userId));

    const updateData = {
      ...(dto.emailEnabled !== undefined && { emailEnabled: dto.emailEnabled }),
      ...(dto.pushEnabled !== undefined && { pushEnabled: dto.pushEnabled }),
      ...(dto.categories && { categoryPreferences: dto.categories }),
      ...(dto.quietHours && {
        quietHoursStart: dto.quietHours.start,
        quietHoursEnd: dto.quietHours.end,
      }),
      updatedAt: new Date(),
    };

    if (existingPrefs.length === 0) {
      await this.dbService.db.insert(userNotificationPreferences).values({
        id: createId(),
        userId,
        ...updateData,
        createdAt: new Date(),
      });
    } else {
      await this.dbService.db
        .update(userNotificationPreferences)
        .set(updateData)
        .where(eq(userNotificationPreferences.userId, userId));
    }

    return { success: true };
  }
  /**
   * Clean up old notifications
   */
  async cleanupOldNotifications(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.dbService.db
      .delete(notifications)
      .where(
        and(
          sql`${notifications.createdAt} < ${cutoffDate}`,
          eq(notifications.read, true),
        ),
      );

    this.logger.log(`Cleaned up old notifications older than ${daysOld} days`);
    return { success: true };
  }

  // Helper methods
  private async validateUserExists(userId: string): Promise<boolean> {
    try {
      const [user] = await this.dbService.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      return !!user;
    } catch {
      return false;
    }
  }

  private async scheduleEmailNotification(userId: string, notification: any) {
    // Here you would integrate with your email service
    // For now, just log and mark as sent
    this.logger.log(
      `Email scheduled for user ${userId}: ${notification.title}`,
    );

    await this.dbService.db
      .update(notifications)
      .set({ emailSent: true })
      .where(eq(notifications.id, notification.id));
  }

  private safeReturn<T>(data: T): T {
    return JSON.parse(JSON.stringify(data));
  }
}
