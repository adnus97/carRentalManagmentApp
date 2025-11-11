// src/notifications/enhanced-cron.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseService } from '../db';
import { NotificationsService } from './notifications.service';
import { EmailService } from 'src/email/email.service';
import { rents } from '../db/schema/rents';
import { cars } from '../db/schema/cars';
import { organization } from '../db/schema/organization';
import { customers } from '../db/schema/customers';
import { users } from '../db/schema/users';
import { eq, lte, gte, and, sql } from 'drizzle-orm';

@Injectable()
export class EnhancedCronService {
  private readonly logger = new Logger(EnhancedCronService.name);

  constructor(
    private readonly dbService: DatabaseService,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
  ) {}

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
          rentContractId: rents.rentContractId,
        });

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
            message: `Rental #${rent.rentContractId} has started`,
            actionUrl: `/rentals/${rent.id}`,
            actionLabel: 'View Rental',
            metadata: { rentalId: rent.id },
          });

          // Send email
          await this.sendRentalStartedEmail(orgOwner.userId, rent);
        }
      }

      totalUpdated += reservedToActive.length;

      // 2. active → completed
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
          rentContractId: rents.rentContractId,
        });

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
            message: `Rental #${rent.rentContractId} has been completed`,
            actionUrl: `/rentals/${rent.id}`,
            actionLabel: 'View Rental',
            metadata: { rentalId: rent.id },
          });

          await this.sendRentalCompletedEmail(orgOwner.userId, rent);
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
          rentContractId: rents.rentContractId,
          carId: rents.carId,
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
          const daysOverdue = Math.ceil(
            (now.getTime() - rental.expectedEndDate.getTime()) /
              (1000 * 60 * 60 * 24),
          );

          await this.notificationsService.createNotification({
            userId: orgOwner.userId,
            orgId: rental.orgId,
            category: 'RENTAL',
            type: 'RENT_OVERDUE',
            priority: 'HIGH',
            title: 'Rental Overdue',
            message: `Rental ${rental.rentContractId} is overdue by ${daysOverdue} days`,
            actionUrl: `/rentals/${rental.id}`,
            actionLabel: 'Contact Customer',
            metadata: {
              rentalId: rental.id,
              customerId: rental.customerId,
              daysOverdue,
            },
          });

          await this.sendOverdueRentalEmail(
            orgOwner.userId,
            rental,
            daysOverdue,
          );
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
   * ✅ NEW: Check for upcoming returns (daily at 9 AM)
   * Send notification 3 days, 2 days, and 1 day before return
   */
  @Cron('0 9 * * *')
  async checkUpcomingReturns() {
    try {
      const now = new Date();

      // Check for returns due in 3, 2, and 1 days
      for (const days of [3, 2, 1]) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + days);
        targetDate.setHours(0, 0, 0, 0);

        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);

        const upcomingReturns = await this.dbService.db
          .select({
            id: rents.id,
            customerId: rents.customerId,
            carId: rents.carId,
            expectedEndDate: rents.expectedEndDate,
            orgId: rents.orgId,
            rentContractId: rents.rentContractId,
          })
          .from(rents)
          .where(
            and(
              eq(rents.status, 'active'),
              gte(rents.expectedEndDate, targetDate),
              lte(rents.expectedEndDate, nextDay),
              eq(rents.isDeleted, false),
            ),
          );

        for (const rental of upcomingReturns) {
          const orgOwner = await this.getOrgOwner(rental.orgId);
          if (orgOwner) {
            const priority = days === 1 ? 'HIGH' : 'MEDIUM';

            await this.notificationsService.createNotification({
              userId: orgOwner.userId,
              orgId: rental.orgId,
              category: 'RENTAL',
              type: 'RENT_RETURN_REMINDER',
              priority,
              title: `Return Due in ${days} ${days === 1 ? 'Day' : 'Days'}`,
              message: `Rental ${rental.rentContractId} is due for return in ${days} ${days === 1 ? 'day' : 'days'}`,
              actionUrl: `/rentals/${rental.id}`,
              actionLabel: 'View Rental',
              metadata: { rentalId: rental.id, daysUntilReturn: days },
            });

            await this.sendReturnReminderEmail(orgOwner.userId, rental, days);
          }
        }

        this.logger.log(
          `Sent ${upcomingReturns.length} return reminders for ${days} day(s)`,
        );
      }
    } catch (error) {
      this.logger.error('Error checking upcoming returns:', error);
    }
  }

  @Cron('0 8 * * *')
  async checkInsuranceExpiry() {
    try {
      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const expiringInsurance = await this.dbService.db
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
            lte(cars.insuranceExpiryDate, thirtyDaysFromNow),
            gte(cars.insuranceExpiryDate, now),
            eq(cars.status, 'active'),
          ),
        );

      for (const car of expiringInsurance) {
        const orgOwner = await this.getOrgOwner(car.orgId);
        if (orgOwner) {
          const daysUntilExpiry = Math.ceil(
            (car.insuranceExpiryDate.getTime() - now.getTime()) /
              (1000 * 60 * 60 * 24),
          );

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
            message: `Insurance for ${car.make} ${car.model} expires in ${daysUntilExpiry} days`,
            level,
            actionUrl: `/cars/${car.id}`,
            actionLabel: 'Update Insurance',
            metadata: {
              carId: car.id,
              daysUntilExpiry,
              insuranceExpiryDate: car.insuranceExpiryDate.toISOString(),
            },
          });

          await this.sendInsuranceExpiryEmail(
            orgOwner.userId,
            car,
            daysUntilExpiry,
          );
        }
      }

      this.logger.log(
        `Processed ${expiringInsurance.length} insurance expiry notifications`,
      );
    } catch (error) {
      this.logger.error('Error checking insurance expiry:', error);
    }
  }

  @Cron('0 0 * * *')
  async cleanupOldNotifications() {
    try {
      await this.notificationsService.cleanupOldNotifications(30);
    } catch (error) {
      this.logger.error('Error cleaning up notifications:', error);
    }
  }

  // Helper methods
  private async getOrgOwner(orgId: string) {
    const [org] = await this.dbService.db
      .select({ userId: organization.userId })
      .from(organization)
      .where(eq(organization.id, orgId));

    return org;
  }

  private async getUserDetails(userId: string) {
    const [user] = await this.dbService.db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    return user;
  }

  private async getCarDetails(carId: string) {
    const [car] = await this.dbService.db
      .select()
      .from(cars)
      .where(eq(cars.id, carId));

    return car;
  }

  private async getCustomerDetails(customerId: string) {
    const [customer] = await this.dbService.db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId));

    return customer;
  }

  // Email sending methods
  private async sendRentalStartedEmail(userId: string, rental: any) {
    try {
      const user = await this.getUserDetails(userId);
      const car = await this.getCarDetails(rental.carId);
      const customer = await this.getCustomerDetails(rental.customerId);

      if (!user || !car || !customer) return;

      await this.emailService.sendEmail({
        recipients: [user.email],
        subject: `🚗 Rental Started - Contract #${rental.rentContractId}`,
        html: `
          <h2>Rental Started</h2>
          <p>Hi ${user.name},</p>
          <p>A rental has just started:</p>
          <ul>
            <li><strong>Contract ID:</strong> ${rental.rentContractId}</li>
            <li><strong>Car:</strong> ${car.make} ${car.model}</li>
            <li><strong>Customer:</strong> ${customer.firstName} ${customer.lastName}</li>
          </ul>
          <a href="${process.env.BETTER_AUTH_URL}/rentals/${rental.id}" style="display:inline-block;padding:10px 20px;background:#667eea;color:white;text-decoration:none;border-radius:5px;">View Rental</a>
        `,
      });
    } catch (error) {
      this.logger.error('Failed to send rental started email:', error);
    }
  }

  private async sendRentalCompletedEmail(userId: string, rental: any) {
    try {
      const user = await this.getUserDetails(userId);
      const car = await this.getCarDetails(rental.carId);

      if (!user || !car) return;

      await this.emailService.sendEmail({
        recipients: [user.email],
        subject: `✅ Rental Completed - Contract #${rental.rentContractId}`,
        html: `
          <h2>Rental Completed</h2>
          <p>Hi ${user.name},</p>
          <p>A rental has been completed:</p>
          <ul>
            <li><strong>Contract ID:</strong> ${rental.rentContractId}</li>
            <li><strong>Car:</strong> ${car.make} ${car.model}</li>
          </ul>
          <a href="${process.env.BETTER_AUTH_URL}/rentals/${rental.id}" style="display:inline-block;padding:10px 20px;background:#10b981;color:white;text-decoration:none;border-radius:5px;">View Rental</a>
        `,
      });
    } catch (error) {
      this.logger.error('Failed to send rental completed email:', error);
    }
  }

  private async sendOverdueRentalEmail(
    userId: string,
    rental: any,
    daysOverdue: number,
  ) {
    try {
      const user = await this.getUserDetails(userId);
      const car = await this.getCarDetails(rental.carId);
      const customer = await this.getCustomerDetails(rental.customerId);

      if (!user || !car || !customer) return;

      await this.emailService.sendEmail({
        recipients: [user.email],
        subject: `⚠️ OVERDUE RENTAL - Contract #${rental.rentContractId}`,
        html: `
          <h2 style="color:#ef4444;">Rental Overdue</h2>
          <p>Hi ${user.name},</p>
          <p><strong>Action Required:</strong> A rental is overdue by ${daysOverdue} days!</p>
          <ul>
            <li><strong>Contract ID:</strong> ${rental.rentContractId}</li>
            <li><strong>Car:</strong> ${car.make} ${car.model}</li>
            <li><strong>Customer:</strong> ${customer.firstName} ${customer.lastName}</li>
            <li><strong>Days Overdue:</strong> ${daysOverdue}</li>
          </ul>
          <p>Please contact the customer immediately.</p>
          <a href="${process.env.BETTER_AUTH_URL}/rentals/${rental.id}" style="display:inline-block;padding:10px 20px;background:#ef4444;color:white;text-decoration:none;border-radius:5px;">View Rental</a>
        `,
      });
    } catch (error) {
      this.logger.error('Failed to send overdue rental email:', error);
    }
  }

  private async sendReturnReminderEmail(
    userId: string,
    rental: any,
    daysUntilReturn: number,
  ) {
    try {
      const user = await this.getUserDetails(userId);
      const car = await this.getCarDetails(rental.carId);
      const customer = await this.getCustomerDetails(rental.customerId);

      if (!user || !car || !customer) return;

      await this.emailService.sendEmail({
        recipients: [user.email],
        subject: `⏰ Return Reminder - Contract #${rental.rentContractId} (${daysUntilReturn} ${daysUntilReturn === 1 ? 'Day' : 'Days'})`,
        html: `
          <h2>Return Reminder</h2>
          <p>Hi ${user.name},</p>
          <p>A rental is due for return in <strong>${daysUntilReturn} ${daysUntilReturn === 1 ? 'day' : 'days'}</strong>:</p>
          <ul>
            <li><strong>Contract ID:</strong> ${rental.rentContractId}</li>
            <li><strong>Car:</strong> ${car.make} ${car.model}</li>
            <li><strong>Customer:</strong> ${customer.firstName} ${customer.lastName}</li>
            <li><strong>Expected Return:</strong> ${rental.expectedEndDate.toLocaleDateString()}</li>
          </ul>
          <a href="${process.env.BETTER_AUTH_URL}/rentals/${rental.id}" style="display:inline-block;padding:10px 20px;background:#667eea;color:white;text-decoration:none;border-radius:5px;">View Rental</a>
        `,
      });
    } catch (error) {
      this.logger.error('Failed to send return reminder email:', error);
    }
  }

  private async sendInsuranceExpiryEmail(
    userId: string,
    car: any,
    daysUntilExpiry: number,
  ) {
    try {
      const user = await this.getUserDetails(userId);
      if (!user) return;

      const urgency = daysUntilExpiry <= 7 ? 'URGENT' : 'Important';

      await this.emailService.sendEmail({
        recipients: [user.email],
        subject: `${urgency}: Insurance Expiring - ${car.make} ${car.model} (${daysUntilExpiry} days)`,
        html: `
          <h2 style="color:${daysUntilExpiry <= 7 ? '#ef4444' : '#f59e0b'};">Insurance Expiring Soon</h2>
          <p>Hi ${user.name},</p>
          <p>The insurance for one of your vehicles is expiring in <strong>${daysUntilExpiry} days</strong>:</p>
          <ul>
            <li><strong>Car:</strong> ${car.make} ${car.model} (${car.year})</li>
            <li><strong>Expiry Date:</strong> ${car.insuranceExpiryDate.toLocaleDateString()}</li>
          </ul>
          <p>Please renew the insurance before it expires to avoid service interruption.</p>
          <a href="${process.env.BETTER_AUTH_URL}/cars/${car.id}" style="display:inline-block;padding:10px 20px;background:#667eea;color:white;text-decoration:none;border-radius:5px;">Update Insurance</a>
        `,
      });
    } catch (error) {
      this.logger.error('Failed to send insurance expiry email:', error);
    }
  }
}
