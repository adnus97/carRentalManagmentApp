// better-auth.ts
import { DatabaseService } from '../../db';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { betterAuth, type Auth } from 'better-auth';
import { schema } from '../../db';
import { ExecutionContext } from '@nestjs/common';
import { EmailService } from '../../email/email.service';

export type BetterAuthService = Auth;
export const AUTH_SERVICE = 'AUTH_SERVICE';

export function getRequestResponseFromContext(context: ExecutionContext) {
  const http = context.switchToHttp();
  const req = http.getRequest();
  const res = http.getResponse();
  return { req, res };
}

export const BETTER_AUTH = {
  provide: AUTH_SERVICE,
  useFactory: (database: DatabaseService, emailService: EmailService) => {
    database.onModuleInit();

    const send = async (to: string, subject: string, html: string) => {
      await emailService.sendEmail({
        recipients: [to],
        subject,
        html,
      });
    };

    const auth = betterAuth({
      emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
      },
      trustedOrigins: ['http://localhost:5173'],
      baseUrl: 'http://localhost:3000',
      basePath: '/api/v1/auth',
      database: drizzleAdapter(database.db, {
        provider: 'pg',
        schema: {
          user: schema.users,
          session: schema.session,
          verification: schema.verification,
          account: schema.account,
        },
      }),
      socialProviders: {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        },
      },
      user: {
        changeEmail: {
          enabled: true,
          sendChangeEmailVerification: async ({ user, url }) => {
            await send(
              user.email,
              'Approve Email Change',
              `
              <h2>Email Change Request</h2>
              <p>Click the link below to approve the email change:</p>
              <a href="${url}">Approve Change</a>
              `,
            );
          },
        },
        deleteUser: {
          enabled: true,
          sendDeleteAccountVerification: async ({ user, url }) => {
            await send(
              user.email,
              'Confirm Account Deletion',
              `
              <h2>Delete Account</h2>
              <p>Click the link below to confirm account deletion:</p>
              <a href="${url}">Delete Account</a>
              `,
            );
          },
        },
      },
      account: {
        accountLinking: {
          enabled: true,
          trustedProviders: ['google'],
        },
      },
      session: {
        freshAge: 60 * 60 * 24,
      },
      emailVerification: {
        sendOnSignUp: true,
        autoSignInAfterVerification: true,
        sendVerificationEmail: async ({ user, url }) => {
          await send(
            user.email,
            'Verify Your Email Address',
            `
            <h2>Email Verification</h2>
            <p>Please click the link below to verify your email address:</p>
            <a href="${url}">Verify Email</a>
            `,
          );
        },
      },
      resetPassword: {
        sendResetPassword: async ({ user, url }) => {
          await send(
            user.email,
            'Reset Your Password',
            `
            <h2>Password Reset</h2>
            <p>Click the link below to reset your password:</p>
            <a href="${url}">Reset Password</a>
            `,
          );
        },
      },
    });

    return auth;
  },
  inject: [DatabaseService, EmailService], // IMPORTANT
};
