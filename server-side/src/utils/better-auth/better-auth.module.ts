import { Module, Global } from '@nestjs/common';
import { BetterAuthService } from './better-auth.service';
import { BETTER_AUTH } from './better-auth';

@Module({
  providers: [BETTER_AUTH],
  exports: [BETTER_AUTH],
})
class AuthModule {}
@Global()
@Module({
  imports: [AuthModule],
  providers: [BETTER_AUTH, BetterAuthService],
  exports: [BETTER_AUTH, BetterAuthService],
})
export class BetterAuthModule {}

export { AUTH_SERVICE } from './better-auth';
export { BetterAuthService } from './better-auth.service';
