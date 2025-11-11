// src/components/auth/SubscriptionBlocker.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { authClient } from '@/lib/auth-client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface SubscriptionStatus {
  subscriptionStatus: 'active' | 'inactive' | 'expired';
  subscriptionEndDate?: Date;
  daysRemaining?: number;
  isExpired?: boolean;
  needsRenewal?: boolean;
}

export function SubscriptionBlocker() {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    try {
      const response = await fetch('/api/v1/subscription/status', {
        credentials: 'include',
      });
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Failed to check subscription:', error);
    }
  };

  if (!status || status.subscriptionStatus === 'active') {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <Card className="max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle>
            Subscription{' '}
            {status.subscriptionStatus === 'expired' ? 'Expired' : 'Required'}
          </CardTitle>
          <CardDescription>
            {status.subscriptionStatus === 'expired'
              ? `Your subscription expired on ${new Date(status.subscriptionEndDate!).toLocaleDateString()}`
              : 'Your account does not have an active subscription'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-center text-muted-foreground">
            Please contact support to renew your subscription and regain access
            to all features.
          </p>
          <div className="space-y-2">
            <Button
              className="w-full"
              onClick={() =>
                (window.location.href = `mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL}`)
              }
            >
              Contact Support
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                authClient.signOut();
                navigate({ to: '/login' });
              }}
            >
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
