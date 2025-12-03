// better-auth.ts
import { DatabaseService } from '../../db';

import { schema } from '../../db';
import { ExecutionContext } from '@nestjs/common';
import { EmailService } from '../../email/email.service';

export type BetterAuthService = any;
export const AUTH_SERVICE = 'AUTH_SERVICE';

export function getRequestResponseFromContext(context: ExecutionContext) {
  const http = context.switchToHttp();
  const req = http.getRequest();
  const res = http.getResponse();
  return { req, res };
}

export const BETTER_AUTH = {
  provide: AUTH_SERVICE,
  useFactory: async (database: DatabaseService, emailService: EmailService) => {
    database.onModuleInit();
    const { betterAuth } = await import('better-auth');
    const { drizzleAdapter } = await import('better-auth/adapters/drizzle');
    const send = async (to: string, subject: string, html: string) => {
      await emailService.sendEmail({
        recipients: [to],
        subject,
        html,
      });
    };

    const auth = betterAuth({
      database: drizzleAdapter(database.db, {
        provider: 'pg',
        schema: {
          user: schema.users,
          session: schema.session,
          verification: schema.verification,
          account: schema.account,
        },
      }),

      baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
      secret: process.env.BETTER_AUTH_SECRET!,
      basePath: '/api/v1/auth',

      trustedOrigins: [
        'http://localhost:5173',
        'http://localhost:3000',
        process.env.FRONTEND_URL,
      ].filter(Boolean),

      emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
        sendResetPassword: async ({ user, url, token }) => {
          // Create frontend URL instead of backend URL
          const frontendUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;

          await send(
            user.email,
            'Reset Your Password',
            `
            <div style="padding: 40px; text-align: center;">
              <h2>Password Reset Request</h2>
              <p>You requested a password reset. If you didn't make this request, please ignore this email.</p>
              <p>Click the link below to reset your password:</p>
              <a href="${frontendUrl}" style="background: #ef4444; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block;">
                Reset Password
              </a>
              <p>This link will expire in 1 hour.</p>
            </div>
            `,
          );
        },
      },

      socialProviders: {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        },
      },

      user: {
        changeEmail: {
          enabled: true,
          sendChangeEmailVerification: async ({ user, url, token }) => {
            // Fix: Use proper template string syntax
            const frontendUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${token}&type=change-email`;

            await send(
              user.email,
              'Approve Email Change',
              `
        <div style="padding: 40px; text-align: center;">
          <h2>Email Change Request</h2>
          <p>You requested to change your email address. Click the link below to approve this change:</p>
          <a href="${frontendUrl}" style="background: #10b981; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block;">
            Approve Change
          </a>
        </div>
        `,
            );
          },
        },
        deleteUser: {
          enabled: true,
          sendDeleteAccountVerification: async ({ user, url, token }) => {
            // Create frontend URL
            const frontendUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${token}&type=delete-account`;

            await send(
              user.email,
              'Confirm Account Deletion',
              `
        <div style="padding: 40px; text-align: center;">
          <h2>Delete Account Confirmation</h2>
          <p>You requested to delete your account. This action cannot be undone.</p>
          <p>Click the link below to confirm account deletion:</p>
          <a href="${frontendUrl}" style="background: #ef4444; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block;">
            Delete Account
          </a>
        </div>
        `,
            );
          },
        },
        additionalFields: {
          role: {
            type: 'string',
            required: true,
            defaultValue: 'user',
            input: false, // Not settable by user
            returned: true, // ✅ MUST BE TRUE
          },
          subscriptionStatus: {
            type: 'string',
            required: false,
            input: false,
            returned: true, // ✅ MUST BE TRUE
          },
          subscriptionStartDate: {
            type: 'date',
            required: false,
            input: false,
            returned: true,
          },
          subscriptionEndDate: {
            type: 'date',
            required: false,
            input: false,
            returned: true,
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
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60 * 24, // 1 day
      },

      emailVerification: {
        sendOnSignUp: true,
        autoSignInAfterVerification: true,
        expiresIn: 60 * 60 * 24, // 24 hours
        sendVerificationEmail: async ({ user, url, token }) => {
          // Fix: Use proper template string syntax
          const frontendUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${token}`;

          await send(
            user.email,
            'Verify Your Email Address',
            `
      <div style="padding: 40px; text-align: center;">
        <h2>Welcome to VelCar!</h2>
        <p>Thank you for signing up! Please click the link below to verify your email address:</p>
        <a href="${frontendUrl}" style="background: #667eea; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block;">
          Verify Email
        </a>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create this account, please ignore this email.</p>
      </div>
      `,
          );
        },
      },
    });

    return auth;
  },
  inject: [DatabaseService, EmailService],
};
