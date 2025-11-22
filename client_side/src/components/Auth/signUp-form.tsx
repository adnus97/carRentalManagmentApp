'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link, useNavigate } from '@tanstack/react-router';
import { authClient } from '@/lib/auth-client';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader } from '@/components/loader';
import { useUser } from '@/contexts/user-context';
import { toast } from '../ui/toast';
import { ModeToggle } from '../mode-toggle';
import LanguageSelector from '../language-selector';
import { useTranslation } from 'react-i18next';

// Zod schema with i18n keys (so UI can do t(errors.field.message))
const schema = z
  .object({
    name: z.string().min(2, 'signup.zod.name_min'),
    password: z
      .string()
      .min(8, 'signup.zod.password_min')
      .regex(/[A-Z]/, 'signup.zod.password_upper')
      .regex(/[a-z]/, 'signup.zod.password_lower')
      .regex(/[0-9]/, 'signup.zod.password_number')
      .regex(/[@$!%*?&]/, 'signup.zod.password_special'),
    email: z
      .string()
      .email('signup.zod.email_invalid')
      .nonempty('signup.zod.email_required'),
    passwordVerification: z.string(),
  })
  .refine((data) => data.password === data.passwordVerification, {
    path: ['passwordVerification'],
    message: 'signup.zod.passwords_mismatch',
  });

type FormFields = z.infer<typeof schema>;

export function SignupForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'div'>) {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormFields>({
    resolver: zodResolver(schema),
  });

  const { setUser } = useUser();

  const handleGoogleSignUp = async () => {
    try {
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: '/organizationForm',
      });
    } catch (error: any) {
      toast({
        type: 'error',
        title: t('signup.failed_title', 'Signup Failed'),
        description:
          error?.message || t('signup.failed_title', 'Signup Failed'),
      });
    }
  };

  const onSubmit = async (data: FormFields) => {
    try {
      await authClient.signUp.email(
        {
          email: data.email,
          password: data.password,
          name: data.name,
        },
        {
          onRequest: () => {},
          onSuccess: () => {
            setUserEmail(data.email);
            setShowVerificationMessage(true);
            reset();

            toast({
              type: 'success',
              title: t('signup.created_title', 'Account Created'),
              description: t(
                'signup.created_desc',
                'Check your email to verify your account.',
              ),
            });
          },
          onError: (ctx: any) => {
            if (ctx?.error?.code === 'USER_ALREADY_EXISTS') {
              toast({
                type: 'error',
                title: t('signup.failed_title', 'Signup Failed'),
                description: ctx.error.message,
              });
            } else {
              toast({
                type: 'error',
                title: t('signup.failed_title', 'Signup Failed'),
                description:
                  ctx?.error?.message ||
                  t('signup.failed_title', 'Signup Failed'),
              });
            }
          },
        },
      );
    } catch (error: any) {
      toast({
        type: 'error',
        title: t('signup.failed_title', 'Signup Failed'),
        description:
          error?.message || t('signup.failed_title', 'Signup Failed'),
      });
    }
  };

  if (showVerificationMessage) {
    return (
      <div
        className={cn('flex flex-col gap-6 relative min-h-screen', className)}
        {...props}
      >
        {/* Theme Toggle - Top Right */}
        <div className="absolute top-4 right-4 z-10">
          <ModeToggle />
        </div>

        {/* Centered Content */}
        <div className="flex items-center justify-center min-h-screen p-4">
          <Card className="bg-gray-2 w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">
                {t('signup.verify_title', 'Check Your Email')}
              </CardTitle>
              <CardDescription>
                {t('signup.verify_desc', { email: userEmail })}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {t(
                    'signup.verify_hint',
                    'Click the link to activate your account. Check your spam if you don’t see it.',
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowVerificationMessage(false)}
                  className="flex-1"
                >
                  {t('common.try_different_email', 'Try Different Email')}
                </Button>
                <Button
                  onClick={() => navigate({ to: '/login' })}
                  className="flex-1"
                >
                  {t('common.back_to_login', 'Back to Login')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col w-full">
      <div className="flex w-full items-center justify-between gap-4 px-4 py-3">
        <div>
          <LanguageSelector />
        </div>
        <ModeToggle />
      </div>

      {/* Centered Signup Form */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <Card className="bg-gray-2">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">
                {t('signup.title', 'Sign Up')}
              </CardTitle>
              <CardDescription>
                {t('signup.subtitle', 'Create your account to get started.')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="grid gap-6">
                  <div className="grid gap-6">
                    <div className="grid gap-2">
                      <Label htmlFor="name" className="text-justify">
                        {t('common.name', 'Name')}{' '}
                        <span className="text-red-700">*</span>
                      </Label>
                      <Input
                        id="name"
                        type="text"
                        className={
                          errors.name
                            ? 'border-red-600 focus:outline-none focus:ring-0 focus:ring-offset-0'
                            : ''
                        }
                        {...register('name', {
                          required: 'signup.zod.name_min',
                        })}
                      />
                      {errors.name && (
                        <span className="text-red-600 text-sm">
                          {t(errors.name.message as any)}
                        </span>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="email" className="text-justify">
                        {t('common.email', 'Email')}{' '}
                        <span className="text-red-700">*</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        className={
                          errors.email ? 'border-red-600 outline-none' : ''
                        }
                        placeholder="m@example.com"
                        {...register('email')}
                      />
                      {errors.email && (
                        <span className="text-red-600 text-sm">
                          {t(errors.email.message as any)}
                        </span>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="password">
                        {t('common.password', 'Password')}{' '}
                        <span className="text-red-700">*</span>
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        {...register('password')}
                        className={
                          errors.password ? 'border-red-600 outline-none' : ''
                        }
                      />
                      {errors.password && (
                        <span className="text-red-600 text-sm">
                          {t(errors.password.message as any)}
                        </span>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="passwordVerification">
                        {t('common.confirm_password', 'Confirm Password')}{' '}
                        <span className="text-red-700">*</span>
                      </Label>
                      <Input
                        id="passwordVerification"
                        type="password"
                        {...register('passwordVerification')}
                        className={
                          errors.passwordVerification
                            ? 'border-red-600 outline-none'
                            : ''
                        }
                      />
                      {errors.passwordVerification && (
                        <span className="text-red-600 text-sm">
                          {t(errors.passwordVerification.message as any)}
                        </span>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader />
                          <span>
                            {t('signup.button_loading', 'Creating...')}
                          </span>
                        </>
                      ) : (
                        t('signup.button', 'Sign Up')
                      )}
                    </Button>
                  </div>

                  <div className="text-center text-sm">
                    {t('common.already_account', 'Already have an account?')}{' '}
                    <Link to="/login" className="underline underline-offset-4">
                      {t('signup.signup_link', 'Sign up')}
                    </Link>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
