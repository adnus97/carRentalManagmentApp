import React from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { useUser } from '@/contexts/user-context';
import { useTranslation } from 'react-i18next';

export const Route = createFileRoute('/subscription-required')({
  // No beforeLoad - _layout handles super admin redirect
  component: SubscriptionRequired,
});

function SubscriptionRequired() {
  const navigate = useNavigate();
  const { user, setUser } = useUser();
  const { t } = useTranslation('auth');

  // Auto-redirect if subscription becomes active
  React.useEffect(() => {
    if (user?.subscriptionStatus === 'active') {
      console.log('✅ Subscription active, redirecting to dashboard');
      navigate({ to: '/dashboard', replace: true });
    }
  }, [user?.subscriptionStatus, navigate]);

  const handleSignOut = async () => {
    await authClient.signOut();
    setUser(null);
    localStorage.removeItem('authUser');
    navigate({ to: '/login' });
  };

  const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-2xl">
            {t('subscription.title_required')}
          </CardTitle>
          <CardDescription>{t('subscription.desc_required')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-center text-muted-foreground">
            {t('subscription.help')}
          </p>
          <div className="space-y-2">
            <Button
              className="w-full"
              onClick={() => (window.location.href = `mailto:${supportEmail}`)}
            >
              {t('subscription.contact')}
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleSignOut}
            >
              {t('subscription.signout')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
