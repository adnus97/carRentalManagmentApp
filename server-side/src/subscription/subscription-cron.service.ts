// src/subscription/subscription-cron.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SubscriptionService } from './subscription.service';
import { DatabaseService } from 'src/db';
import { users } from 'src/db/schema/users';
import { eq, sql, and } from 'drizzle-orm';
import { EmailService } from 'src/email/email.service';
import { NotificationsService } from 'src/notifications/notifications.service';

@Injectable()
export class SubscriptionCronService {
  private readonly logger = new Logger(SubscriptionCronService.name);

  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly dbService: DatabaseService,
    private readonly emailService: EmailService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // Runs daily at 2 AM
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

      this.logger.log(`Expired ${result.length} subscription(s)`);

      // Notify each user about expiration
      for (const user of result) {
        if (user.email) {
          await this.emailService.sendEmail({
            recipients: [user.email],
            subject: '❌ Your Subscription Has Expired',
            html: this.getExpiredEmailTemplate(user.name || 'User'),
          });

          await this.notificationsService.createNotification({
            userId: user.id,
            category: 'SYSTEM',
            type: 'SYSTEM_MAINTENANCE',
            priority: 'URGENT',
            title: 'Subscription Expired',
            message: 'Your subscription has expired. Please renew to continue.',
            level: 'error',
          });
        }
      }

