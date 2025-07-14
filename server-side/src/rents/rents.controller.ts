import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ValidationPipe,
} from '@nestjs/common';
import { RentsService } from './rents.service';
import { CreateRentDto } from './dto/create-rent.dto';
import { UpdateRentDto } from './dto/update-rent.dto';
import { Auth, CurrentUser, CustomUser } from 'src/auth/auth.guard';

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
    return this.rentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.rentsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRentDto: UpdateRentDto) {
    return this.rentsService.update(+id, updateRentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.rentsService.remove(+id);
  }
}
