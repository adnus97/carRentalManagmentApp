'use client';

import React, { useState, useEffect, useRef } from 'react';
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

  // Use sessionStorage to persist verification state across re-renders
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

  const mountCount = useRef(0);
  const lastStateChange = useRef<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormFields>({
    resolver: zodResolver(schema),
  });

  const { user } = useUser();

  // Debug: Track component mounts and state changes
  useEffect(() => {
    mountCount.current += 1;
    console.log(`🔄 Component render #${mountCount.current}`);
    console.log('Current state:', { showVerificationMessage, userEmail });
    console.log('User from context:', user);
  }, [showVerificationMessage, userEmail, user]);

  // Sync state to sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (showVerificationMessage) {
        sessionStorage.setItem('showVerificationMessage', 'true');
        sessionStorage.setItem('verificationEmail', userEmail);
        console.log('💾 Saved verification state to sessionStorage');
      } else {
        sessionStorage.removeItem('showVerificationMessage');
        sessionStorage.removeItem('verificationEmail');
      }
    }
  }, [showVerificationMessage, userEmail]);

  const onSubmit = async (data: FormFields) => {
    console.log('=== SIGNUP FLOW START ===');
    console.log('1. Form data:', { email: data.email, name: data.name });
    console.log(
      '2. Current showVerificationMessage state:',
      showVerificationMessage,
    );

    try {
      console.log('3. Calling authClient.signUp.email...');

      const response = await authClient.signUp.email({
        email: data.email,
        password: data.password,
        name: data.name,
      });

      console.log('4. Response received:', response);
      console.log('5. Response type:', typeof response);
      console.log(
        '6. Response keys:',
        response ? Object.keys(response) : 'null',
      );

      // Check if signup was successful
      if (response?.error) {
        console.log('7. ERROR PATH - Response has error:', response.error);
        toast({
          type: 'error',
          title: t('signup.failed_title', 'Signup Failed'),
          description:
            response.error.message ||
            t('signup.failed_desc', 'Something went wrong'),
        });
        return;
      }

      // Success - show verification message
      console.log('8. SUCCESS PATH - Setting email and showing verification');
      console.log('9. Setting userEmail to:', data.email);
      setUserEmail(data.email);

      console.log('10. Setting showVerificationMessage to true');
      lastStateChange.current = 'verification-set';
      setShowVerificationMessage(true);

      console.log('11. Resetting form');
      reset();

      console.log('12. Showing success toast');
      toast({
        type: 'success',
        title: t('signup.created_title', 'Account Created'),
        description: t(
          'signup.created_desc',
          'Check your email to verify your account.',
        ),
      });

      console.log(
        '13. After all state updates, showVerificationMessage should be true',
      );

      // CRITICAL: Prevent any navigation or session updates from resetting the form
      // Wait a bit to ensure state is committed
      setTimeout(() => {
        console.log(
          '14. After timeout, checking state:',
          showVerificationMessage,
        );
      }, 100);
    } catch (error: any) {
      console.error('=== CAUGHT ERROR ===');
      console.error('Error object:', error);
      console.error('Error type:', typeof error);
      console.error('Error code:', error?.code);
      console.error('Error message:', error?.message);
      console.error('Full error:', JSON.stringify(error, null, 2));

      // Handle specific error codes
      if (error?.code === 'USER_ALREADY_EXISTS') {
        console.log('User already exists error');
        toast({
          type: 'error',
          title: t('signup.failed_title', 'Signup Failed'),
          description: t(
            'signup.user_exists',
            'An account with this email already exists.',
          ),
        });
      } else {
        console.log('Generic error');
        toast({
          type: 'error',
          title: t('signup.failed_title', 'Signup Failed'),
          description:
            error?.message || t('signup.failed_desc', 'Something went wrong'),
        });
      }
    }

    console.log('=== SIGNUP FLOW END ===');
  };

  // Verification message screen
  if (showVerificationMessage) {
    console.log('=== RENDERING VERIFICATION SCREEN ===');
    console.log('userEmail:', userEmail);

    return (
      <div
        className={cn('flex flex-col gap-6 relative min-h-screen', className)}
        {...props}
      >
        {/* Centered Content */}
        <div className="flex items-center justify-center min-h-screen p-4">
          <Card className="bg-gray-2 w-full max-w-md">
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
                <div className="font-semibold text-foreground">{userEmail}</div>
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
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {t(
                    'signup.verify_hint',
                    "Click the link in the email to activate your account. Check your spam folder if you don't see it.",
                  )}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    console.log('Resetting verification screen');
                    setShowVerificationMessage(false);
                    setUserEmail('');
                    if (typeof window !== 'undefined') {
                      sessionStorage.removeItem('showVerificationMessage');
                      sessionStorage.removeItem('verificationEmail');
                    }
                  }}
                  className="flex-1"
                >
                  {t('common.try_different_email', 'Try Different Email')}
                </Button>
                <Button
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      sessionStorage.removeItem('showVerificationMessage');
                      sessionStorage.removeItem('verificationEmail');
                    }
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
    );
  }

  // Signup form
  console.log('=== RENDERING SIGNUP FORM ===');
  console.log('showVerificationMessage:', showVerificationMessage);

  return (
    <div className="flex min-h-[100dvh] flex-col w-full scroll-y-auto">
      <div className="flex-none flex w-full items-center justify-between px-4 py-3 z-10">
        <div className="flex items-center gap-2 ">
          <LanguageSelector />
        </div>

        <div className="flex items-center">
          <ModeToggle />
        </div>
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
