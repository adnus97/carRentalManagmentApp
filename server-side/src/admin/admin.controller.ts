// src/admin/admin.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { Auth, CurrentUser, CustomUser } from 'src/auth/auth.guard';
import { SuperAdmin } from 'src/auth/super-admin.guard';
import { AdminService } from './admin.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { request } from 'express';

@Auth()
@SuperAdmin() // ✅ Only super admins can access these routes
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  /**
   * Get all users with pagination and filters
   * GET /admin/users?page=1&limit=20&status=active
   */
  @Get('users')
  async getAllUsers(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getAllUsers(page, limit, status, search);
  }

  /**
   * Get user details
   * GET /admin/users/:userId
   */
  @Get('users/:userId')
  async getUserDetails(@Param('userId') userId: string) {
    return this.adminService.getUserDetails(userId);
  }

  /**
   * Activate user subscription
   * POST /admin/users/:userId/activate
   */
  @Post('users/:userId/activate')
  async activateSubscription(
    @Param('userId') userId: string,
    @Body('years') years: number = 1,
    @CurrentUser() admin: CustomUser,
  ) {
    return this.subscriptionService.activateSubscription(userId, years);
  }

  /**
   * Deactivate user subscription
   * POST /admin/users/:userId/deactivate
   */
  @Post('users/:userId/deactivate')
  async deactivateSubscription(@Param('userId') userId: string) {
    return this.subscriptionService.deactivateSubscription(userId);
  }

  /**
   * Get user subscription status
   * GET /admin/users/:userId/subscription
   */
  @Get('users/:userId/subscription')
  async getUserSubscription(@Param('userId') userId: string) {
    return this.subscriptionService.getSubscriptionStatus(userId);
  }

  /**
   * Get users with expiring subscriptions
   * GET /admin/users/expiring?days=30
   */
  @Get('users-expiring')
  async getExpiringSubscriptions(@Query('days') days: number = 30) {
    return this.adminService.getExpiringSubscriptions(days);
  }

  /**
   * Get dashboard statistics
   * GET /admin/stats
   */
  @Get('stats')
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  /**
   * Update user role (promote to super admin)
   * PATCH /admin/users/:userId/role
   */
  @Patch('users/:userId/role')
  async updateUserRole(
    @Param('userId') userId: string,
    @Body('role') role: 'user' | 'super_admin',
  ) {
    return this.adminService.updateUserRole(userId, role);
  }

  /**
   * Delete user account (soft delete)
   * DELETE /admin/users/:userId
   */
  @Delete('users/:userId')
  async deleteUser(@Param('userId') userId: string) {
    return this.adminService.deleteUser(userId);
  }
}
