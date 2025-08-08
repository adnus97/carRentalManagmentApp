import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseService } from '../db';
import { rents } from '../db/schema/rents';
import { eq, lte, and, ne, isNotNull } from 'drizzle-orm';

@Injectable()
export class RentStatusCronService {
  private readonly logger = new Logger(RentStatusCronService.name);

  constructor(private readonly dbService: DatabaseService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async autoCompleteReturnedRents() {
    try {
      const now = new Date();
      const result = await this.dbService.db
        .update(rents)
        .set({ [rents.status.name as any]: 'completed' })
        .where(
          and(
            isNotNull(rents.returnedAt),
            lte(rents.returnedAt, now),
            eq(rents.status, 'active'),
            eq(rents.isDeleted, false),
          ),
        )
        .execute();

      if (result.rowCount > 0) {
        this.logger.log(
          `Auto-completed ${result.rowCount} rent(s) at ${now.toISOString()}`,
        );
      }
    } catch (err: any) {
      this.logger.error('Error auto-completing rents:', err.message);
      if (err.query) this.logger.error('SQL:', err.query);
    }
  }
}
