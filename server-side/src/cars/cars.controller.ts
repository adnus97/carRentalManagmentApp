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
} from '@nestjs/common';

import { Auth, CurrentUser, CustomUser } from 'src/auth/auth.guard';
import { CarsService } from './cars.service';
import { CreateCarDto } from './dto/create-car.dto';

@Auth()
@Controller('cars')
export class CarsController {
  constructor(private readonly carsService: CarsService) {}

  @Get()
  findAll(@Query('page') page: string, @Query('pageSize') pageSize: string) {
    const pageNum = Math.max(1, parseInt(page || '1', 10));
    const pageSizeNum = Math.max(1, parseInt(pageSize || '20', 10));
    return this.carsService.findAll(pageNum, pageSizeNum);
  }

  @Get('/org')
  findCarsByOrgId(
    @CurrentUser() user: CustomUser,
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
  ) {
    const pageNum = Math.max(1, parseInt(page || '1', 10));
    const pageSizeNum = Math.max(1, parseInt(pageSize || '20', 10));
    const userId = user.id;
    return this.carsService.findCarsByOrgId(userId, pageNum, pageSizeNum);
  }
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.carsService.findOne(id);
  }

  @Post()
  createCar(
    @Body(ValidationPipe) createCarDto: CreateCarDto,
    @CurrentUser() user: CustomUser,
  ) {
    const userId = user.id;
    console.log('User ID:', userId);
    return this.carsService.createCar(createCarDto, userId);
  }

  @Put(':id')
  updateCar(
    @Param('id') id: string,
    @Body(ValidationPipe) updateData: Partial<CreateCarDto>,
  ) {
    return this.carsService.updateCar(id, updateData);
  }
}
