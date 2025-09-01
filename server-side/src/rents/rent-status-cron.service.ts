// src/rents/rent-status-cron.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseService } from '../db';
import { rents } from '../db/schema/rents';
import { organization } from '../db/schema/organization';
import { users } from '../db/schema/users';
import { eq, lte, and, isNotNull, inArray } from 'drizzle-orm';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateNotificationDto } from '../notifications/dto/create-notification.dto';

@Injectable()
export class RentStatusCronService {
  private readonly logger = new Logger(RentStatusCronService.name);

  constructor(
    private readonly dbService: DatabaseService,
    private readonly notificationsService: NotificationsService,
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
          orgId: rents.orgId, // ✅ Get the organization ID
        });

      await this.notifyOrganizationOwners(
        reservedToActive,
        'RENT_STARTED',
        'info',
        (rent) =>
          `🚗 Rental ${rent.id} has started for customer ${rent.customerId}`,
      );

      totalUpdated += reservedToActive.length;

      // 2. active → completed
      const activeToCompleted = await this.dbService.db
        .update(rents)
        .set({ status: 'completed' })
        .where(
          and(
            eq(rents.status, 'active'),
            isNotNull(rents.returnedAt),
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

      await this.notifyOrganizationOwners(
        activeToCompleted,
        'RENT_COMPLETED',
        'success',
        (rent) =>
          `✅ Rental ${rent.id} has been completed by customer ${rent.customerId}`,
      );

      totalUpdated += activeToCompleted.length;

      // 3. overdue check (don't update status, just notify)
      const overdueRents = await this.dbService.db
        .select({
          id: rents.id,
          carId: rents.carId,
          customerId: rents.customerId,
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

      await this.notifyOrganizationOwners(
        overdueRents,
        'RENT_OVERDUE',
        'warning',
        (rent) =>
          `⚠️ Rental ${rent.id} for customer ${rent.customerId} is overdue!`,
      );

      if (totalUpdated > 0) {
        this.logger.log(
          `Total rent status updates: ${totalUpdated} at ${now.toISOString()}`,
        );
      }
    } catch (err: any) {
      this.logger.error('Error auto-updating rent statuses:', err.message);
      if (err.query) this.logger.error('SQL:', err.query);
    }
  }

  /** ✅ Notify only the organization owner for each rent */
  private async notifyOrganizationOwners(
    rentsList: {
      id: string;
      carId: string;
      customerId: string;
      orgId: string;
    }[],
    type: string,
    level: 'info' | 'success' | 'warning' | 'error',
    messageBuilder: (rent: {
      id: string;
      carId: string;
      customerId: string;
    }) => string,
  ) {
    if (rentsList.length === 0) return;

    try {
      // ✅ Get all unique org IDs
      const orgIds = [...new Set(rentsList.map((rent) => rent.orgId))];

      // ✅ Get all organization owners in one query
      const organizationOwners = await this.dbService.db
        .select({
          orgId: organization.id,
          userId: organization.userId,
          userName: users.name,
          userEmail: users.email,
          orgName: organization.name,
        })
        .from(organization)
        .innerJoin(users, eq(organization.userId, users.id))
        .where(inArray(organization.id, orgIds));

      // ✅ Create a map for quick lookup
      const ownerMap = new Map(
        organizationOwners.map((owner) => [owner.orgId, owner]),
      );

      // ✅ Send notifications
      for (const rent of rentsList) {
        const owner = ownerMap.get(rent.orgId);

        if (!owner) {
          this.logger.warn(
            `No organization owner found for orgId: ${rent.orgId} (rent: ${rent.id})`,
          );
          continue;
        }

        const notifData: CreateNotificationDto = {
          userId: owner.userId, // ✅ Notify only the organization owner
          orgId: rent.orgId,
          type,
          message: messageBuilder(rent),
          level,
          metadata: {
            rentId: rent.id,
            carId: rent.carId,
            customerId: rent.customerId,
            organizationName: owner.orgName,
          },
        };

        try {
          await this.notificationsService.createNotification(notifData);
          this.logger.debug(
            `[CRON] ✅ Notification sent to ${owner.userEmail} (${owner.orgName})`,
          );
        } catch (err: any) {
          this.logger.error(
            `[CRON] ❌ Failed to notify ${owner.userEmail}:`,
            err.message,
          );
        }
      }

      this.logger.log(
        `Notified organization owners for ${rentsList.length} rent(s) of type ${type}`,
      );
    } catch (err: any) {
      this.logger.error('Error notifying organization owners:', err.message);
    }
  }
}
