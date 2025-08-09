import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseService } from '../db';
import { rents } from '../db/schema/rents';
import { eq, lte, and, ne, isNotNull, gt } from 'drizzle-orm';

@Injectable()
export class RentStatusCronService {
  private readonly logger = new Logger(RentStatusCronService.name);

  constructor(private readonly dbService: DatabaseService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async autoUpdateRentStatuses() {
    try {
      const now = new Date();
      let totalUpdated = 0;

      // 1. Update reserved → active (when start date has passed)
      const reservedToActive = await this.dbService.db
        .update(rents)
        .set({ [rents.status.name as any]: 'active' })
        .where(
          and(
            eq(rents.status, 'reserved'),
            lte(rents.startDate, now),
            eq(rents.isDeleted, false),
          ),
        )
        .execute();

      if (reservedToActive.rowCount > 0) {
        this.logger.log(
          `Updated ${reservedToActive.rowCount} rent(s) from reserved to active`,
        );
        totalUpdated += reservedToActive.rowCount;
      }

      // 2. Update active → completed (when returned and return date has passed)
      const activeToCompleted = await this.dbService.db
        .update(rents)
        .set({ [rents.status.name as any]: 'completed' })
        .where(
          and(
            eq(rents.status, 'active'),
            isNotNull(rents.returnedAt),
            lte(rents.returnedAt, now),
            eq(rents.isDeleted, false),
          ),
        )
        .execute();

      if (activeToCompleted.rowCount > 0) {
        this.logger.log(
          `Updated ${activeToCompleted.rowCount} rent(s) from active to completed`,
        );
        totalUpdated += activeToCompleted.rowCount;
      }

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
}
