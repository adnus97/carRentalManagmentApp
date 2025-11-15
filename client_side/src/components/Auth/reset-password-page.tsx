'use client';

import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { authClient } from '@/lib/auth-client';
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
import { toast } from '@/components/ui/toast';
import { Loader } from '@/components/loader';
import { useTranslation } from 'react-i18next';

const buildResetSchema = (t: (k: string) => string) =>
  z
    .object({
      password: z
        .string()
        .min(8, t('reset.zod.min'))
        .regex(/[A-Z]/, t('reset.zod.upper'))
        .regex(/[a-z]/, t('reset.zod.lower'))
        .regex(/[0-9]/, t('reset.zod.number'))
        .regex(/[@$!%*?&]/, t('reset.zod.special')),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('reset.zod.mismatch'),
      path: ['confirmPassword'],
    });

type ResetFormFields = z.infer<ReturnType<typeof buildResetSchema>>;

export function ResetPasswordPage() {
  const { t, i18n } = useTranslation('auth');
  const resetSchema = useMemo(() => buildResetSchema(t), [i18n.language, t]);

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const token =
    searchParams.get('token') || window.location.pathname.split('/').pop();
  const callbackURL = searchParams.get('callbackURL') || '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetFormFields>({ resolver: zodResolver(resetSchema) });

  useEffect(() => {
    if (!token) {
      toast({
        type: 'error',
        title: t('reset.toast_invalid_title'),
        description: t('reset.toast_invalid_desc'),
      });
      navigate({ to: '/login' });
    }
  }, [token, navigate, t]);

  const onSubmit = async (data: ResetFormFields) => {
    if (!token) return;

    setIsSubmitting(true);
    try {
      await authClient.resetPassword(
        { newPassword: data.password },
        { query: { token } },
      );

      toast({
        type: 'success',
        title: t('reset.toast_success_title'),
        description: t('reset.toast_success_desc'),
      });

      setTimeout(() => navigate({ to: '/login' }), 2000);
    } catch (error: any) {
      let errorMessage = t('reset.toast_failed_desc');

      if (
        error?.code === 'INVALID_TOKEN' ||
        error?.message?.includes('invalid')
      ) {
        errorMessage = t('reset.toast_invalid_desc');
      } else if (
        error?.code === 'TOKEN_EXPIRED' ||
        error?.message?.includes('expired')
      ) {
        errorMessage = t('reset.toast_expired_desc');
      }

      toast({
        type: 'error',
        title: t('reset.toast_failed_title'),
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-2">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t('reset.title')}</CardTitle>
          <CardDescription>{t('reset.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">
                {t('reset.new_password')}{' '}
                <span className="text-red-700">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                className={errors.password ? 'border-red-600' : ''}
                {...register('password')}
              />
              {errors.password && (
                <span className="text-red-600 text-xs">
                  {errors.password.message}
                </span>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                {t('reset.confirm_password')}{' '}
                <span className="text-red-700">*</span>
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                className={errors.confirmPassword ? 'border-red-600' : ''}
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <span className="text-red-600 text-xs">
                  {errors.confirmPassword.message}
                </span>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader />
                  <span>{t('reset.button_loading')}</span>
                </>
              ) : (
                t('reset.button')
              )}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => navigate({ to: '/login' })}
                className="text-sm text-muted-foreground hover:text-primary underline-offset-2 hover:underline"
              >
                {t('reset.back_to_login')}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
