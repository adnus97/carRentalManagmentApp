// src/users/users.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseService } from 'src/db';
import { users } from 'src/db/schema/users';
import { eq } from 'drizzle-orm';

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}

  async updateLocale(userId: string, locale: string) {
    if (!userId) throw new BadRequestException('Missing userId');
    await this.db.db
      .update(users)
      .set({ locale, updatedAt: new Date() })
      .where(eq(users.id, userId));
    return { success: true };
  }
}
