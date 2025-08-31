// src/rents/rent-status-cron.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseService } from '../db';
import { rents } from '../db/schema/rents';
import { eq, lte, and, isNotNull } from 'drizzle-orm';
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
        });

      await this.handleNotifications(
        reservedToActive,
        'RENT_STARTED',
        'info',
        (rent) => `Rental ${rent.id} has started for car ${rent.carId}`,
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
        });

      await this.handleNotifications(
        activeToCompleted,
        'RENT_COMPLETED',
        'success',
        (rent) => `Rental ${rent.id} has been completed for car ${rent.carId}`,
      );

      totalUpdated += activeToCompleted.length;

      // 3. overdue check
      const overdueRents = await this.dbService.db
        .select({
          id: rents.id,
          carId: rents.carId,
          customerId: rents.customerId,
        })
        .from(rents)
        .where(
          and(
            eq(rents.status, 'active'),
            lte(rents.expectedEndDate, now),
            eq(rents.isDeleted, false),
          ),
        );

      await this.handleNotifications(
        overdueRents,
        'RENT_OVERDUE',
        'warning',
        (rent) => `Rental ${rent.id} for car ${rent.carId} is overdue!`,
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

  /** 🔹 Helper to create notifications with debug logging */
  private async handleNotifications(
    rentsList: { id: string; carId: string; customerId: string }[],
    type: string,
    level: 'info' | 'success' | 'warning' | 'error',
    messageBuilder: (rent: { id: string; carId: string }) => string,
  ) {
    for (const rent of rentsList) {
      const notifData: CreateNotificationDto = {
        userId: rent.customerId,
        type,
        message: messageBuilder(rent),
        level,
        metadata: { rentId: rent.id, carId: rent.carId },
      };

      this.logger.debug(`[CRON] Notification payload for ${type}:`);
      this.logger.debug(JSON.stringify(notifData, null, 2));

      try {
        const result =
          await this.notificationsService.createNotification(notifData);
        this.logger.debug('[CRON] ✅ Notification created:');
        this.logger.debug(JSON.stringify(result, null, 2));
      } catch (err) {
        this.logger.error(
          `[CRON] ❌ Notification insert failed for rent ${rent.id}`,
        );
        this.logger.error(err.message);
      }
    }

    if (rentsList.length > 0) {
      this.logger.log(`Processed ${rentsList.length} rent(s) for ${type}`);
    }
  }
}
