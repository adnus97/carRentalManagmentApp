'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { Loader } from '@/components/loader';
import { useTranslation } from 'react-i18next';

const emailSchemaBuilder = (t: (k: string) => string) =>
  z.object({
    email: z.string().email(t('common.invalid_email')),
  });

type EmailFormFields = { email: string };

interface ForgotPasswordModalProps {
  onClose: () => void;
}

export function ForgotPasswordModal({ onClose }: ForgotPasswordModalProps) {
  const { t, i18n } = useTranslation('auth');
  const emailSchema = useMemo(() => emailSchemaBuilder(t), [i18n.language, t]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<EmailFormFields>({ resolver: zodResolver(emailSchema) });

  const email = watch('email');

  const onSubmit = async (data: EmailFormFields) => {
    setIsSubmitting(true);
    try {
      await authClient.requestPasswordReset({
        email: data.email,
        redirectTo: '/reset-password',
      });
      setEmailSent(true);
      toast({
        type: 'success',
        title: t('forgot.toast_sent_title'),
        description: t('forgot.toast_sent_desc'),
      });
    } catch (error: any) {
      toast({
        type: 'error',
        title: t('forgot.toast_error_title'),
        description: error?.message || t('forgot.toast_error_desc'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {emailSent ? t('forgot.sent_title') : t('forgot.title')}
          </DialogTitle>
          <DialogDescription>
            {emailSent ? t('forgot.desc_sent', { email }) : t('forgot.desc')}
          </DialogDescription>
        </DialogHeader>

        {!emailSent ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('forgot.email_label')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('forgot.email_placeholder')}
                className={errors.email ? 'border-red-600' : ''}
                {...register('email')}
              />
              {errors.email && (
                <span className="text-red-600 text-sm">
                  {errors.email.message}
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                {t('forgot.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? (
                  <>
                    <Loader />
                    <span>{t('forgot.sending')}</span>
                  </>
                ) : (
                  t('forgot.send')
                )}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('forgot.info_after')}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEmailSent(false)}
                className="flex-1"
              >
                {t('forgot.try_different')}
              </Button>
              <Button type="button" onClick={onClose} className="flex-1">
                {t('forgot.close')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
