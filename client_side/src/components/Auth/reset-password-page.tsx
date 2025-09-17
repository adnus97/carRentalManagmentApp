// src/components/auth/ResetPasswordPage.tsx
import { useState, useEffect } from 'react';
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

const resetSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(
        /[@$!%*?&]/,
        'Password must contain at least one special character',
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type ResetFormFields = z.infer<typeof resetSchema>;

export function ResetPasswordPage() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Better-auth uses different parameter names - check for both
  const token =
    searchParams.get('token') || window.location.pathname.split('/').pop();
  const callbackURL = searchParams.get('callbackURL') || '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetFormFields>({
    resolver: zodResolver(resetSchema),
  });

  useEffect(() => {
    if (!token) {
      toast({
        type: 'error',
        title: 'Invalid Reset Link',
        description: 'The reset link is invalid or has expired',
      });
      navigate({ to: '/login' });
    }
  }, [token, navigate]);

  const onSubmit = async (data: ResetFormFields) => {
    if (!token) return;

    setIsSubmitting(true);
    try {
      // Better-auth expects the token to be passed differently
      const result = await authClient.resetPassword(
        {
          newPassword: data.password,
        },
        {
          // Pass token in the request context if it's in the URL path
          query: { token },
        },
      );

      toast({
        type: 'success',
        title: 'Password Reset Successful',
        description:
          'Your password has been successfully reset. You can now log in.',
      });

      setTimeout(() => {
        navigate({ to: '/login' });
      }, 2000);
    } catch (error: any) {
      let errorMessage = 'Failed to reset password';

      if (
        error?.code === 'INVALID_TOKEN' ||
        error?.message?.includes('invalid')
      ) {
        errorMessage = 'The reset link is invalid or has expired';
      } else if (
        error?.code === 'TOKEN_EXPIRED' ||
        error?.message?.includes('expired')
      ) {
        errorMessage = 'The reset link has expired. Please request a new one.';
      }

      toast({
        type: 'error',
        title: 'Reset Failed',
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-2">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Reset Your Password</CardTitle>
          <CardDescription>Enter your new password below</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">
                New Password <span className="text-red-700">*</span>
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
                Confirm Password <span className="text-red-700">*</span>
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
                  <span>Resetting Password...</span>
                </>
              ) : (
                'Reset Password'
              )}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => navigate({ to: '/login' })}
                className="text-sm text-muted-foreground hover:text-primary underline-offset-2 hover:underline"
              >
                Back to Login
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
