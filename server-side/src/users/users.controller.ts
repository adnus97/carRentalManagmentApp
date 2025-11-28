// src/users/users.controller.ts
import { Body, Controller, Patch, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateLocaleDto } from './dto';
// Replace with your real auth guard/decorator
import { Auth, AuthGuard, CustomUser } from 'src/auth/auth.guard';
import { CurrentUser } from 'src/auth/auth.guard';

@Controller('users/me')
@Auth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('locale')
  async updateLocale(
    @Body() dto: UpdateLocaleDto,
    @CurrentUser('id') user: CustomUser,
  ) {
    await this.usersService.updateLocale(user.id, dto.locale);
    return { success: true, locale: dto.locale };
  }
}
