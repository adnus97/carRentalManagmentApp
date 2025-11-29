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
import { I18nService } from 'nestjs-i18n';

type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
type Level = 'info' | 'warning' | 'error';

@Injectable()
export class EnhancedCronService {
  private readonly logger = new Logger(EnhancedCronService.name);

  constructor(
    private readonly dbService: DatabaseService,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
    private readonly i18n: I18nService,
  ) {}

  // ========== LOCALE + HELPERS ==========

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
    return user as any; // user: { id, email, name, locale?: 'en' | 'fr' | 'en-US' ... }
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

  // Determine user language. Store users.locale (e.g., 'en' | 'fr').
  // I18n fallbacks (e.g., 'fr-FR' -> 'fr') are configured in I18nModule.
  private async getLocale(userId: string): Promise<string> {
    const user = await this.getUserDetails(userId);
    return user?.locale || 'en';
  }

  // Translate helper with enforced namespace "common".
  // Call with relative keys such as 'notifications.rental.started.title'
  private async t(
    userId: string,
    key: string,
    vars?: Record<string, any>,
  ): Promise<string> {
    const lang = await this.getLocale(userId);
    const namespaced = `common.${key}`;

    return this.i18n.translate(namespaced, {
      lang,
      args: vars ?? {},
    });
  }
  // ========== CRONS ==========

  @Cron(CronExpression.EVERY_MINUTE)
  async autoUpdateRentStatuses() {
    try {
      const now = new Date();
      let totalUpdated = 0;

      // reserved -> active
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
        if (!orgOwner) continue;

        const title = await this.t(
          orgOwner.userId,
          'notifications.rental.started.title',
        );
        const message = await this.t(
          orgOwner.userId,
          'notifications.rental.started.message',
          { contractId: rent.rentContractId },
        );

        await this.notificationsService.createNotification({
          userId: orgOwner.userId,
          orgId: rent.orgId,
          category: 'RENTAL',
          type: 'RENT_STARTED',
          priority: 'MEDIUM',
          title,
          message,
          actionUrl: `/rents`,
          actionLabel: await this.t(
            orgOwner.userId,
            'notifications.common.view_rental',
          ),
          metadata: { rentalId: rent.id },
        });

        await this.sendRentalStartedEmail(orgOwner.userId, rent);
      }
      totalUpdated += reservedToActive.length;

      // active -> completed (returnedAt <= now)
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
        if (!orgOwner) continue;

        const title = await this.t(
          orgOwner.userId,
          'notifications.rental.completed.title',
        );
        const message = await this.t(
          orgOwner.userId,
          'notifications.rental.completed.message',
          { contractId: rent.rentContractId },
        );

        await this.notificationsService.createNotification({
          userId: orgOwner.userId,
          orgId: rent.orgId,
          category: 'RENTAL',
          type: 'RENT_COMPLETED',
          priority: 'MEDIUM',
          title,
          message,
          actionUrl: `/rents`,
          actionLabel: await this.t(
            orgOwner.userId,
            'notifications.common.view_rental',
          ),
          metadata: { rentalId: rent.id },
        });

        await this.sendRentalCompletedEmail(orgOwner.userId, rent);
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
        if (!orgOwner) continue;

        const daysOverdue = Math.ceil(
          (now.getTime() - rental.expectedEndDate.getTime()) /
            (1000 * 60 * 60 * 24),
        );

        const title = await this.t(
          orgOwner.userId,
          'notifications.rental.overdue.title',
        );
        const message = await this.t(
          orgOwner.userId,
          'notifications.rental.overdue.message',
          {
            contractId: rental.rentContractId,
            days: daysOverdue,
          },
        );

        await this.notificationsService.createNotification({
          userId: orgOwner.userId,
          orgId: rental.orgId,
          category: 'RENTAL',
          type: 'RENT_OVERDUE',
          priority: 'HIGH',
          title,
          message,
          actionUrl: `/rents`,
          actionLabel: await this.t(
            orgOwner.userId,
            'notifications.rental.overdue.action_label',
          ),
          metadata: {
            rentalId: rental.id,
            customerId: rental.customerId,
            daysOverdue,
          },
        });

        await this.sendOverdueRentalEmail(orgOwner.userId, rental, daysOverdue);
      }

