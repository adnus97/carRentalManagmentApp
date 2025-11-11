import { Module, Global } from '@nestjs/common';
import { BetterAuthModule } from 'src/utils/better-auth/better-auth.module';
import { AuthController } from './auth.controller';
import { DatabaseModule } from 'src/db';

@Global()
@Module({
  imports: [BetterAuthModule, DatabaseModule],
  controllers: [AuthController],
})
export class AuthModule {}
