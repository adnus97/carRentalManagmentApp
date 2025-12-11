// src/admin/admin.service.ts
import {
  Injectable,
  BadRequestException,
  Logger,
  Inject,
} from '@nestjs/common';
import { DatabaseService } from 'src/db';
import { users } from 'src/db/schema/users';
import { organization } from 'src/db/schema/organization';
import { rents } from 'src/db/schema/rents';
import { cars } from 'src/db/schema/cars';
import { eq, sql, like, or, and, lte } from 'drizzle-orm';
import { SubscriptionService } from '../subscription/subscription.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @Inject(DatabaseService) private readonly dbService: DatabaseService, // Add @Inject()
    @Inject(SubscriptionService)
    private readonly subscriptionService: SubscriptionService, // Add @Inject()
  ) {
    console.log('🔧 AdminService constructor called');
    console.log('🔧 DatabaseService injected:', !!this.dbService);
    console.log('🔧 DatabaseService.db exists:', !!this.dbService?.db);
    console.log('🔧 SubscriptionService injected:', !!this.subscriptionService);
  }

  /**
   * Get all users with filters
   */
  async getAllUsers(
    page: number = 1,
    limit: number = 20,
    status?: string,
    search?: string,
  ) {
    const offset = (page - 1) * limit;

    const conditions = [eq(users.role, 'user')]; // Exclude super admins from list

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

    // Calculate days remaining for each user
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
    };
  }

  /**
   * Get detailed user information
   */
  async getUserDetails(userId: string) {
    const [user] = await this.dbService.db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Get organization details
    const [org] = await this.dbService.db
      .select()
      .from(organization)
      .where(eq(organization.userId, userId));

    // Get rental statistics
    const [rentalStats] = await this.dbService.db
      .select({
        totalRentals: sql<number>`COUNT(*)`,
        activeRentals: sql<number>`COUNT(*) FILTER (WHERE ${rents.status} = 'active')`,
        completedRentals: sql<number>`COUNT(*) FILTER (WHERE ${rents.status} = 'completed')`,
        totalRevenue: sql<number>`COALESCE(SUM(${rents.totalPaid}), 0)`,
      })
      .from(rents)
      .where(org ? eq(rents.orgId, org.id) : sql`false`);

    // Get car count
    const [carStats] = await this.dbService.db
      .select({
        totalCars: sql<number>`COUNT(*)`,
        activeCars: sql<number>`COUNT(*) FILTER (WHERE ${cars.status} = 'active')`,
      })
      .from(cars)
      .where(org ? eq(cars.orgId, org.id) : sql`false`);

    const now = new Date();
    const daysRemaining = user.subscriptionEndDate
      ? Math.ceil(
          (user.subscriptionEndDate.getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : 0;

    return {
      user: {
        ...user,
        daysRemaining,
        isExpired:
          user.subscriptionStatus === 'expired' ||
          (user.subscriptionEndDate && user.subscriptionEndDate < now),
        needsRenewal: daysRemaining <= 30 && daysRemaining > 0,
      },
      organization: org || null,
      statistics: {
        rentals: rentalStats || {
          totalRentals: 0,
          activeRentals: 0,
          completedRentals: 0,
          totalRevenue: 0,
        },
        cars: carStats || { totalCars: 0, activeCars: 0 },
      },
    };
  }

  /**
   * Get expiring subscriptions
   */
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

  /**
   * Get dashboard statistics
   */
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

    // Expiring soon (next 30 days)
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

    // Revenue statistics (from all organizations)
    const [revenueStats] = await this.dbService.db
      .select({
        totalRevenue: sql<number>`COALESCE(SUM(${rents.totalPaid}), 0)`,
        totalRentals: sql<number>`COUNT(*)`,
        activeRentals: sql<number>`COUNT(*) FILTER (WHERE ${rents.status} = 'active')`,
      })
      .from(rents)
      .where(eq(rents.isDeleted, false));

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
      revenue: revenueStats || {
        totalRevenue: 0,
        totalRentals: 0,
        activeRentals: 0,
      },
    };
  }

  /**
   * Update user role
   */
  async updateUserRole(userId: string, role: 'user' | 'super_admin') {
    const [user] = await this.dbService.db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      throw new BadRequestException('User not found');
    }

    await this.dbService.db
      .update(users)
      .set({
        role,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    this.logger.log(`Updated user ${userId} role to ${role}`);

    return {
      success: true,
      message: `User role updated to ${role}`,
    };
  }

  /**
   * Delete user (soft delete - deactivate subscription)
   */
  async deleteUser(userId: string) {
    const [user] = await this.dbService.db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.role === 'super_admin') {
      throw new BadRequestException('Cannot delete super admin accounts');
    }

    // Deactivate subscription
    await this.subscriptionService.deactivateSubscription(userId);

    this.logger.log(`Deactivated user ${userId}`);

    return {
      success: true,
      message: 'User account deactivated',
    };
  }
}
