// src/routes/subscription-required.tsx
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
import { useEffect } from 'react';

export const Route = createFileRoute('/subscription-required')({
  component: SubscriptionRequired,
});

function SubscriptionRequired() {
  const navigate = useNavigate();
  const { user, setUser, refreshUser } = useUser();

  // ✅ Redirect super admins immediately
  useEffect(() => {
    if (user?.role === 'super_admin') {
      navigate({ to: '/admin/dashboard' }); // Fixed path
    }
  }, [user, navigate]);

  const handleSignOut = async () => {
    await authClient.signOut();
    setUser(null);
    localStorage.removeItem('authUser');
    navigate({ to: '/login' });
  };

  const handleRefresh = async () => {
    await refreshUser();
    // After refresh, the useEffect will redirect if they're super_admin
  };

  // ✅ Don't show anything while redirecting super admin
  if (user?.role === 'super_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-950">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-2xl">Subscription Required</CardTitle>
          <CardDescription>
            Your account does not have an active subscription
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-center text-muted-foreground">
            Please contact support to activate your subscription and regain
            access to all features.
          </p>
          <div className="space-y-2">
            <Button
              className="w-full"
              onClick={() =>
                (window.location.href = `mailto:${process.env.VITE_SUPPORT_EMAIL || 'support@yourapp.com'}`)
              }
            >
              Contact Support
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleSignOut}
            >
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
