'use client';

import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { authClient } from '@/lib/auth-client';
import { useUser } from '@/contexts/user-context';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/loader';
import { toast } from '@/components/ui/toast';
import { useTranslation } from 'react-i18next';

export function EmailVerificationPage() {
  const { t } = useTranslation('auth');
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const navigate = useNavigate();
  const { setUser, refreshUser } = useUser();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading',
  );
  const [message, setMessage] = useState('');

  const token = searchParams.get('token') || '';
  const verificationType = searchParams.get('type') || 'email-verification';

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage(t('verify.toast.invalid_or_expired'));
      return;
    }
    verifyEmail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const getTitle = () => {
    switch (verificationType) {
      case 'change-email':
        return t('verify.title_change');
      case 'delete-account':
        return t('verify.title_delete');
      default:
        return t('verify.title');
    }
  };

  const getLoadingMessage = () => {
    switch (verificationType) {
      case 'change-email':
        return t('verify.loading_change');
      case 'delete-account':
        return t('verify.loading_delete');
      default:
        return t('verify.loading');
    }
  };

  const getSuccessRedirectMessage = () => {
    switch (verificationType) {
      case 'change-email':
      case 'delete-account':
        return t('verify.redirect_login');
      default:
        return t('verify.redirect');
    }
  };

  const verifyEmail = async () => {
    setStatus('loading');
    setMessage(getLoadingMessage());

    try {
      if (verificationType === 'change-email') {
        await authClient.verifyEmail({ query: { token } });
        await authClient.signOut();
        localStorage.removeItem('authUser');
        setUser(null);

        toast({
          type: 'success',
          title: t('verify.toast.changed_title'),
          description: t('verify.toast.changed_desc'),
        });

        setTimeout(() => navigate({ to: '/login' }), 2000);
      } else if (verificationType === 'delete-account') {
        setStatus('success');
        setMessage(t('verify.done'));

        toast({
          type: 'success',
          title: t('verify.toast.deleted_title'),
          description: t('verify.toast.deleted_desc'),
        });

        setTimeout(() => navigate({ to: '/login' }), 2000);
      } else {
        const result = await authClient.verifyEmail({ query: { token } });

        if (result.data) {
          setStatus('success');
          setMessage(t('verify.success_msg'));
          await refreshUser();

          toast({
            type: 'success',
            title: t('verify.toast.verified_title'),
            description: t('verify.toast.verified_desc'),
          });

          const session = await authClient.getSession();
          setTimeout(() => {
            if (session?.data?.user) navigate({ to: '/organizationForm' });
            else navigate({ to: '/login' });
          }, 2000);
        } else {
          throw new Error('verify_failed');
        }
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      setStatus('error');

      let errorMessage = t('verify.toast.failed_title');

      if (error?.message) {
        if (
          error.message.includes('invalid') ||
          error.message.includes('not found')
        ) {
          errorMessage = t('verify.toast.invalid_or_expired');
        } else if (error.message.includes('expired')) {
          errorMessage = t('verify.toast.expired');
        } else if (error.message.includes('already verified')) {
          errorMessage = t('verify.toast.already_verified');
          setStatus('success');
          const session = await authClient.getSession();
          setTimeout(() => {
            if (session?.data?.user) {
              if (verificationType === 'email-verification')
                navigate({ to: '/organizationForm' });
              else navigate({ to: '/account-settings' });
            } else {
              navigate({ to: '/login' });
            }
          }, 2000);
          return;
        } else {
          errorMessage = error.message;
        }
      }

      setMessage(errorMessage);
      toast({
        type: 'error',
        title: t('verify.toast.failed_title'),
        description: errorMessage,
      });
    }
  };

  const handleSuccessRedirect = async () => {
    const session = await authClient.getSession();
    switch (verificationType) {
      case 'change-email':
      case 'delete-account':
        navigate({ to: '/login' });
        break;
      default:
        if (session?.data?.user) navigate({ to: '/organizationForm' });
        else navigate({ to: '/login' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>{getTitle()}</CardTitle>
          <CardDescription>
            {status === 'loading' && getLoadingMessage()}
            {status === 'success' && t('verify.done')}
            {status === 'error' && t('verify.failed')}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === 'loading' && (
            <div className="space-y-4">
              <Loader />
              <p className="text-sm text-muted-foreground">
                {getLoadingMessage()}
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-green-600"
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
              <p className="text-green-600 font-medium">{message}</p>
              <p className="text-sm text-muted-foreground">
                {getSuccessRedirectMessage()}
              </p>
              <Button onClick={handleSuccessRedirect} className="w-full">
                {t('verify.btn_continue')}
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <p className="text-red-600 font-medium">{message}</p>
              <div className="space-y-2">
                {token && (
                  <Button
                    onClick={verifyEmail}
                    variant="outline"
                    className="w-full"
                  >
                    {t('common.submit')}
                  </Button>
                )}
                <Button
                  onClick={() => navigate({ to: '/login' })}
                  variant="ghost"
                  className="w-full"
                >
                  {t('common.back_to_login')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
