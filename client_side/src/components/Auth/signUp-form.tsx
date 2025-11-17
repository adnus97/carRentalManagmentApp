import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link, useNavigate } from '@tanstack/react-router';
import { authClient } from '@/lib/auth-client';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader } from '@/components/loader';
import { useUser } from '@/contexts/user-context';
import { useState } from 'react';
import { toast } from '../ui/toast';
import { ModeToggle } from '../mode-toggle';

const schema = z
  .object({
    name: z.string().min(2),
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
    email: z
      .string()
      .email('Invalid email address')
      .nonempty('Email is required'),
    passwordVerification: z.string(),
  })
  .refine((data) => data.password === data.passwordVerification, {
    path: ['passwordVerification'],
    message: 'Passwords do not match',
  });

type FormFields = z.infer<typeof schema>;

export function SignupForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'div'>) {
  const navigate = useNavigate();
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormFields>({
    resolver: zodResolver(schema),
  });

  const { setUser } = useUser();

  const handleGoogleSignUp = async () => {
    try {
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: '/organizationForm',
      });
    } catch (error: any) {
      toast({
        type: 'error',
        title: 'Google Sign Up Failed',
        description: error?.message || 'Failed to sign up with Google',
      });
    }
  };

  const onSubmit = async (data: FormFields) => {
    try {
      const response = await authClient.signUp.email(
        {
          email: data.email,
          password: data.password,
          name: data.name,
        },
        {
          onRequest: (ctx: any) => {},
          onSuccess: (ctx: any) => {
            setUserEmail(data.email);
            setShowVerificationMessage(true);
            reset();

            toast({
              type: 'success',
              title: 'Account Created',
              description: 'Please check your email to verify your account.',
            });
          },
          onError: (ctx: any) => {
            if (ctx.error.code === 'USER_ALREADY_EXISTS') {
              toast({
                type: 'error',
                title: 'Error',
                description: ctx.error.message,
              });
            } else {
              toast({
                type: 'error',
                title: 'Signup Failed',
                description: ctx.error.message || 'Failed to create account',
              });
            }
          },
        },
      );
    } catch (error: any) {
      toast({
        type: 'error',
        title: 'Error',
        description: error?.message || 'An unexpected error occurred',
      });
    }
  };

  if (showVerificationMessage) {
    return (
      <div
        className={cn('flex flex-col gap-6 relative min-h-screen', className)}
        {...props}
      >
        {/* Theme Toggle - Top Right */}
        <div className="absolute top-4 right-4 z-10">
          <ModeToggle />
        </div>

        {/* Centered Content */}
        <div className="flex items-center justify-center min-h-screen p-4">
          <Card className="bg-gray-2 w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Check Your Email</CardTitle>
              <CardDescription>
                We've sent a verification link to {userEmail}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Click the verification link in your email to activate your
                  account.
                </p>
                <p className="text-xs text-muted-foreground">
                  Didn't receive the email? Check your spam folder.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowVerificationMessage(false)}
                  className="flex-1"
                >
                  Try Different Email
                </Button>
                <Button
                  onClick={() => navigate({ to: '/login' })}
                  className="flex-1"
                >
                  Back to Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn('relative w-full min-h-screen flex flex-col', className)}
      {...props}
    >
      {/* Theme Toggle - Absolute Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <ModeToggle />
      </div>

      {/* Centered Signup Form */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <Card className="bg-gray-2">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Sign Up</CardTitle>
              <CardDescription>
                Sign up to have an easy life as a car renting agency owner.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="grid gap-6">
                  <div className="grid gap-6">
                    <div className="grid gap-2">
                      <Label htmlFor="name" className="text-justify">
                        Name <span className="text-red-700">*</span>
                      </Label>
                      <Input
                        id="name"
                        type="name"
                        className={
                          errors.name
                            ? 'border-red-600 focus:outline-none focus:ring-0 focus:ring-offset-0'
                            : ''
                        }
                        {...register('name', { required: 'Name required' })}
                      />
                      {errors.name && (
                        <span className="text-red-600 text-sm">
                          {errors.name.message}
                        </span>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="email" className="text-justify">
                        Email <span className="text-red-700">*</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        className={
                          errors.email ? 'border-red-600 outline-none' : ''
                        }
                        placeholder="m@example.com"
                        {...register('email')}
                      />
                      {errors.email && (
                        <span className="text-red-600 text-sm">
                          {errors.email.message}
                        </span>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="password">
                        Password <span className="text-red-700">*</span>
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        {...register('password')}
                        className={
                          errors.password ? 'border-red-600 outline-none' : ''
                        }
                      />
                      {errors.password && (
                        <span className="text-red-600 text-sm">
                          {errors.password.message}
                        </span>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="passwordVerification">
                        Password Verification{' '}
                        <span className="text-red-700">*</span>
                      </Label>
                      <Input
                        id="passwordVerification"
                        type="password"
                        {...register('passwordVerification')}
                        className={
                          errors.passwordVerification
                            ? 'border-red-600 outline-none'
                            : ''
                        }
                      />
                      {errors.passwordVerification && (
                        <span className="text-red-600 text-sm">
                          {errors.passwordVerification.message}
                        </span>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader />
                          <span>Loading...</span>
                        </>
                      ) : (
                        'Sign Up'
                      )}
                    </Button>
                  </div>

                  <div className="text-center text-sm">
                    Already have an account?{' '}
                    <Link to="/login" className="underline underline-offset-4">
                      Login
                    </Link>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-primary">
            By clicking continue, you agree to our{' '}
            <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
          </div>
        </div>
      </div>
    </div>
  );
}
