import {
  Controller,
  Get,
  Query,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { Auth, CurrentUser, CustomUser } from 'src/auth/auth.guard';

type Preset =
  | 'today'
  | 'yesterday'
  | 'last24h'
  | 'last7d'
  | 'last30d'
  | 'last90d'
  | 'thisYear'
  | 'prevMonth'
  | 'prevTrimester'
  | 'prevSemester'
  | 'prevYear';

type Interval = 'day' | 'week' | 'month';

@Auth()
@Controller('reports')
export class ReportsController {
  constructor(
    @Inject(ReportsService) private readonly reportsService: ReportsService, // ✅ Add @Inject()
  ) {
    console.log('🔧 ReportsController constructor called');
    console.log('🔧 ReportsService injected:', !!this.reportsService);
  }

  /**
   * GET /reports/summary
   * Example:
   *   /reports/summary?preset=last30d
   *   /reports/summary?from=2025-01-01&to=2025-01-31&interval=day
   *   /reports/summary?preset=last7d&carId=car123
   */
  @Get('summary')
  async getSummary(
    @CurrentUser() user: CustomUser,
    @Query('preset') preset?: Preset,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('interval') interval?: Interval,
    @Query('carId') carId?: string,
  ) {
    try {
      return await this.reportsService.getSummary({
        userId: user.id,
        preset,
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined,
        interval,
        carId,
      });
    } catch (err) {
      if (err.getStatus && err.getResponse) throw err;
      throw new BadRequestException(err?.message || 'Unable to load report');
    }
  }
}
