import { Module, Global } from '@nestjs/common';
import { BetterAuthModule } from 'src/utils/better-auth/better-auth.module';
import { AuthController } from './auth.controller';
import { DatabaseModule } from 'src/db';
import { AuthGuard } from './auth.guard';

@Global()
@Module({
  imports: [BetterAuthModule, DatabaseModule],
  providers: [AuthGuard],
  controllers: [AuthController],
  exports: [AuthGuard],
})
export class AuthModule {}