      // Notify admins if any subscriptions expired
      if (result.length > 0) {
        await this.notifyAdminsOfExpiredSubscriptions(result);
      }
    } catch (error) {
      this.logger.error('Failed to expire subscriptions:', error);
    }
  }

  // Runs daily at 9 AM
  @Cron('0 9 * * *')
  async sendExpiringReminders() {
    try {
      this.logger.log('Checking for expiring subscriptions...');
      const now = new Date();

      // Check for subscriptions expiring in 30, 7, and 3 days
      const thresholds = [30, 7, 3, 1];
      let totalNotified = 0;

      for (const days of thresholds) {
        const targetDate = new Date(now);
        targetDate.setDate(targetDate.getDate() + days);
        targetDate.setHours(0, 0, 0, 0);

        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);

        // Find users expiring on this specific day
        const expiringUsers = await this.dbService.db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            subscriptionEndDate: users.subscriptionEndDate,
          })
          .from(users)
          .where(
            and(
              eq(users.subscriptionStatus, 'active'),
              eq(users.role, 'user'),
              sql`${users.subscriptionEndDate} >= ${targetDate}`,
              sql`${users.subscriptionEndDate} < ${nextDay}`,
            ),
          );

        if (expiringUsers.length > 0) {
          this.logger.log(
            `Found ${expiringUsers.length} subscription(s) expiring in ${days} day(s)`,
          );

          for (const user of expiringUsers) {
            if (user.email) {
              await this.emailService.sendEmail({
                recipients: [user.email],
                subject: `⚠️ Your Subscription Expires in ${days} Day${days !== 1 ? 's' : ''}`,
                html: this.getExpiringReminderTemplate(
                  user.name || 'User',
                  days,
                  user.subscriptionEndDate!.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  }),
                ),
              });

              await this.notificationsService.createNotification({
                userId: user.id,
                category: 'SYSTEM',
                type: 'SYSTEM_MAINTENANCE',
                priority: days <= 3 ? 'URGENT' : days <= 7 ? 'HIGH' : 'MEDIUM',
                title: `Subscription Expiring Soon`,
                message: `Your subscription expires in ${days} day${days !== 1 ? 's' : ''} on ${user.subscriptionEndDate!.toLocaleDateString()}`,
                level: 'warning',
                metadata: {
                  daysRemaining: days,
                  expirationDate: user.subscriptionEndDate!.toISOString(),
                },
              });

              totalNotified++;
            }
          }
        }
      }

      this.logger.log(
        `Completed expiring reminders check - notified ${totalNotified} user(s)`,
      );
    } catch (error) {
      this.logger.error('Failed to send expiring reminders:', error);
    }
  }

  // Runs daily at 10 AM to notify admins
  @Cron('0 10 * * *')
  async notifyAdminsDaily() {
    try {
      this.logger.log('Sending daily admin notifications...');
      await this.subscriptionService.notifyAdminsOfExpiringSubscriptions();
      this.logger.log('Admin notifications sent successfully');
    } catch (error) {
      this.logger.error('Failed to send admin notifications:', error);
    }
  }

  // Helper methods

  private async notifyAdminsOfExpiredSubscriptions(expiredUsers: any[]) {
    const admins = await this.dbService.db
      .select()
      .from(users)
      .where(eq(users.role, 'super_admin'));

    for (const admin of admins) {
      if (admin.email) {
        await this.emailService.sendEmail({
          recipients: [admin.email],
          subject: `❌ ${expiredUsers.length} Subscription(s) Expired Today`,
          html: this.getAdminExpiredNotificationTemplate(
            admin.name || 'Admin',
            expiredUsers,
          ),
        });
      }

      await this.notificationsService.createNotification({
        userId: admin.id,
        category: 'SYSTEM',
        type: 'SYSTEM_MAINTENANCE',
        priority: 'HIGH',
        title: 'Subscriptions Expired',
        message: `${expiredUsers.length} subscription(s) expired today`,
        level: 'error',
        metadata: {
          count: expiredUsers.length,
          users: expiredUsers.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
          })),
        },
      });
    }
  }

  // Email templates

  private getExpiredEmailTemplate(userName: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', sans-serif; line-height: 1.6; color: #333; background: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #f56565 0%, #c53030 100%); color: white; padding: 40px 20px; text-align: center; }
          .content { padding: 40px 30px; }
          .button { display: inline-block; padding: 14px 35px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; background: #f8f9fa; color: #666; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>❌ Subscription Expired</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${userName}</strong>,</p>
            <p>Your subscription has expired. To continue using our services, please contact support to renew your subscription.</p>
            <div style="text-align: center;">
              <a href="${process.env.BETTER_AUTH_URL}/contact" class="button">Contact Support</a>
            </div>
          </div>
          <div class="footer">
            <p>Car Rental Manager &copy; ${new Date().getFullYear()}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getExpiringReminderTemplate(
    userName: string,
    daysRemaining: number,
    expirationDate: string,
  ): string {
    const urgencyColor =
      daysRemaining <= 3
        ? '#f56565'
        : daysRemaining <= 7
          ? '#ed8936'
          : '#ecc94b';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', sans-serif; line-height: 1.6; color: #333; background: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { background: ${urgencyColor}; color: white; padding: 40px 20px; text-align: center; }
          .content { padding: 40px 30px; }
          .alert-box { background: #fff5f5; border-left: 4px solid ${urgencyColor}; padding: 15px; margin: 20px 0; }
          .button { display: inline-block; padding: 14px 35px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; background: #f8f9fa; color: #666; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Subscription Expiring Soon</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${userName}</strong>,</p>
            <div class="alert-box">
              <strong>Your subscription expires in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}!</strong>
              <br/>Expiration Date: <strong>${expirationDate}</strong>
            </div>
            <p>To avoid interruption of service, please contact support to renew your subscription before it expires.</p>
            <div style="text-align: center;">
              <a href="${process.env.BETTER_AUTH_URL}/contact" class="button">Renew Subscription</a>
            </div>
          </div>
          <div class="footer">
            <p>Car Rental Manager &copy; ${new Date().getFullYear()}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getAdminExpiredNotificationTemplate(
    adminName: string,
    expiredUsers: any[],
  ): string {
    const usersList = expiredUsers
      .map(
        (u) => `<li><strong>${u.name || 'Unknown'}</strong> (${u.email})</li>`,
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 20px auto; padding: 20px; background: white; border-radius: 8px; }
          ul { background: #f7fafc; padding: 20px; border-radius: 6px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>❌ ${expiredUsers.length} Subscription(s) Expired Today</h2>
          <p>Hi ${adminName},</p>
          <p>The following subscriptions expired today:</p>
          <ul>${usersList}</ul>
          <p>Please follow up with these users for renewal.</p>
          <a href="${process.env.BETTER_AUTH_URL}/admin/dashboard" class="button">View Admin Dashboard</a>
        </div>
      </body>
      </html>
    `;
  }
}
