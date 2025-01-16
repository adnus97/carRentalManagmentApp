import { Inject, Injectable } from '@nestjs/common';
import { AUTH_SERVICE, type BetterAuthService as BAS } from './better-auth';

@Injectable()
export class BetterAuthService {
  auth: BAS;
  constructor(@Inject(AUTH_SERVICE) private readonly betterauth: BAS) {
    this.auth = this.betterauth;
  }
}
