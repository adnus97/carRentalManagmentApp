// src/notifications/notifications.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { Auth, CurrentUser, CustomUser } from 'src/auth/auth.guard';

@Auth() // ✅ protect all routes with AuthGuard
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /** Helper to ensure JSON-safe responses */
  private safeReturn<T>(data: T): T {
    return JSON.parse(JSON.stringify(data));
  }

  /** Centralized error handler */
  private handleControllerError(error: any): never {
    if (error instanceof BadRequestException) throw error;
    if (error.getStatus && error.getResponse) throw error;
    throw new BadRequestException(
      error?.message || 'An unexpected error occurred',
    );
  }

  /**
   * GET /notifications?unread=true
   * Fetch notifications for the current user
   */
  @Get()
  async getUserNotifications(
    @CurrentUser() user: CustomUser,
    @Query('unread') unread?: string,
  ) {
    try {
      return this.safeReturn(
        await this.notificationsService.getUserNotifications(
          user.id,
          unread === 'true',
        ),
      );
    } catch (error) {
      this.handleControllerError(error);
    }
  }

  /**
   * PATCH /notifications/:id/read
   * Mark a single notification as read
   */
  @Patch(':id/read')
  async markAsRead(@Param('id') id: string) {
    try {
      return this.safeReturn(await this.notificationsService.markAsRead(id));
    } catch (error) {
      this.handleControllerError(error);
    }
  }

  /**
   * PATCH /notifications/read-all
   * Mark all notifications as read for the current user
   */
  @Patch('read-all')
  async markAllAsRead(@CurrentUser() user: CustomUser) {
    try {
      return this.safeReturn(
        await this.notificationsService.markAllAsRead(user.id),
      );
    } catch (error) {
      this.handleControllerError(error);
    }
  }
}
