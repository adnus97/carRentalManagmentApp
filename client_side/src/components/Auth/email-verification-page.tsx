// src/components/auth/EmailVerificationPage.tsx
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { authClient } from '@/lib/auth-client';
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
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading',
  );
  const [message, setMessage] = useState('');

  // Get token and callbackURL from search params
  const token = searchParams.get('token') || '';
  const callbackURL = searchParams.get('callbackURL') || '/dashboard';
  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link');
      return;
    }

    verifyEmail();
  }, [token]);

  const verifyEmail = async () => {
    try {
      const response = await authClient.verifyEmail({
        query: { token, callbackURL },
      });

      if (response.data) {
        setStatus('success');
        setMessage('Email verified successfully!');

        setTimeout(() => {
          navigate({ to: callbackURL });
        }, 3000);
      }
    } catch (error: any) {
      setStatus('error');
      let errorMessage = 'Failed to verify email';

      if (error?.code === 'INVALID_TOKEN') {
        errorMessage = 'The verification link is invalid or has expired';
      } else if (error?.code === 'TOKEN_EXPIRED') {
        errorMessage = 'The verification link has expired';
      } else if (error?.code === 'EMAIL_ALREADY_VERIFIED') {
        errorMessage = 'Email is already verified';
      }

      setMessage(errorMessage);
    }
  };

  const handleResendVerification = async () => {
    toast({
      type: 'info',
      title: 'Resend Verification',
      description:
        'Please go to login and try signing in to get a new verification email',
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-2">
        <CardHeader className="text-center">
          <CardTitle>Email Verification</CardTitle>
          <CardDescription>
            {status === 'loading' && 'Verifying your email address...'}
            {status === 'success' && 'Email verified successfully!'}
            {status === 'error' && 'Verification failed'}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === 'loading' && (
            <div className="space-y-4">
              <Loader />
              <p className="text-sm text-muted-foreground">
                Please wait while we verify your email...
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
                Redirecting you to the dashboard in a few seconds...
              </p>
              <Button
                onClick={() => navigate({ to: callbackURL })}
                className="w-full"
              >
                Continue to Dashboard
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
                <Button
                  onClick={handleResendVerification}
                  variant="outline"
                  className="w-full"
                >
                  Request New Verification Link
                </Button>
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
