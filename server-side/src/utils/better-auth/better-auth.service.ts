import { Inject, Injectable } from '@nestjs/common';
import { AUTH_SERVICE, type BetterAuthService as BAS } from './better-auth';
import ImageKit from 'imagekit';
import { get } from 'http';

@Injectable()
export class BetterAuthService {
  auth: BAS;
  constructor(@Inject(AUTH_SERVICE) private readonly betterauth: BAS) {
    this.auth = this.betterauth;
  }
}
