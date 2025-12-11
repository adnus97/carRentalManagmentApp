// src/subscription/subscription-admin.controller.ts
import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  Inject,
} from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { Auth } from 'src/auth/auth.guard';
import { SuperAdmin } from 'src/auth/super-admin.guard';

@Auth()
@SuperAdmin()
@Controller('admin')
export class SubscriptionAdminController {
  constructor(
    @Inject(SubscriptionService)
    private readonly subscriptionService: SubscriptionService,
  ) {
    console.log('🔧 SubscriptionAdminController constructor called');
    console.log('🔧 SubscriptionService injected:', !!this.subscriptionService);
  }

  // Dashboard stats
  @Get('stats')
  async getDashboardStats() {
    console.log('📊 SubscriptionAdmin stats endpoint hit');
    return this.subscriptionService.getDashboardStats();
  }

  // Get all users
  @Get('users')
  async getAllUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.subscriptionService.getAllUsers(page, limit, status, search);
  }

  // Get expiring subscriptions
  @Get('users-expiring')
  async getExpiringSubscriptions(
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.subscriptionService.getExpiringSubscriptions(days);
  }

  // Activate subscription
  @Post('users/:userId/activate')
  async activateSubscription(
    @Param('userId') userId: string,
    @Body() body: { years?: number },
  ) {
    const years = body?.years || 1;
    return this.subscriptionService.activateSubscription(userId, years);
  }

  // Deactivate subscription
  @Post('users/:userId/deactivate')
  async deactivateSubscription(@Param('userId') userId: string) {
    return this.subscriptionService.deactivateSubscription(userId);
  }

  // Get subscription status
  @Get('users/:userId/subscription')
  async getSubscriptionStatus(@Param('userId') userId: string) {
    return this.subscriptionService.getSubscriptionStatus(userId);
  }

  // Manual trigger to notify admins about expiring subscriptions
  @Post('notify-expiring')
  async notifyAdminsOfExpiring() {
    await this.subscriptionService.notifyAdminsOfExpiringSubscriptions();
    return { success: true, message: 'Admin notifications sent' };
  }
}