      if (overdueRentals.length > 0) {
        this.logger.log(`Found ${overdueRentals.length} overdue rentals`);
      }
    } catch (error) {
      this.logger.error('Error checking overdue rentals:', error);
    }
  }

  // Daily at 9:00
  @Cron('0 9 * * *')
  async checkUpcomingReturns() {
    try {
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
          if (!orgOwner) continue;

          const unitKey =
            days === 1
              ? 'notifications.common.day'
              : 'notifications.common.days';
          const unit = await this.t(orgOwner.userId, unitKey);

          const title = await this.t(
            orgOwner.userId,
            'notifications.rental.return_reminder.title',
            { days, unit },
          );
          const message = await this.t(
            orgOwner.userId,
            'notifications.rental.return_reminder.message',
            { contractId: rental.rentContractId, days, unit },
          );

          await this.notificationsService.createNotification({
            userId: orgOwner.userId,
            orgId: rental.orgId,
            category: 'RENTAL',
            type: 'RENT_RETURN_REMINDER',
            priority: days === 1 ? 'HIGH' : 'MEDIUM',
            title,
            message,
            actionUrl: `/rents`,
            actionLabel: await this.t(
              orgOwner.userId,
              'notifications.common.view_rental',
            ),
            metadata: { rentalId: rental.id, daysUntilReturn: days },
          });

          await this.sendReturnReminderEmail(orgOwner.userId, rental, days);
        }

        this.logger.log(
          `Sent ${upcomingReturns.length} return reminders for ${days} day(s)`,
        );
      }
    } catch (error) {
      this.logger.error('Error checking upcoming returns:', error);
    }
  }

  // TEMP for testing. Change back to '0 8 * * *' in prod.
  @Cron(CronExpression.EVERY_DAY_AT_10AM)
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
        if (!orgOwner) continue;

        const daysUntilExpiry = Math.ceil(
          (car.insuranceExpiryDate.getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24),
        );

        let priority: Priority;
        let level: Level;
        let titleKey = 'notifications.car.insurance.this_month.title';

        if (daysUntilExpiry <= 3) {
          priority = 'URGENT';
          level = 'error';
          titleKey = 'notifications.car.insurance.very_soon.title';
        } else if (daysUntilExpiry <= 7) {
          priority = 'HIGH';
          level = 'error';
          titleKey = 'notifications.car.insurance.this_week.title';
        } else {
          priority = 'MEDIUM';
          level = 'warning';
          titleKey = 'notifications.car.insurance.this_month.title';
        }

        const title = await this.t(orgOwner.userId, titleKey);
        const message = await this.t(
          orgOwner.userId,
          'notifications.car.insurance.message',
          { make: car.make, model: car.model, days: daysUntilExpiry },
        );

        await this.notificationsService.createNotification({
          userId: orgOwner.userId,
          orgId: car.orgId,
          category: 'CAR',
          type: 'CAR_INSURANCE_EXPIRING',
          priority,
          title,
          message,
          level,
          actionUrl: `/carDetails/${car.id}`,
          actionLabel: await this.t(
            orgOwner.userId,
            'notifications.car.insurance.action_label',
          ),
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

  // ========== EMAILS (localized) ==========

  private async sendRentalStartedEmail(userId: string, rental: any) {
    try {
      const user = await this.getUserDetails(userId);
      const car = await this.getCarDetails(rental.carId);
      const customer = await this.getCustomerDetails(rental.customerId);
      if (!user || !car || !customer) return;

      const subject = await this.t(
        userId,
        'notifications.rental.started.email_subject',
        { contractId: rental.rentContractId },
      );
      const heading = await this.t(
        userId,
        'notifications.rental.started.email_heading',
      );
      const body = await this.t(
        userId,
        'notifications.rental.started.email_body',
      );
      const hi = await this.t(userId, 'notifications.common.hi_user', {
        name: user.name,
      });
      const btn = await this.t(userId, 'notifications.common.view_rental');

      const lblContract = await this.t(
        userId,
        'notifications.rental.email_labels.contract',
      );
      const lblVehicle = await this.t(
        userId,
        'notifications.rental.email_labels.vehicle',
      );
      const lblCustomer = await this.t(
        userId,
        'notifications.rental.email_labels.customer',
      );

      await this.emailService.sendEmail({
        recipients: [user.email],
        subject,
        html: `
          <h2>${heading}</h2>
          <p>${hi}</p>
          <p>${body}</p>
          <ul>
            <li><strong>${lblContract}:</strong> ${rental.rentContractId}</li>
            <li><strong>${lblVehicle}:</strong> ${car.make} ${car.model}</li>
            <li><strong>${lblCustomer}:</strong> ${customer.firstName} ${customer.lastName}</li>
          </ul>
          <a href="${process.env.BETTER_AUTH_URL}/rents" style="display:inline-block;padding:10px 20px;background:#667eea;color:white;text-decoration:none;border-radius:5px;">${btn}</a>
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

      const subject = await this.t(
        userId,
        'notifications.rental.completed.email_subject',
        { contractId: rental.rentContractId },
      );
      const heading = await this.t(
        userId,
        'notifications.rental.completed.email_heading',
      );
      const body = await this.t(
        userId,
        'notifications.rental.completed.email_body',
      );
      const hi = await this.t(userId, 'notifications.common.hi_user', {
        name: user.name,
      });
      const btn = await this.t(userId, 'notifications.common.view_rental');

      const lblContract = await this.t(
        userId,
        'notifications.rental.email_labels.contract',
      );
      const lblVehicle = await this.t(
        userId,
        'notifications.rental.email_labels.vehicle',
      );

      await this.emailService.sendEmail({
        recipients: [user.email],
        subject,
        html: `
          <h2>${heading}</h2>
          <p>${hi}</p>
          <p>${body}</p>
          <ul>
            <li><strong>${lblContract}:</strong> ${rental.rentContractId}</li>
            <li><strong>${lblVehicle}:</strong> ${car.make} ${car.model}</li>
          </ul>
          <a href="${process.env.BETTER_AUTH_URL}/rents" style="display:inline-block;padding:10px 20px;background:#10b981;color:white;text-decoration:none;border-radius:5px;">${btn}</a>
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

      const subject = await this.t(
        userId,
        'notifications.rental.overdue.email_subject',
        { contractId: rental.rentContractId },
      );
      const heading = await this.t(
        userId,
        'notifications.rental.overdue.email_heading',
      );
      const body = await this.t(
        userId,
        'notifications.rental.overdue.email_body',
        { days: daysOverdue },
      );
      const hi = await this.t(userId, 'notifications.common.hi_user', {
        name: user.name,
      });
      const btn = await this.t(userId, 'notifications.common.view_rental');

      const lblContract = await this.t(
        userId,
        'notifications.rental.email_labels.contract',
      );
      const lblVehicle = await this.t(
        userId,
        'notifications.rental.email_labels.vehicle',
      );
      const lblCustomer = await this.t(
        userId,
        'notifications.rental.email_labels.customer',
      );
      const lblPhone = await this.t(
        userId,
        'notifications.rental.email_labels.phone',
      );

      await this.emailService.sendEmail({
        recipients: [user.email],
        subject,
        html: `
          <h2 style="color:#ef4444;">${heading}</h2>
          <p>${hi}</p>
          <p>${body}</p>
          <ul>
            <li><strong>${lblContract}:</strong> ${rental.rentContractId}</li>
            <li><strong>${lblVehicle}:</strong> ${car.make} ${car.model}</li>
            <li><strong>${lblCustomer}:</strong> ${customer.firstName} ${customer.lastName}</li>
            <li><strong>${lblPhone}:</strong> ${customer.phone}</li>
            <li><strong>${await this.t(userId, 'notifications.common.days')}:</strong> ${daysOverdue}</li>
          </ul>
          <a href="${process.env.BETTER_AUTH_URL}/rents" style="display:inline-block;padding:10px 20px;background:#ef4444;color:white;text-decoration:none;border-radius:5px;">${btn}</a>
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

      const unitKey =
        daysUntilReturn === 1
          ? 'notifications.common.day'
          : 'notifications.common.days';
      const unit = await this.t(userId, unitKey);

      const subject = await this.t(
        userId,
        'notifications.rental.return_reminder.email_subject',
        { contractId: rental.rentContractId, days: daysUntilReturn, unit },
      );
      const heading = await this.t(
        userId,
        'notifications.rental.return_reminder.email_heading',
      );
      const body = await this.t(
        userId,
        'notifications.rental.return_reminder.email_body',
        { days: daysUntilReturn, unit },
      );
      const hi = await this.t(userId, 'notifications.common.hi_user', {
        name: user.name,
      });
      const btn = await this.t(userId, 'notifications.common.view_rental');

      const lblContract = await this.t(
        userId,
        'notifications.rental.email_labels.contract',
      );
      const lblVehicle = await this.t(
        userId,
        'notifications.rental.email_labels.vehicle',
      );
      const lblCustomer = await this.t(
        userId,
        'notifications.rental.email_labels.customer',
      );
      const lblPhone = await this.t(
        userId,
        'notifications.rental.email_labels.phone',
      );
      const lblExpected = await this.t(
        userId,
        'notifications.rental.email_labels.expected_return',
      );

      await this.emailService.sendEmail({
        recipients: [user.email],
        subject,
        html: `
          <h2>${heading}</h2>
          <p>${hi}</p>
          <p>${body}</p>
          <ul>
            <li><strong>${lblContract}:</strong> ${rental.rentContractId}</li>
            <li><strong>${lblVehicle}:</strong> ${car.make} ${car.model}</li>
            <li><strong>${lblCustomer}:</strong> ${customer.firstName} ${customer.lastName}</li>
            <li><strong>${lblPhone}:</strong> ${customer.phone}</li>
            <li><strong>${lblExpected}:</strong> ${rental.expectedEndDate?.toLocaleDateString?.() || ''}</li>
          </ul>
          <a href="${process.env.BETTER_AUTH_URL}/rents" style="display:inline-block;padding:10px 20px;background:#667eea;color:white;text-decoration:none;border-radius:5px;">${btn}</a>
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

      const subject = await this.t(
        userId,
        'notifications.car.insurance.email_subject',
        { urgency, make: car.make, model: car.model, days: daysUntilExpiry },
      );
      const heading = await this.t(
        userId,
        'notifications.car.insurance.email_heading',
      );
      const body = await this.t(
        userId,
        'notifications.car.insurance.email_body',
        { days: daysUntilExpiry },
      );

      const carLabel = await this.t(
        userId,
        'notifications.car.insurance.email_car_label',
      );
      const expLabel = await this.t(
        userId,
        'notifications.car.insurance.email_expiry_label',
      );

      await this.emailService.sendEmail({
        recipients: [user.email],
        subject,
        html: `
          <h2 style="color:${daysUntilExpiry <= 7 ? '#ef4444' : '#f59e0b'};">${heading}</h2>
          <p>${await this.t(userId, 'notifications.common.hi_user', {
            name: user.name,
          })}</p>
          <p>${body}</p>
          <ul>
            <li><strong>${carLabel}:</strong> ${car.make} ${car.model} (${car.year})</li>
            <li><strong>${expLabel}:</strong> ${car.insuranceExpiryDate?.toLocaleDateString?.() || ''}</li>
          </ul>
          <a href="${process.env.BETTER_AUTH_URL}/carDetails/${car.id}" style="display:inline-block;padding:10px 20px;background:#667eea;color:white;text-decoration:none;border-radius:5px;">
            ${await this.t(userId, 'notifications.car.insurance.action_label')}
          </a>
        `,
      });
    } catch (error) {
      this.logger.error('Failed to send insurance expiry email:', error);
    }
  }
}
