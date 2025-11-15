'use client';

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useLocation } from '@tanstack/react-router';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { authClient } from '@/lib/auth-client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Loader } from '@/components/loader';
import { ModeToggle } from '@/components/mode-toggle';
import { toast } from '@/components/ui/toast';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../language-selector';

const buildSchema = (t: (k: string, o?: any) => string) =>
  z
    .object({
      name: z.string().min(2, t('signup.zod.name_min')),
      email: z.string().email(t('signup.zod.email_invalid')),
      password: z
        .string()
        .min(8, t('signup.zod.password_min'))
        .regex(/[A-Z]/, t('signup.zod.password_upper'))
        .regex(/[a-z]/, t('signup.zod.password_lower'))
        .regex(/[0-9]/, t('signup.zod.password_number'))
        .regex(/[@$!%*?&]/, t('signup.zod.password_special')),
      passwordVerification: z.string(),
    })
    .refine((d) => d.password === d.passwordVerification, {
      path: ['passwordVerification'],
      message: t('signup.zod.passwords_mismatch'),
    });

type FormFields = z.infer<ReturnType<typeof buildSchema>>;

const PENDING_EMAIL_KEY = 'pendingVerificationEmail';
const PENDING_FLAG_KEY = 'pendingVerificationFlag';

export function SignupForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'div'>) {
  const { t, i18n } = useTranslation('auth');
  const navigate = useNavigate();
  const location = useLocation();

  const [showVerification, setShowVerification] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  // Rebuild schema when language changes so messages update
  const schema = useMemo(() => buildSchema(t), [i18n.language, t]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormFields>({ resolver: zodResolver(schema) });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const verifyFlag = params.get('verify');
    const savedEmail = localStorage.getItem(PENDING_EMAIL_KEY);
    const savedFlag = localStorage.getItem(PENDING_FLAG_KEY);
    if ((verifyFlag === '1' || savedFlag === '1') && savedEmail) {
      setUserEmail(savedEmail);
      setShowVerification(true);
    }
  }, [location.search]);

  const clearPending = () => {
    localStorage.removeItem(PENDING_EMAIL_KEY);
    localStorage.removeItem(PENDING_FLAG_KEY);
  };

  const onSubmit = async (data: FormFields) => {
    try {
      await authClient.signUp.email(
        { email: data.email, password: data.password, name: data.name },
        {
          onSuccess: () => {
            localStorage.setItem(PENDING_EMAIL_KEY, data.email);
            localStorage.setItem(PENDING_FLAG_KEY, '1');
            setUserEmail(data.email);
            setShowVerification(true);
            reset();
            toast({
              type: 'success',
              title: t('signup.created_title'),
              description: t('signup.created_desc'),
            });
          },
          onError: (ctx: any) => {
            toast({
              type: 'error',
              title: t('signup.failed_title'),
              description:
                ctx?.error?.message ||
                (ctx?.error?.code === 'USER_ALREADY_EXISTS'
                  ? t('signup.failed_title')
                  : t('signup.failed_title')),
            });
          },
        },
      );
    } catch (err: any) {
      toast({
        type: 'error',
        title: t('signup.failed_title'),
        description: err?.message || 'Error',
      });
    }
  };

  if (showVerification) {
    return (
      <div
        className={cn('flex flex-col gap-6 relative min-h-screen', className)}
        {...props}
      >
        <div className="flex items-center justify-center min-h-screen p-4">
          <Card className="bg-gray-2 w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">
                {t('signup.verify_title')}
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
              <p className="text-sm text-muted-foreground">
                {t('signup.verify_hint')}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    clearPending();
                    setShowVerification(false);
                  }}
                >
                  {t('common.try_different_email')}
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    clearPending();
                    navigate({ to: '/login' });
                  }}
                >
                  {t('common.back_to_login')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn('relative w-full min-h-screen flex flex-col', className)}
      {...props}
    >
      <div className="flex w-full items-center justify-between gap-4 px-4 py-3">
        <div>
          <LanguageSelector />
        </div>
        <ModeToggle />
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <Card className="bg-gray-2">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">{t('signup.title')}</CardTitle>
              <CardDescription>{t('signup.subtitle')}</CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="name">
                    {t('common.name')} <span className="text-red-700">*</span>
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    className={errors.name ? 'border-red-600' : ''}
                    {...register('name')}
                  />
                  {errors.name && (
                    <span className="text-red-600 text-sm">
                      {errors.name.message}
                    </span>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="email">
                    {t('common.email')} <span className="text-red-700">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    className={errors.email ? 'border-red-600' : ''}
                    placeholder="m@example.com"
                    {...register('email')}
                  />
                  {errors.email && (
                    <span className="text-red-600 text-sm">
                      {errors.email.message}
                    </span>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="password">
                    {t('common.password')}{' '}
                    <span className="text-red-700">*</span>
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    className={errors.password ? 'border-red-600' : ''}
                    {...register('password')}
                  />
                  {errors.password && (
                    <span className="text-red-600 text-sm">
                      {errors.password.message}
                    </span>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="passwordVerification">
                    {t('common.confirm_password')}{' '}
                    <span className="text-red-700">*</span>
                  </Label>
                  <Input
                    id="passwordVerification"
                    type="password"
                    className={
                      errors.passwordVerification ? 'border-red-600' : ''
                    }
                    {...register('passwordVerification')}
                  />
                  {errors.passwordVerification && (
                    <span className="text-red-600 text-sm">
                      {errors.passwordVerification.message}
                    </span>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? (
                    <>
                      <Loader />
                      <span>{t('signup.button_loading')}</span>
                    </>
                  ) : (
                    t('signup.button')
                  )}
                </Button>

                <div className="text-center text-sm">
                  {t('common.already_account')}{' '}
                  <Link to="/login" className="underline underline-offset-4">
                    {t('common.back_to_login')}
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
