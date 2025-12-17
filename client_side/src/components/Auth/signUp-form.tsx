'use client';

import React, { useEffect, useRef, useState } from 'react';
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

// Zod schema with i18n keys
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

  const { user } = useUser();

  // Persist verification screen across reloads
  const [showVerificationMessage, setShowVerificationMessage] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('showVerificationMessage') === 'true';
    }
    return false;
  });

  const [userEmail, setUserEmail] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('verificationEmail') || '';
    }
    return '';
  });

  // Debug helpers (optional)
  const mountCount = useRef(0);
  useEffect(() => {
    mountCount.current += 1;
    // eslint-disable-next-line no-console
    console.log(`🔄 SignupForm render #${mountCount.current}`, {
      showVerificationMessage,
      userEmail,
      user,
    });
  }, [showVerificationMessage, userEmail, user]);

  // Sync state to sessionStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (showVerificationMessage) {
      sessionStorage.setItem('showVerificationMessage', 'true');
      sessionStorage.setItem('verificationEmail', userEmail);
    } else {
      sessionStorage.removeItem('showVerificationMessage');
      sessionStorage.removeItem('verificationEmail');
    }
  }, [showVerificationMessage, userEmail]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormFields>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormFields) => {
    try {
      const response = await authClient.signUp.email({
        email: data.email,
        password: data.password,
        name: data.name,
      });

      if (response?.error) {
        toast({
          type: 'error',
          title: t('signup.failed_title', 'Signup Failed'),
          description:
            response.error.message ||
            t('signup.failed_desc', 'Something went wrong'),
        });
        return;
      }

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
    } catch (error: any) {
      if (error?.code === 'USER_ALREADY_EXISTS') {
        toast({
          type: 'error',
          title: t('signup.failed_title', 'Signup Failed'),
          description: t(
            'signup.user_exists',
            'An account with this email already exists.',
          ),
        });
        return;
      }

      toast({
        type: 'error',
        title: t('signup.failed_title', 'Signup Failed'),
        description:
          error?.message || t('signup.failed_desc', 'Something went wrong'),
      });
    }
  };

  const TopBar = () => {
    return (
      <div className="flex-none flex w-full items-center justify-between px-4 py-3 z-10 shrink-0">
        <div className="flex items-center gap-2">
          <LanguageSelector />
        </div>
        <div className="flex items-center">
          <ModeToggle />
        </div>
      </div>
    );
  };

  // Verification screen
  if (showVerificationMessage) {
    return (
      <div
        className={cn('flex min-h-[100dvh] flex-col w-full overflow-y-auto')}
      >
        <TopBar />

        <div
          className={cn(
            'flex flex-1 items-center justify-center px-4 py-4',
            className,
          )}
          {...props}
        >
          <div className="w-full max-w-[760px] md:max-w-[860px] lg:max-w-[920px]">
            <Card className="bg-gray-2 w-full">
              <CardHeader className="text-center">
                <CardTitle className="text-xl">
                  {t('signup.verify_title', 'Check Your Email')}
                </CardTitle>
                <CardDescription className="space-y-2">
                  <div>
                    {t(
                      'signup.verify_desc_part1',
                      'We have sent a verification link to:',
                    )}
                  </div>
                  <div className="font-semibold text-foreground">
                    {userEmail}
                  </div>
                </CardDescription>
              </CardHeader>

              <CardContent className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-blue-600 dark:text-blue-400"
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

                <p className="text-sm text-muted-foreground">
                  {t(
                    'signup.verify_hint',
                    "Click the link in the email to activate your account. Check your spam folder if you don't see it.",
                  )}
                </p>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowVerificationMessage(false);
                      setUserEmail('');
                      sessionStorage.removeItem('showVerificationMessage');
                      sessionStorage.removeItem('verificationEmail');
                    }}
                    className="flex-1"
                  >
                    {t('common.try_different_email', 'Try Different Email')}
                  </Button>

                  <Button
                    onClick={() => {
                      sessionStorage.removeItem('showVerificationMessage');
                      sessionStorage.removeItem('verificationEmail');
                      navigate({ to: '/login' });
                    }}
                    className="flex-1"
                  >
                    {t('common.back_to_login', 'Back to Login')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Signup form screen
  return (
    <div className={cn('flex min-h-[100dvh] flex-col w-full overflow-y-auto')}>
      <TopBar />

      <div
        className={cn(
          'flex flex-1 items-center justify-center px-4 py-4',
          className,
        )}
        {...props}
      >
        <div className="w-full max-w-[760px] md:max-w-[860px] lg:max-w-[920px]">
          <Card className="overflow-hidden bg-gray-2 w-full">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">
                {t('signup.title', 'Sign Up')}
              </CardTitle>
              <CardDescription>
                {t('signup.subtitle', 'Create your account to get started.')}
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 md:p-8">
              <form onSubmit={handleSubmit(onSubmit)}>
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
                      placeholder="m@example.com"
                      className={
                        errors.email ? 'border-red-600 outline-none' : ''
                      }
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
                      className={
                        errors.password ? 'border-red-600 outline-none' : ''
                      }
                      {...register('password')}
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
                      className={
                        errors.passwordVerification
                          ? 'border-red-600 outline-none'
                          : ''
                      }
                      {...register('passwordVerification')}
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
                        <span>{t('signup.button_loading', 'Creating...')}</span>
                      </>
                    ) : (
                      t('signup.button', 'Sign Up')
                    )}
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        {t('common.or', 'Or')}
                      </span>
                    </div>
                  </div>

                  <div className="text-center text-sm">
                    {t('common.already_account', 'Already have an account?')}{' '}
                    <Link to="/login" className="underline underline-offset-4">
                      {t('signup.signup_link', 'Log In')}
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
