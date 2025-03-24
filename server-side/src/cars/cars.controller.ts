import {
  Get,
  Post,
  Body,
  ValidationPipe,
  Param,
  Controller,
  Req,
} from '@nestjs/common';

import { Auth, CurrentUser, CustomUser } from 'src/auth/auth.guard';
import { CarsService } from './cars.service';
import { CreateCarDto } from './dto/create-car.dto';

@Auth()
@Controller('cars')
export class CarsController {
  constructor(private readonly carsService: CarsService) {}

  @Get()
  findAll() {
    return this.carsService.findAll();
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
}
