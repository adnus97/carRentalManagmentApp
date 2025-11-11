// src/subscription/subscription-cron.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SubscriptionService } from './subscription.service';
import { DatabaseService } from 'src/db';
import { users } from 'src/db/schema/users';
import { eq, sql, and } from 'drizzle-orm';

@Injectable()
export class SubscriptionCronService {
  private readonly logger = new Logger(SubscriptionCronService.name);

  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly dbService: DatabaseService,
  ) {}

  @Cron('0 2 * * *')
  async expireSubscriptions() {
    try {
      this.logger.log('Running subscription expiry check...');

      const now = new Date();

      const result = await this.dbService.db
        .update(users)
        .set({
          subscriptionStatus: 'expired',
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(users.subscriptionStatus, 'active'),
            sql`${users.subscriptionEndDate} < ${now}`,
          ),
        )
        .returning({ id: users.id, email: users.email, name: users.name });

      this.logger.log(`Expired ${result.length} subscriptions`);

      for (const user of result) {
        await this.subscriptionService.deactivateSubscription(user.id);
      }
    } catch (error) {
      this.logger.error('Failed to expire subscriptions:', error);
    }
  }

  @Cron('0 9 * * *')
  async sendExpiringReminders() {
    try {
      this.logger.log('Checking for expiring subscriptions...');

      const now = new Date();
      const thresholds = [30, 7, 3];

      for (const days of thresholds) {
        const expiringUsers =
          await this.subscriptionService.getExpiringSubscriptions(days);

        for (const user of expiringUsers) {
          const daysRemaining = Math.ceil(
            (user.subscriptionEndDate!.getTime() - now.getTime()) /
              (1000 * 60 * 60 * 24),
          );

          if (daysRemaining === days) {
            await this.subscriptionService.sendExpiringNotification(
              user.id,
              user,
              daysRemaining,
            );
          }
        }
      }

      this.logger.log('Completed expiring reminders check');
    } catch (error) {
      this.logger.error('Failed to send expiring reminders:', error);
    }
  }
}
