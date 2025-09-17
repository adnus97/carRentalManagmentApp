// src/components/auth/email-verification-page.tsx
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useRouter } from '@tanstack/react-router';
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

export function EmailVerificationPage() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const navigate = useNavigate();
  const { setUser } = useUser();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading',
  );
  const [message, setMessage] = useState('');

  const token = searchParams.get('token') || '';
  const verificationType = searchParams.get('type') || 'email-verification';

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link - no token provided');
      return;
    }

    verifyEmail();
  }, [token]);

  const verifyEmail = async () => {
    setStatus('loading');
    setMessage('Verifying your email...');

    try {
      if (verificationType === 'change-email') {
        await authClient.verifyEmail({
          query: {
            token,
          },
        });
        await authClient.signOut();
        localStorage.removeItem('authUser');
        setUser(null);
        router.navigate({ to: '/login' });
      } else if (verificationType === 'delete-account') {
        // Handle account deletion
        // const result = await authClient.deleteUser({
        //   token,
        // });

        setStatus('success');
        setMessage('Account deletion confirmed.');

        toast({
          type: 'success',
          title: 'Account Deleted',
          description: 'Your account has been successfully deleted.',
        });

        setTimeout(() => {
          navigate({ to: '/login' });
        }, 2000);
      } else {
        const result = await authClient.verifyEmail({
          query: {
            token,
          },
        });

        if (result.data) {
          setStatus('success');
          setMessage('Email verified successfully!');

          // Update user context if user data is returned
          if (result.data.user) {
            setUser(result.data.user);
            localStorage.setItem('authUser', JSON.stringify(result.data.user));
          }

          toast({
            type: 'success',
            title: 'Email Verified',
            description: 'Your email has been successfully verified!',
          });

          setTimeout(() => {
            navigate({ to: '/organizationForm' });
          }, 2000);
        } else {
          throw new Error('Failed to verify email');
        }
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      setStatus('error');

      let errorMessage = 'Failed to verify email';

      // Handle different error types
      if (error?.message) {
        if (
          error.message.includes('invalid') ||
          error.message.includes('not found')
        ) {
          errorMessage = 'The verification link is invalid or has expired';
        } else if (error.message.includes('expired')) {
          errorMessage =
            'The verification link has expired. Please request a new one.';
        } else if (error.message.includes('already verified')) {
          errorMessage = 'Email is already verified';
          // If already verified, redirect anyway
          setStatus('success');
          setTimeout(() => {
            if (verificationType === 'email-verification') {
              navigate({ to: '/organizationForm' });
            } else {
              navigate({ to: '/account-settings' });
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
        title: 'Verification Failed',
        description: errorMessage,
      });
    }
  };

  const handleRetry = () => {
    if (token) {
      verifyEmail();
    }
  };

  const getTitle = () => {
    switch (verificationType) {
      case 'change-email':
        return 'Email Change Verification';
      case 'delete-account':
        return 'Account Deletion Confirmation';
      default:
        return 'Email Verification';
    }
  };

  const getLoadingMessage = () => {
    switch (verificationType) {
      case 'change-email':
        return 'Confirming email change...';
      case 'delete-account':
        return 'Processing account deletion...';
      default:
        return 'Verifying your email address...';
    }
  };

  const getSuccessRedirectMessage = () => {
    switch (verificationType) {
      case 'change-email':
        return 'Redirecting to account settings...';
      case 'delete-account':
        return 'Redirecting to login...';
      default:
        return 'Redirecting to organization setup...';
    }
  };

  const getSuccessButtonText = () => {
    switch (verificationType) {
      case 'change-email':
        return 'Go to Account Settings';
      case 'delete-account':
        return 'Go to Login';
      default:
        return 'Continue to Organization Setup';
    }
  };

  const handleSuccessRedirect = () => {
    switch (verificationType) {
      case 'change-email':
        navigate({ to: '/account-settings' });
        break;
      case 'delete-account':
        navigate({ to: '/login' });
        break;
      default:
        navigate({ to: '/organizationForm' });
        break;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>{getTitle()}</CardTitle>
          <CardDescription>
            {status === 'loading' && getLoadingMessage()}
            {status === 'success' && 'Verification completed successfully!'}
            {status === 'error' && 'Verification failed'}
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
                {getSuccessButtonText()}
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
                    onClick={handleRetry}
                    variant="outline"
                    className="w-full"
                  >
                    Try Again
                  </Button>
                )}
                <Button
                  onClick={() => navigate({ to: '/login' })}
                  variant="ghost"
                  className="w-full"
                >
                  Back to Login
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
