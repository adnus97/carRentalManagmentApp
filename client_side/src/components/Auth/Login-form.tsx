'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader } from '../loader';
import { authClient } from '@/lib/auth-client';
import { useUser } from '@/contexts/user-context';
import { toast } from '../ui/toast';
import { useState, useMemo } from 'react';
import { ForgotPasswordModal } from './forgot-password-modal';
import { ModeToggle } from '../mode-toggle';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../language-selector';

const buildSchema = (t: (k: string) => string) =>
  z.object({
    email: z
      .string()
      .email(t('common.invalid_email'))
      .nonempty(t('signup.zod.email_required')),
    password: z.string().nonempty(t('common.required')),
  });

type FormFields = z.infer<ReturnType<typeof buildSchema>>;

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const { t, i18n } = useTranslation('auth');
  const navigate = useNavigate({ from: '/login' });
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const { refreshUser } = useUser();

  const schema = useMemo(() => buildSchema(t), [i18n.language, t]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormFields>({ resolver: zodResolver(schema) });

  const onsubmit = async (formData: FormFields) => {
    await authClient.signIn.email(
      { email: formData.email, password: formData.password },
      {
        onRequest: () => {},
        onSuccess: async () => {
          await refreshUser();
          setTimeout(() => navigate({ to: '/dashboard' }), 100);
          reset();
        },
        onError: (ctx: any) => {
          let key: string | null = null;
          if (ctx?.error?.code === 'INVALID_EMAIL_OR_PASSWORD')
            key = 'login.errors.invalid_credentials';
          else if (ctx?.error?.code === 'EMAIL_NOT_VERIFIED')
            key = 'login.errors.email_not_verified';
          else if (ctx?.error?.code === 'ACCOUNT_LOCKED')
            key = 'login.errors.account_locked';

          toast({
            type: 'error',
            title: t('login.failed_title'),
            description: key
              ? t(key)
              : ctx?.error?.message || t('login.failed_title'),
          });
        },
      },
    );
  };

  return (
    <div className="flex min-h-screen flex-col w-full">
      <div className="flex w-full items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 flex-shrink-0">
          <LanguageSelector />
        </div>

        <div className="flex items-center flex-shrink-0">
          <ModeToggle />
        </div>
      </div>

      <div
        className={cn(
          'flex flex-1 items-center justify-center px-4',
          className,
        )}
        {...props}
      >
        <div
          className="
          w-full
          max-w-[760px]      /* phones/tablets default */
          md:max-w-[860px]   /* small laptops */
          lg:max-w-[920px]   /* laptops keep it similar */
       
        "
        >
          <Card className="overflow-hidden bg-gray-2 w-full">
            <CardContent className="grid p-0 md:grid-cols-2">
              <form
                className="p-6 md:p-8 min-h-[480px]"
                onSubmit={handleSubmit(onsubmit)}
              >
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col items-center text-center">
                    <h1 className="text-2xl font-bold">{t('login.title')}</h1>
                    <p className="text-balance text-muted-foreground max-w-[36ch]">
                      {t('login.subtitle')}
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="email" className="text-justify">
                      {t('common.email')}{' '}
                      <span className="text-red-700">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="m@example.com"
                      className={errors.email ? 'border-red-600' : ''}
                      {...register('email')}
                    />
                    {errors.email && (
                      <span className="text-red-600 text-xs">
                        {errors.email.message}
                      </span>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <div className="flex items-center">
                      <Label htmlFor="password">
                        {t('common.password')}{' '}
                        <span className="text-red-700">*</span>
                      </Label>
                    </div>
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
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="ml-auto text-xs underline-offset-2 hover:underline text-primary"
                    >
                      {t('login.forgot')}
                    </button>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader />
                        <span>{t('login.button_loading')}</span>
                      </>
                    ) : (
                      t('login.button')
                    )}
                  </Button>

                  <div className="text-center text-sm">
                    {t('login.no_account')}{' '}
                    <Link to="/signup" className="underline underline-offset-4">
                      {t('login.signup_link')}
                    </Link>
                  </div>
                </div>
              </form>

              <div className="relative hidden bg-muted md:block">
                <img
                  src="/side-view-hands-holding-car-key.jpg"
                  alt="Image"
                  className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {showForgotPassword && (
        <ForgotPasswordModal onClose={() => setShowForgotPassword(false)} />
      )}
    </div>
  );
}
