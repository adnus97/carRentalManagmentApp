// utils/better-auth/better-auth.module.ts
import { Module, Global } from '@nestjs/common';
import { BetterAuthService } from './better-auth.service';
import { DatabaseModule } from '../../db'; // adjust path if needed
import { EmailModule } from '../../email/email.module';
import { BETTER_AUTH } from './better-auth';

@Global()
@Module({
  imports: [DatabaseModule, EmailModule], // IMPORTANT
  providers: [BetterAuthService, BETTER_AUTH],
  exports: [BetterAuthService],
})
export class BetterAuthModule {}
