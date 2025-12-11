// src/subscription/subscription.service.ts
import {
  Injectable,
  Logger,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { DatabaseService } from 'src/db';
import { users } from 'src/db/schema/users';
import { eq, lte, and, sql, like, or } from 'drizzle-orm';
import { EmailService } from 'src/email/email.service';
import { NotificationsService } from 'src/notifications/notifications.service';

const SUBSCRIPTION_PRICE_MAD = 1500; // Price per yearly subscription

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    @Inject(DatabaseService) private readonly dbService: DatabaseService, // Add @Inject()
    @Inject(EmailService) private readonly emailService: EmailService, // Add @Inject()
    @Inject(NotificationsService)
    private readonly notificationsService: NotificationsService, // Add @Inject()
  ) {
    console.log('🔧 SubscriptionService constructor called');
    console.log('🔧 DatabaseService injected:', !!this.dbService);
    console.log('🔧 DatabaseService.db exists:', !!this.dbService?.db);
    console.log('🔧 EmailService injected:', !!this.emailService);
    console.log(
      '🔧 NotificationsService injected:',
      !!this.notificationsService,
    );
  }

  // ==================== USER MANAGEMENT ====================

  async getAllUsers(
    page: number = 1,
    limit: number = 10,
    status?: string,
    search?: string,
  ) {
    const offset = (page - 1) * limit;
    const conditions = [eq(users.role, 'user')];

    if (status) {
      conditions.push(eq(users.subscriptionStatus, status));
    }

    if (search) {
      conditions.push(
        or(like(users.name, `%${search}%`), like(users.email, `%${search}%`)),
      );
    }

    const [{ count }] = await this.dbService.db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(and(...conditions));

    const usersList = await this.dbService.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        emailVerified: users.emailVerified,
        image: users.image,
        role: users.role,
        subscriptionStatus: users.subscriptionStatus,
        subscriptionStartDate: users.subscriptionStartDate,
        subscriptionEndDate: users.subscriptionEndDate,
        subscriptionType: users.subscriptionType,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(and(...conditions))
      .orderBy(sql`${users.createdAt} DESC`)
      .limit(limit)
      .offset(offset);

    const now = new Date();
    const enrichedUsers = usersList.map((user) => {
      const daysRemaining = user.subscriptionEndDate
        ? Math.ceil(
            (user.subscriptionEndDate.getTime() - now.getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : 0;

      return {
        ...user,
        daysRemaining,
        isExpired:
          user.subscriptionStatus === 'expired' ||
          (user.subscriptionEndDate && user.subscriptionEndDate < now),
        needsRenewal: daysRemaining <= 30 && daysRemaining > 0,
      };
    });

    return {
      data: enrichedUsers,
      page,
      limit,
      total: Number(count),
      totalPages: Math.ceil(Number(count) / limit),
      hasMore: page * limit < Number(count),
    };
  }

  async getDashboardStats() {
    const now = new Date();

    // User statistics
    const [userStats] = await this.dbService.db
      .select({
        totalUsers: sql<number>`COUNT(*)`,
        activeSubscriptions: sql<number>`COUNT(*) FILTER (WHERE ${users.subscriptionStatus} = 'active')`,
        expiredSubscriptions: sql<number>`COUNT(*) FILTER (WHERE ${users.subscriptionStatus} = 'expired')`,
        inactiveSubscriptions: sql<number>`COUNT(*) FILTER (WHERE ${users.subscriptionStatus} = 'inactive')`,
      })
      .from(users)
      .where(eq(users.role, 'user'));

    // Calculate subscription revenue (1500 MAD per active subscription)
    const activeSubscriptions = userStats?.activeSubscriptions || 0;
    const subscriptionRevenue = activeSubscriptions * SUBSCRIPTION_PRICE_MAD;

    // Expiring soon
    const [expiringSoon] = await this.dbService.db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(users)
      .where(
        and(
          eq(users.subscriptionStatus, 'active'),
          eq(users.role, 'user'),
          sql`${users.subscriptionEndDate} <= ${new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)}`,
          sql`${users.subscriptionEndDate} >= ${now}`,
        ),
      );

    // New users this month
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [newUsersThisMonth] = await this.dbService.db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(users)
      .where(
        and(
          eq(users.role, 'user'),
          sql`${users.createdAt} >= ${firstDayOfMonth}`,
        ),
      );

    return {
      users: userStats || {
        totalUsers: 0,
        activeSubscriptions: 0,
        expiredSubscriptions: 0,
        inactiveSubscriptions: 0,
      },
      subscriptions: {
        expiringSoon: expiringSoon?.count || 0,
        newUsersThisMonth: newUsersThisMonth?.count || 0,
      },
      revenue: {
        totalRevenue: subscriptionRevenue,
        pricePerSubscription: SUBSCRIPTION_PRICE_MAD,
        currency: 'MAD',
        activeSubscriptions,
      },
    };
  }

  async getExpiringSubscriptions(daysThreshold: number = 30) {
    const now = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

    const expiringUsers = await this.dbService.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        subscriptionEndDate: users.subscriptionEndDate,
        subscriptionStatus: users.subscriptionStatus,
      })
      .from(users)
      .where(
        and(
          eq(users.subscriptionStatus, 'active'),
          lte(users.subscriptionEndDate, thresholdDate),
          sql`${users.subscriptionEndDate} >= ${now}`,
          eq(users.role, 'user'),
        ),
      )
      .orderBy(users.subscriptionEndDate);

    return expiringUsers.map((user) => {
      const daysRemaining = Math.ceil(
        (user.subscriptionEndDate!.getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24),
      );

      return {
        ...user,
        daysRemaining,
        urgency:
          daysRemaining <= 3
            ? 'critical'
            : daysRemaining <= 7
              ? 'high'
              : 'medium',
      };
    });
  }

  // ==================== SUBSCRIPTION ACTIONS ====================

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

      if (!user) {
        throw new BadRequestException('User not found');
      }

      if (user.email) {
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

      // Notify all admins
      await this.notifyAdminsOfSubscriptionChange(user, 'activated', endDate);

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
      await this.dbService.db
        .update(users)
        .set({
          subscriptionStatus: 'inactive',
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      const [user] = await this.dbService.db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        throw new BadRequestException('User not found');
      }

      if (user.email) {
        await this.emailService.sendEmail({
          recipients: [user.email],
          subject: '⚠️ Your Subscription Has Been Deactivated',
          html: this.getDeactivationEmailTemplate(user.name || 'User'),
        });

        await this.notificationsService.createNotification({
          userId,
          category: 'SYSTEM',
          type: 'SYSTEM_MAINTENANCE',
          priority: 'URGENT',
          title: 'Subscription Deactivated',
          message: 'Your subscription has been deactivated',
          level: 'error',
        });
      }

      // Notify admins
      await this.notifyAdminsOfSubscriptionChange(user, 'deactivated');

      return {
        success: true,
        message: 'Subscription deactivated successfully',
        userId,
      };
    } catch (error) {
      this.logger.error('Failed to deactivate subscription:', error);
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

  // ==================== NOTIFICATIONS ====================

  async notifyAdminsOfExpiringSubscriptions() {
    const expiringUsers = await this.getExpiringSubscriptions(30);
    const admins = await this.getAdminUsers();

    if (expiringUsers.length === 0 || admins.length === 0) {
      return;
    }

    const criticalExpiring = expiringUsers.filter(
      (u) => u.urgency === 'critical',
    );
    const highExpiring = expiringUsers.filter((u) => u.urgency === 'high');

    for (const admin of admins) {
      // Send email
      if (admin.email) {
        await this.emailService.sendEmail({
          recipients: [admin.email],
          subject: `⚠️ ${expiringUsers.length} Subscription(s) Expiring Soon`,
          html: this.getAdminExpiringNotificationTemplate(
            admin.name,
            expiringUsers,
          ),
        });
      }

      // Create in-app notification
      await this.notificationsService.createNotification({
        userId: admin.id,
        category: 'SYSTEM',
        type: 'SYSTEM_MAINTENANCE',
        priority: criticalExpiring.length > 0 ? 'URGENT' : 'HIGH',
        title: 'Subscriptions Expiring Soon',
        message: `${expiringUsers.length} subscription(s) expiring within 30 days. ${criticalExpiring.length} critical (≤3 days), ${highExpiring.length} high (≤7 days)`,
        level: 'warning',
        metadata: {
          totalExpiring: expiringUsers.length,
          critical: criticalExpiring.length,
          high: highExpiring.length,
          users: expiringUsers.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            daysRemaining: u.daysRemaining,
          })),
        },
      });
    }

    this.logger.log(
      `Notified ${admins.length} admin(s) about ${expiringUsers.length} expiring subscription(s)`,
    );
  }

  private async notifyAdminsOfSubscriptionChange(
    user: any,
    action: 'activated' | 'deactivated',
    endDate?: Date,
  ) {
    const admins = await this.getAdminUsers();

    for (const admin of admins) {
      if (admin.email) {
        await this.emailService.sendEmail({
          recipients: [admin.email],
          subject: `🔔 Subscription ${action}: ${user.name}`,
          html: this.getAdminSubscriptionChangeTemplate(
            admin.name,
            user,
            action,
            endDate,
          ),
        });
      }

      await this.notificationsService.createNotification({
        userId: admin.id,
        category: 'SYSTEM',
        type: 'SYSTEM_MAINTENANCE',
        priority: 'MEDIUM',
        title: `Subscription ${action}`,
        message: `${user.name} (${user.email}) subscription has been ${action}`,
        level: action === 'activated' ? 'success' : 'warning',
        metadata: {
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          action,
          ...(endDate && { endDate: endDate.toISOString() }),
        },
      });
    }
  }

  private async getAdminUsers() {
    return this.dbService.db
      .select()
      .from(users)
      .where(eq(users.role, 'super_admin'));
  }

  // ==================== EMAIL TEMPLATES ====================

  private getActivationEmailTemplate(
    userName: string,
    endDate: string,
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', sans-serif; line-height: 1.6; color: #333; background: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; }
          .content { padding: 40px 30px; }
          .button { display: inline-block; padding: 14px 35px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; background: #f8f9fa; color: #666; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Subscription Activated!</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${userName}</strong>,</p>
            <p>Your subscription has been activated until <strong>${endDate}</strong>.</p>
            <div style="text-align: center;">
              <a href="${process.env.BETTER_AUTH_URL}/dashboard" class="button">Go to Dashboard</a>
            </div>
          </div>
          <div class="footer">
            <p>VelCar &copy; ${new Date().getFullYear()}</p>
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
        <h2>⚠️ Subscription Deactivated</h2>
        <p>Hi ${userName},</p>
        <p>Your subscription has been deactivated. Contact support if this was unexpected.</p>
      </body>
      </html>
    `;
  }

  private getAdminExpiringNotificationTemplate(
    adminName: string,
    expiringUsers: any[],
  ): string {
    const usersList = expiringUsers
      .map(
        (u) =>
          `<li><strong>${u.name}</strong> (${u.email}) - ${u.daysRemaining} days left</li>`,
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head><style>body { font-family: Arial, sans-serif; line-height: 1.6; }</style></head>
      <body>
        <h2>⚠️ Subscriptions Expiring Soon</h2>
        <p>Hi ${adminName},</p>
        <p>The following subscriptions are expiring within 30 days:</p>
        <ul>${usersList}</ul>
        <p>Please take necessary action to renew these subscriptions.</p>
        <a href="${process.env.BETTER_AUTH_URL}/admin/dashboard" style="display: inline-block; padding: 10px 20px; background: #667eea; color: white; text-decoration: none; border-radius: 5px;">View Dashboard</a>
      </body>
      </html>
    `;
  }

  private getAdminSubscriptionChangeTemplate(
    adminName: string,
    user: any,
    action: string,
    endDate?: Date,
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head><style>body { font-family: Arial, sans-serif; }</style></head>
      <body>
        <h2>🔔 Subscription ${action.charAt(0).toUpperCase() + action.slice(1)}</h2>
        <p>Hi ${adminName},</p>
        <p>A subscription has been ${action}:</p>
        <ul>
          <li><strong>User:</strong> ${user.name}</li>
          <li><strong>Email:</strong> ${user.email}</li>
          ${endDate ? `<li><strong>Valid Until:</strong> ${endDate.toLocaleDateString()}</li>` : ''}
        </ul>
      </body>
      </html>
    `;
  }
}
