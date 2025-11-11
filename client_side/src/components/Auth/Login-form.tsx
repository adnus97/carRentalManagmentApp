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
import { useState } from 'react';
import { ForgotPasswordModal } from './forgot-password-modal';
import { ModeToggle } from '../mode-toggle';

const schema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .nonempty('Email is required'),
  password: z.string().nonempty('Password is required'),
});

type formFields = z.infer<typeof schema>;

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const navigate = useNavigate({ from: '/login' });
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { refreshUser } = useUser(); // ✅ Get refreshUser from context

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<formFields>({ resolver: zodResolver(schema) });

  //const { user, setUser } = useUser();

  const onsubmit = async (formData: formFields) => {
    await authClient.signIn.email(
      {
        email: formData.email,
        password: formData.password,
      },
      {
        onRequest: (ctx: any) => {},
        onSuccess: async (ctx: any) => {
          // ✅ Don't manually set user - let refreshUser handle it
          console.log('Login successful, fetching complete user data...');

          // ✅ Fetch complete user data including subscription fields
          await refreshUser();

          console.log('Complete user data loaded, navigating...');

          setTimeout(() => {
            navigate({ to: '/dashboard' }); // ❌ Navigating too early!
          }, 100);
          reset();
        },
        onError: (ctx: any) => {
          let errorMessage = ctx.error.message;

          if (ctx.error.code === 'INVALID_EMAIL_OR_PASSWORD') {
            errorMessage = 'Invalid email or password. Please try again.';
          } else if (ctx.error.code === 'EMAIL_NOT_VERIFIED') {
            errorMessage =
              'Please verify your email address before signing in.';
          } else if (ctx.error.code === 'ACCOUNT_LOCKED') {
            errorMessage =
              'Your account has been temporarily locked. Please try again later.';
          }

          toast({
            type: 'error',
            title: 'Login Failed',
            description: errorMessage,
          });
        },
      },
    );
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: '/dashboard',
      });
    } catch (error: any) {
      toast({
        type: 'error',
        title: 'Google Sign-In Failed',
        description: error?.message || 'Failed to sign in with Google',
      });
      setIsGoogleLoading(false);
    }
  };

  return (
    <>
      <div className="absolute top-4 right-4 md:top-8 md:right-8">
        <ModeToggle />
      </div>
      <div
        className={cn('flex flex-col gap-6 max-w-max', className)}
        {...props}
      >
        <Card className="overflow-hidden bg-gray-2">
          <CardContent className="grid p-0 md:grid-cols-2">
            <form className="p-6 md:p-8" onSubmit={handleSubmit(onsubmit)}>
              <div className="flex flex-col gap-6">
                <div className="flex flex-col items-center text-center">
                  <h1 className="text-2xl font-bold">Welcome back</h1>
                  <p className="text-balance text-muted-foreground">
                    Login to your account
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="email" className="text-justify">
                    Email <span className="text-red-700">*</span>
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
                      Password <span className="text-red-700">*</span>
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
                    Forgot your password?
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
                      <span>Logging in...</span>
                    </>
                  ) : (
                    'Login'
                  )}
                </Button>

                <div className="text-center text-sm">
                  Don&apos;t have an account?{' '}
                  <Link to="/signup" className="underline underline-offset-4">
                    Sign up
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

        <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary">
          By clicking continue, you agree to our{' '}
          <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <ForgotPasswordModal onClose={() => setShowForgotPassword(false)} />
      )}
    </>
  );
}
