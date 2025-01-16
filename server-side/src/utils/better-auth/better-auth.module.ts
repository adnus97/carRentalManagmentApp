import { Module, Global } from '@nestjs/common';
import { BetterAuthService } from './better-auth.service';
import { BETTER_AUTH } from './better-auth';

@Global()
@Module({
  providers: [BETTER_AUTH, BetterAuthService],
  exports: [BETTER_AUTH, BetterAuthService],
})
export class BetterAuthModule {}

export { AUTH_SERVICE } from './better-auth';
export { BetterAuthService } from './better-auth.service';
