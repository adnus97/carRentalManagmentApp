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
import { authClient } from '@/lib/auth-client'; //import the auth client
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader } from '@/components/loader';
import { useUser } from '@/contexts/user-context';
import { useState } from 'react';
import { toast } from '../ui/toast';

const schema = z
  .object({
    name: z.string().min(2),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long') // Minimum length
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter') // At least one uppercase letter
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter') // At least one lowercase letter
      .regex(/[0-9]/, 'Password must contain at least one number') // At least one digit
      .regex(
        /[@$!%*?&]/,
        'Password must contain at least one special character',
      ), // At least one special character
    email: z
      .string()
      .email('Invalid email address') // Custom error message for email
      .nonempty('Email is required'), // Ensure the email is not empty
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
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormFields>({
    resolver: zodResolver(schema),
  });
  const { user, setUser } = useUser();

  const onSubmit = async (data: FormFields) => {
    const { data: responseData, error } = await authClient.signUp.email(
      {
        email: data.email,
        password: data.password,
        name: data.name,
      },
      {
        onRequest: (ctx: any) => {},

        onSuccess: (ctx: any) => {
          setUser(ctx.data.user);
          localStorage.setItem('authUser', JSON.stringify(ctx.data.user));

          setTimeout(() => {
            navigate({ to: '/organization' });
          }, 100); // Give React time to process state
          reset();
        },
        onError: (ctx: any) => {
          if (ctx.error.code === 'USER_ALREADY_EXISTS') {
            toast({
              type: 'error',
              title: 'Error',
              description: ctx.error.message,
            });
          }
        },
      },
    );
    console.log(responseData);
  };

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
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
              <div className="flex flex-col gap-4">
                <Button variant="outline" className="w-full">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path
                      d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                      fill="currentColor"
                    />
                  </svg>
                  Sign up with Google
                </Button>
              </div>
              <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
                <span className="relative z-10 bg-background px-2 text-muted-foreground">
                  Or
                </span>
              </div>
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
                        ? 'border-red-600  focus:outline-none focus:ring-0 fovus:ring-offset-0'
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
                  <div className="flex items-center">
                    <Label htmlFor="password">
                      Password <span className="text-red-700">*</span>
                    </Label>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    {...register('password')}
                    className={
                      errors.password ? 'border-red-600 outline-none ' : ''
                    }
                  />
                  {errors.password && (
                    <span className="text-red-600 text-sm">
                      {errors.password.message}
                    </span>
                  )}
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center">
                    <Label htmlFor="passwordVerification">
                      Password Verification{' '}
                      <span className="text-red-700">*</span>
                    </Label>
                  </div>
                  <Input
                    id="passwordVerification"
                    type="password"
                    {...register('passwordVerification')}
                    className={
                      errors.passwordVerification
                        ? 'border-red-600 outline-none '
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
      <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-primary  ">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{' '}
        and <a href="#">Privacy Policy</a>.
      </div>
    </div>
  );
}
