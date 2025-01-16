import { Module, Global } from '@nestjs/common';
import { BetterAuthModule } from 'src/utils/better-auth/better-auth.module';
import { AuthController } from './auth.controller';

@Global()
@Module({
  imports: [BetterAuthModule],
  controllers: [AuthController],
})
export class AuthModule {}
