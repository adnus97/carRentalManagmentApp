import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ValidationPipe,
  Put,
  Query,
} from '@nestjs/common';
import { RentsService } from './rents.service';
import { CreateRentDto } from './dto/create-rent.dto';
import { UpdateRentDto } from './dto/update-rent.dto';
import { Auth, CurrentUser, CustomUser } from 'src/auth/auth.guard';

function ensureDate(val: any) {
  if (val && typeof val === 'string') return new Date(val);
  return val;
}

@Auth()
@Controller('rents')
export class RentsController {
  constructor(private readonly rentsService: RentsService) {}

  @Post()
  create(
    @Body(ValidationPipe) createRentDto: CreateRentDto,
    @CurrentUser() user: CustomUser,
  ) {
    const userId = user.id;
    return this.rentsService.create(createRentDto, userId);
  }

  @Get()
  findAll() {
    return this.rentsService.findAll({});
  }

  @Get('/with-car-and-customer')
  async getAllRentsWithCarAndCustomer(
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
  ) {
    const pageNum = Math.max(1, parseInt(page || '1', 10));
    const pageSizeNum = Math.max(1, parseInt(pageSize || '20', 10));
    return this.rentsService.getAllRentsWithCarAndCustomer(
      pageNum,
      pageSizeNum,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.rentsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRentDto: UpdateRentDto) {
    return this.rentsService.update(id, updateRentDto);
  }

  @Put(':id')
  updateRent(
    @Param('id') id: string,
    @Body(ValidationPipe) updateData: Partial<CreateRentDto>,
  ) {
    return this.rentsService.update(id, updateData);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.rentsService.remove(id, {});
  }
}
