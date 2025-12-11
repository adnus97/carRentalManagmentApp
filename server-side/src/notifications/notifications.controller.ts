// src/notifications/notifications.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  BadRequestException,
  ValidationPipe,
  Post,
  Put,
  Inject,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { Auth, CurrentUser, CustomUser } from 'src/auth/auth.guard';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';

@Auth() // ✅ protect all routes with AuthGuard
@Controller('notifications')
export class NotificationsController {
  constructor(
    @Inject(NotificationsService)
    private readonly notificationsService: NotificationsService,
  ) {}

  /** Helper to ensure JSON-safe responses */
  @Get()
  async getNotifications(
    @CurrentUser() user: CustomUser,
    @Query(ValidationPipe) query: NotificationQueryDto,
  ) {
    // Transform query to match service expectations
    const serviceOptions = {
      category: query.category,
      unread: query.unread,
      priority: query.priority,
      page: query.page || 1,
      limit: query.limit || 20,
    };

    return this.notificationsService.getUserNotifications(
      user.id,
      serviceOptions,
    );
  }

  /**
   * Get notification summary
   */
  @Get('summary')
  async getNotificationSummary(@CurrentUser() user: CustomUser) {
    return this.notificationsService.getNotificationSummary(user.id);
  }

  /**
   * Get user preferences
   */
  @Get('preferences')
  async getPreferences(@CurrentUser() user: CustomUser) {
    return this.notificationsService.getUserPreferences(user.id);
  }

  /**
   * Update user preferences
   */
  @Put('preferences')
  async updatePreferences(
    @CurrentUser() user: CustomUser,
    @Body(ValidationPipe) dto: UpdateNotificationPreferencesDto,
  ) {
    return this.notificationsService.updateUserPreferences(user.id, dto);
  }

  /**
   * Mark specific notification as read
   */
  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @CurrentUser() user: CustomUser) {
    return this.notificationsService.markAsRead(id, user.id);
  }

  /**
   * Mark all notifications as read
   */
  @Post('mark-all-read')
  async markAllAsRead(@CurrentUser() user: CustomUser) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  /**
   * Dismiss notification
   */
  @Patch(':id/dismiss')
  async dismissNotification(
    @Param('id') id: string,
    @CurrentUser() user: CustomUser,
  ) {
    return this.notificationsService.dismissNotification(id, user.id);
  }

  /**
   * Create notification (for testing)
   */
  @Post()
  async createNotification(@Body(ValidationPipe) dto: CreateNotificationDto) {
    return this.notificationsService.createNotification(dto);
  }

  /**
   * Test notification endpoint
   */
  @Post('test')
  async testNotification(@CurrentUser() user: CustomUser) {
    return this.notificationsService.createNotification({
      userId: user.id,
      category: 'SYSTEM',
      type: 'SYSTEM_MAINTENANCE',
      priority: 'MEDIUM',
      title: 'Test Notification',
      message: 'This is a test notification from the enhanced system',
      actionUrl: '/dashboard',
      actionLabel: 'Go to Dashboard',
    });
  }
}
