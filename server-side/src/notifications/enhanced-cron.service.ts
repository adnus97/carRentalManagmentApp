// src/notifications/enhanced-cron.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseService } from '../db';
import { NotificationsService } from './notifications.service';
import { rents } from '../db/schema/rents';
import { cars } from '../db/schema/cars';
import { organization } from '../db/schema/organization';
import { customers } from '../db/schema/customers';
import { eq, lte, gte, and, sql, inArray } from 'drizzle-orm';

@Injectable()
export class EnhancedCronService {
  private readonly logger = new Logger(EnhancedCronService.name);

  constructor(
    private readonly dbService: DatabaseService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Auto-update rent statuses (every minute)
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async autoUpdateRentStatuses() {
    try {
      const now = new Date();
      let totalUpdated = 0;

      // 1. reserved → active
      const reservedToActive = await this.dbService.db
        .update(rents)
        .set({ status: 'active' })
        .where(
          and(
            eq(rents.status, 'reserved'),
            lte(rents.startDate, now),
            eq(rents.isDeleted, false),
          ),
        )
        .returning({
          id: rents.id,
          carId: rents.carId,
          customerId: rents.customerId,
          orgId: rents.orgId,
        });

      // Send notifications for started rentals
      for (const rent of reservedToActive) {
        const orgOwner = await this.getOrgOwner(rent.orgId);
        if (orgOwner) {
          await this.notificationsService.createNotification({
            userId: orgOwner.userId,
            orgId: rent.orgId,
            category: 'RENTAL',
            type: 'RENT_STARTED',
            priority: 'MEDIUM',
            title: 'Rental Started',
            message: `Rental ${rent.id} has started`,
            actionUrl: `/rentals/${rent.id}`,
            actionLabel: 'View Rental',
            metadata: { rentalId: rent.id },
          });
        }
      }

      totalUpdated += reservedToActive.length;

      // 2. active → completed (when returned)
      const activeToCompleted = await this.dbService.db
        .update(rents)
        .set({ status: 'completed' })
        .where(
          and(
            eq(rents.status, 'active'),
            sql`${rents.returnedAt} IS NOT NULL`,
            lte(rents.returnedAt, now),
            eq(rents.isDeleted, false),
          ),
        )
        .returning({
          id: rents.id,
          carId: rents.carId,
          customerId: rents.customerId,
          orgId: rents.orgId,
        });

      // Send notifications for completed rentals
      for (const rent of activeToCompleted) {
        const orgOwner = await this.getOrgOwner(rent.orgId);
        if (orgOwner) {
          await this.notificationsService.createNotification({
            userId: orgOwner.userId,
            orgId: rent.orgId,
            category: 'RENTAL',
            type: 'RENT_COMPLETED',
            priority: 'MEDIUM',
            title: 'Rental Completed',
            message: `Rental ${rent.id} has been completed`,
            actionUrl: `/rentals/${rent.id}`,
            actionLabel: 'View Rental',
            metadata: { rentalId: rent.id },
          });
        }
      }

      totalUpdated += activeToCompleted.length;

      if (totalUpdated > 0) {
        this.logger.log(`Updated ${totalUpdated} rental statuses`);
      }
    } catch (error) {
      this.logger.error('Error updating rent statuses:', error);
    }
  }

  /**
   * Check for overdue rentals (every hour)
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkOverdueRentals() {
    try {
      const now = new Date();

      const overdueRentals = await this.dbService.db
        .select({
          id: rents.id,
          customerId: rents.customerId,
          expectedEndDate: rents.expectedEndDate,
          orgId: rents.orgId,
        })
        .from(rents)
        .where(
          and(
            eq(rents.status, 'active'),
            lte(rents.expectedEndDate, now),
            eq(rents.isDeleted, false),
          ),
        );

      for (const rental of overdueRentals) {
        const orgOwner = await this.getOrgOwner(rental.orgId);
        if (orgOwner) {
          await this.notificationsService.createNotification({
            userId: orgOwner.userId,
            orgId: rental.orgId,
            category: 'RENTAL',
            type: 'RENT_OVERDUE',
            priority: 'HIGH',
            title: 'Rental Overdue',
            message: `Rental ${rental.id} is overdue and needs attention`,
            actionUrl: `/rentals/${rental.id}`,
            actionLabel: 'Contact Customer',
            metadata: {
              rentalId: rental.id,
              customerId: rental.customerId,
              daysOverdue: Math.ceil(
                (now.getTime() - rental.expectedEndDate.getTime()) /
                  (1000 * 60 * 60 * 24),
              ),
            },
          });
        }
      }

      if (overdueRentals.length > 0) {
        this.logger.log(`Found ${overdueRentals.length} overdue rentals`);
      }
    } catch (error) {
      this.logger.error('Error checking overdue rentals:', error);
    }
  }

  /**
   * Check for upcoming returns (daily at 9 AM)
   */
  @Cron('0 9 * * *')
  async checkUpcomingReturns() {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const nextDay = new Date(tomorrow);
      nextDay.setDate(nextDay.getDate() + 1);

      const upcomingReturns = await this.dbService.db
        .select({
          id: rents.id,
          customerId: rents.customerId,
          expectedEndDate: rents.expectedEndDate,
          orgId: rents.orgId,
        })
        .from(rents)
        .where(
          and(
            eq(rents.status, 'active'),
            gte(rents.expectedEndDate, tomorrow),
            lte(rents.expectedEndDate, nextDay),
            eq(rents.isDeleted, false),
          ),
        );

      for (const rental of upcomingReturns) {
        const orgOwner = await this.getOrgOwner(rental.orgId);
        if (orgOwner) {
          await this.notificationsService.createNotification({
            userId: orgOwner.userId,
            orgId: rental.orgId,
            category: 'RENTAL',
            type: 'RENT_RETURN_REMINDER',
            priority: 'MEDIUM',
            title: 'Return Reminder',
            message: `Rental ${rental.id} is due for return tomorrow`,
            actionUrl: `/rentals/${rental.id}`,
            actionLabel: 'View Rental',
            metadata: { rentalId: rental.id },
          });
        }
      }

      this.logger.log(`Sent ${upcomingReturns.length} return reminders`);
    } catch (error) {
      this.logger.error('Error checking upcoming returns:', error);
    }
  }

