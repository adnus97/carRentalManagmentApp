import {
  Get,
  Post,
  Body,
  ValidationPipe,
  Param,
  Controller,
  Req,
  Put,
  Query,
  BadRequestException,
} from '@nestjs/common';

import { Auth, CurrentUser, CustomUser } from 'src/auth/auth.guard';
import { CarsService } from './cars.service';
import { CreateCarDto } from './dto/create-car.dto';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { CreateMonthlyTargetDto } from './dto/create-monthly-target.dto';
import { CreateOilChangeDto } from './dto/create-oil-change.dto';

@Auth()
@Controller('cars')
export class CarsController {
  constructor(private readonly carsService: CarsService) {}

  /** Helper to ensure JSON-safe responses */
  private safeReturn<T>(data: T): T {
    return JSON.parse(JSON.stringify(data));
  }

  /** Centralized controller-level error handler */
  private handleControllerError(error: any): never {
    // If it's already a NestJS HTTP exception, rethrow it
    if (error instanceof BadRequestException) throw error;
    if (error.getStatus && error.getResponse) throw error;

    // Otherwise, wrap it in a generic BadRequestException
    throw new BadRequestException(
      error?.message || 'An unexpected error occurred',
    );
  }

  @Get()
  async findAll(
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
  ) {
    try {
      const pageNum = Math.max(1, parseInt(page || '1', 10));
      const pageSizeNum = Math.max(1, parseInt(pageSize || '20', 10));
      return this.safeReturn(
        await this.carsService.findAll(pageNum, pageSizeNum),
      );
    } catch (error) {
      this.handleControllerError(error);
    }
  }

  @Get('/org')
  async findCarsByOrgId(
    @CurrentUser() user: CustomUser,
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
  ) {
    try {
      const pageNum = Math.max(1, parseInt(page || '1', 10));
      const pageSizeNum = Math.max(1, parseInt(pageSize || '20', 10));
      return this.safeReturn(
        await this.carsService.findCarsByOrgId(user.id, pageNum, pageSizeNum),
      );
    } catch (error) {
      this.handleControllerError(error);
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      return this.safeReturn(await this.carsService.findOne(id));
    } catch (error) {
      this.handleControllerError(error);
    }
  }
  @Get(':id/details')
  async getCarDetails(@Param('id') id: string, @Req() req: any) {
    try {
      return this.safeReturn(
        await this.carsService.getCarDetails(id, req.user?.sub),
      );
    } catch (error) {
      this.handleControllerError(error);
    }
  }
  @Post()
  async createCar(
    @Body(ValidationPipe) createCarDto: CreateCarDto,
    @CurrentUser() user: CustomUser,
  ) {
    try {
      return this.safeReturn(
        await this.carsService.createCar(createCarDto, user.id),
      );
    } catch (error) {
      this.handleControllerError(error);
    }
  }

  @Put(':id')
  async updateCar(
    @Param('id') id: string,
    @Body(ValidationPipe) updateData: Partial<CreateCarDto>,
  ) {
    try {
      return this.safeReturn(await this.carsService.updateCar(id, updateData));
    } catch (error) {
      this.handleControllerError(error);
    }
  }

  // ✅ Targets
  @Post(':id/targets')
  async createMonthlyTarget(
    @Param('id') carId: string,
    @Body() createTargetDto: CreateMonthlyTargetDto,
    @Req() req: any,
  ) {
    try {
      return this.safeReturn(
        await this.carsService.createMonthlyTarget(
          carId,
          createTargetDto,
          req.user?.sub,
        ),
      );
    } catch (error) {
      this.handleControllerError(error);
    }
  }
  @Get(':id/targets')
  async getCarTargets(
    @Param('id') carId: string,
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
    @Req() req: any,
  ) {
    const pageNum = Math.max(1, parseInt(page || '1', 10));
    const pageSizeNum = Math.max(1, parseInt(pageSize || '10', 10));
    return this.safeReturn(
      await this.carsService.getCarTargets(
        carId,
        pageNum,
        pageSizeNum,
        req.user?.sub,
      ),
    );
  }

  @Get(':id/maintenance')
  async getCarMaintenanceLogs(
    @Param('id') carId: string,
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
  ) {
    const pageNum = Math.max(1, parseInt(page || '1', 10));
    const pageSizeNum = Math.max(1, parseInt(pageSize || '10', 10));
    return this.safeReturn(
      await this.carsService.getCarMaintenanceLogs(carId, pageNum, pageSizeNum),
    );
  }

  @Get(':id/oil-changes')
  async getCarOilChanges(
    @Param('id') carId: string,
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
  ) {
    const pageNum = Math.max(1, parseInt(page || '1', 10));
    const pageSizeNum = Math.max(1, parseInt(pageSize || '10', 10));
    return this.safeReturn(
      await this.carsService.getCarOilChanges(carId, pageNum, pageSizeNum),
    );
  }

  @Get(':id/rentals')
  async getCarRentals(
    @Param('id') carId: string,
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
  ) {
    const pageNum = Math.max(1, parseInt(page || '1', 10));
    const pageSizeNum = Math.max(1, parseInt(pageSize || '10', 10));
    return this.safeReturn(
      await this.carsService.getCarRentals(carId, pageNum, pageSizeNum),
    );
  }
}
