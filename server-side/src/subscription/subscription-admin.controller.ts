// src/subscription/subscription-admin.controller.ts
import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { Auth } from 'src/auth/auth.guard';
import { SuperAdmin } from 'src/auth/super-admin.guard';

@Auth()
@SuperAdmin()
@Controller('admin/subscription')
export class SubscriptionAdminController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Post(':userId/activate')
  async activateSubscription(
    @Param('userId') userId: string,
    @Body('years') years: number = 1,
  ) {
    return this.subscriptionService.activateSubscription(userId, years);
  }

  @Post(':userId/deactivate')
  async deactivateSubscription(@Param('userId') userId: string) {
    return this.subscriptionService.deactivateSubscription(userId);
  }

  @Get(':userId/status')
  async getSubscriptionStatus(@Param('userId') userId: string) {
    return this.subscriptionService.getSubscriptionStatus(userId);
  }
}
