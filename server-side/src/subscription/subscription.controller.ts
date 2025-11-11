// src/subscription/subscription.controller.ts
import { Controller, Get } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { Auth, CurrentUser, CustomUser } from 'src/auth/auth.guard';

@Auth()
@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('status')
  async getMySubscriptionStatus(@CurrentUser() user: CustomUser) {
    return this.subscriptionService.getSubscriptionStatus(user.id);
  }
}