  /**
   * Check insurance expiry (weekly on Mondays)
   */
  @Cron('0 8 * * *')
  async checkInsuranceExpiry() {
    try {
      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      // Get cars with insurance expiring in the next 30 days
      const expiringInsurance = await this.dbService.db
        .select({
          id: cars.id,
          make: cars.make,
          model: cars.model,
          year: cars.year,
          insuranceExpiryDate: cars.insuranceExpiryDate,
          orgId: cars.orgId,
          pricePerDay: cars.pricePerDay,
        })
        .from(cars)
        .where(
          and(
            lte(cars.insuranceExpiryDate, thirtyDaysFromNow),
            gte(cars.insuranceExpiryDate, now), // Not already expired
            eq(cars.status, 'active'),
          ),
        );

      // Get already expired insurance
      const expiredInsurance = await this.dbService.db
        .select({
          id: cars.id,
          make: cars.make,
          model: cars.model,
          year: cars.year,
          insuranceExpiryDate: cars.insuranceExpiryDate,
          orgId: cars.orgId,
        })
        .from(cars)
        .where(
          and(
            lte(cars.insuranceExpiryDate, now), // Already expired
            eq(cars.status, 'active'),
          ),
        );

      // Process expiring insurance
      for (const car of expiringInsurance) {
        const orgOwner = await this.getOrgOwner(car.orgId);
        if (orgOwner) {
          const daysUntilExpiry = Math.ceil(
            (car.insuranceExpiryDate.getTime() - now.getTime()) /
              (1000 * 60 * 60 * 24),
          );

          // Determine priority and message based on days remaining
          let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
          let title: string;
          let level: 'info' | 'warning' | 'error';

          if (daysUntilExpiry <= 3) {
            priority = 'URGENT';
            title = 'Insurance Expires Very Soon!';
            level = 'error';
          } else if (daysUntilExpiry <= 7) {
            priority = 'HIGH';
            title = 'Insurance Expiring This Week';
            level = 'error';
          } else if (daysUntilExpiry <= 14) {
            priority = 'HIGH';
            title = 'Insurance Expiring Soon';
            level = 'warning';
          } else {
            priority = 'MEDIUM';
            title = 'Insurance Expiring This Month';
            level = 'warning';
          }

          await this.notificationsService.createNotification({
            userId: orgOwner.userId,
            orgId: car.orgId,
            category: 'CAR',
            type: 'CAR_INSURANCE_EXPIRING',
            priority,
            title,
            message: `Insurance for ${car.make} ${car.model} (${car.year}) expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}`,
            level,
            actionUrl: `/cars/${car.id}`,
            actionLabel: 'Update Insurance',
            expiresAt: new Date(
              car.insuranceExpiryDate.getTime() + 7 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            metadata: {
              carId: car.id,
              daysUntilExpiry,
              insuranceExpiryDate: car.insuranceExpiryDate.toISOString(),
              carDetails: `${car.make} ${car.model} (${car.year})`,
            },
          });
        }
      }

      // Process expired insurance (urgent notifications)
      for (const car of expiredInsurance) {
        const orgOwner = await this.getOrgOwner(car.orgId);
        if (orgOwner) {
          const daysExpired = Math.ceil(
            (now.getTime() - car.insuranceExpiryDate.getTime()) /
              (1000 * 60 * 60 * 24),
          );

          await this.notificationsService.createNotification({
            userId: orgOwner.userId,
            orgId: car.orgId,
            category: 'CAR',
            type: 'CAR_INSURANCE_EXPIRING',
            priority: 'URGENT',
            title: 'Insurance EXPIRED!',
            message: `Insurance for ${car.make} ${car.model} (${car.year}) expired ${daysExpired} day${daysExpired === 1 ? '' : 's'} ago`,
            level: 'error',
            actionUrl: `/cars/${car.id}`,
            actionLabel: 'Update Insurance URGENTLY',
            metadata: {
              carId: car.id,
              daysExpired,
              insuranceExpiryDate: car.insuranceExpiryDate.toISOString(),
              carDetails: `${car.make} ${car.model} (${car.year})`,
              isExpired: true,
            },
          });
        }
      }

      this.logger.log(
        `Processed insurance expiry: ${expiringInsurance.length} expiring, ${expiredInsurance.length} expired`,
      );
    } catch (error) {
      this.logger.error('Error checking insurance expiry:', error);
    }
  }
  /**
   * Clean up old notifications (daily at midnight)
   */
  @Cron('0 0 * * *')
  async cleanupOldNotifications() {
    try {
      await this.notificationsService.cleanupOldNotifications(30);
    } catch (error) {
      this.logger.error('Error cleaning up notifications:', error);
    }
  }

  // Helper method
  private async getOrgOwner(orgId: string) {
    const [org] = await this.dbService.db
      .select({ userId: organization.userId })
      .from(organization)
      .where(eq(organization.id, orgId));

    return org;
  }
}
