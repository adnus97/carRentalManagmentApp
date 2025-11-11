// src/subscription/subscription.service.ts
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { DatabaseService } from 'src/db';
import { users } from 'src/db/schema/users';
import { eq, lte, and, sql } from 'drizzle-orm';
import { EmailService } from 'src/email/email.service';
import { NotificationsService } from 'src/notifications/notifications.service';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private readonly dbService: DatabaseService,
    private readonly emailService: EmailService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async activateSubscription(userId: string, years = 1) {
    try {
      const now = new Date();
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + years);

      await this.dbService.db
        .update(users)
        .set({
          subscriptionStatus: 'active',
          subscriptionStartDate: now,
          subscriptionEndDate: endDate,
          subscriptionType: 'yearly',
          updatedAt: now,
        })
        .where(eq(users.id, userId));

      const [user] = await this.dbService.db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      if (user) {
        await this.emailService.sendEmail({
          recipients: [user.email],
          subject: '🎉 Your Subscription Has Been Activated!',
          html: this.getActivationEmailTemplate(
            user.name,
            endDate.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }),
          ),
        });

        await this.notificationsService.createNotification({
          userId,
          category: 'SYSTEM',
          type: 'SYSTEM_MAINTENANCE',
          priority: 'HIGH',
          title: 'Subscription Activated',
          message: `Your subscription is now active until ${endDate.toLocaleDateString()}`,
          level: 'success',
          metadata: { subscriptionEndDate: endDate.toISOString() },
        });
      }

      this.logger.log(
        `Activated subscription for user ${userId} until ${endDate.toISOString()}`,
      );

      return {
        success: true,
        message: `Subscription activated for ${years} year(s)`,
        endDate,
      };
    } catch (error) {
      this.logger.error('Failed to activate subscription:', error);
      throw new BadRequestException('Failed to activate subscription');
    }
  }

  async deactivateSubscription(userId: string) {
    try {
      this.logger.log(`[DEACTIVATE] Starting for userId: ${userId}`);

      await this.dbService.db
        .update(users)
        .set({
          subscriptionStatus: 'inactive',
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      this.logger.log(`[DEACTIVATE] Database updated successfully`);

      const [user] = await this.dbService.db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      this.logger.log(`[DEACTIVATE] User fetched:`, JSON.stringify(user));

      if (!user) {
        throw new BadRequestException('User not found');
      }

      if (!user.email) {
        this.logger.warn(`User ${userId} has no email address`);
        return {
          success: true,
          message: 'Subscription deactivated (no notification sent)',
          userId,
        };
      }

      this.logger.log(`[DEACTIVATE] About to send email to: ${user.email}`);

      await this.emailService.sendEmail({
        recipients: [user.email],
        subject: '⚠️ Your Subscription Has Been Deactivated',
        html: this.getDeactivationEmailTemplate(user.name || 'User'),
      });

      this.logger.log(`[DEACTIVATE] Email sent successfully`);

      await this.notificationsService.createNotification({
        userId,
        category: 'SYSTEM',
        type: 'SYSTEM_MAINTENANCE',
        priority: 'URGENT',
        title: 'Subscription Deactivated',
        message: 'Your subscription has been deactivated',
        level: 'error',
      });

      this.logger.log(`[DEACTIVATE] Notification created successfully`);

      return {
        success: true,
        message: 'Subscription deactivated successfully',
        userId,
      };
    } catch (error) {
      this.logger.error('[DEACTIVATE] Error occurred:', error);
      this.logger.error('[DEACTIVATE] Error stack:', error.stack);
      throw new BadRequestException('Failed to deactivate subscription');
    }
  }
  async getSubscriptionStatus(userId: string) {
    const [user] = await this.dbService.db
      .select({
        subscriptionStatus: users.subscriptionStatus,
        subscriptionStartDate: users.subscriptionStartDate,
        subscriptionEndDate: users.subscriptionEndDate,
        subscriptionType: users.subscriptionType,
      })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const now = new Date();
    const daysRemaining = user.subscriptionEndDate
      ? Math.ceil(
          (user.subscriptionEndDate.getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : 0;

    return {
      ...user,
      daysRemaining,
      isExpired: user.subscriptionEndDate
        ? user.subscriptionEndDate < now
        : true,
      needsRenewal: daysRemaining <= 30 && daysRemaining > 0,
    };
  }

  async getExpiringSubscriptions(daysThreshold: number) {
    const now = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

    return this.dbService.db
      .select()
      .from(users)
      .where(
        and(
          eq(users.subscriptionStatus, 'active'),
          lte(users.subscriptionEndDate, thresholdDate),
          sql`${users.subscriptionEndDate} >= ${now}`,
        ),
      );
  }

  async sendExpiringNotification(
    userId: string,
    user: any,
    daysRemaining: number,
  ) {
    try {
      await this.emailService.sendEmail({
        recipients: [user.email],
        subject: `⏰ Your subscription expires in ${daysRemaining} days`,
        html: this.getExpiringEmailTemplate(
          user.name,
          daysRemaining,
          user.subscriptionEndDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
        ),
      });

      await this.notificationsService.createNotification({
        userId,
        category: 'SYSTEM',
        type: 'SYSTEM_MAINTENANCE',
        priority: daysRemaining <= 7 ? 'URGENT' : 'HIGH',
        title: 'Subscription Expiring Soon',
        message: `Your subscription will expire in ${daysRemaining} days. Please renew to continue service.`,
        level: 'warning',
        metadata: {
          daysRemaining,
          expiryDate: user.subscriptionEndDate.toISOString(),
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to send expiring notification for user ${userId}:`,
        error,
      );
    }
  }

  private getActivationEmailTemplate(
    userName: string,
    endDate: string,
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; }
          .content { padding: 40px 30px; }
          .info-box { background: #f8f9fa; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .button { display: inline-block; padding: 14px 35px; background: #667eea; color: white !important; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
          .footer { text-align: center; padding: 20px; background: #f8f9fa; color: #666; font-size: 13px; }
          .emoji { font-size: 48px; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="emoji">🎉</div>
            <h1>Subscription Activated!</h1>
          </div>
          <div class="content">
            <p style="font-size: 16px;">Hi <strong>${userName}</strong>,</p>
            <p>Your subscription has been activated until <strong>${endDate}</strong>.</p>
            <div style="text-align: center;">
              <a href="${process.env.BETTER_AUTH_URL}/dashboard" class="button">Go to Dashboard</a>
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

  private getDeactivationEmailTemplate(userName: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head><style>body { font-family: Arial, sans-serif; }</style></head>
      <body>
        <h2>Subscription Deactivated</h2>
        <p>Hi ${userName},</p>
        <p>Your subscription has been deactivated.</p>
      </body>
      </html>
    `;
  }

  private getExpiringEmailTemplate(
    userName: string,
    daysRemaining: number,
    endDate: string,
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head><style>body { font-family: Arial, sans-serif; }</style></head>
      <body>
        <h2>Subscription Expiring Soon</h2>
        <p>Hi ${userName},</p>
        <p>Your subscription expires in ${daysRemaining} days on ${endDate}.</p>
      </body>
      </html>
    `;
  }
}
