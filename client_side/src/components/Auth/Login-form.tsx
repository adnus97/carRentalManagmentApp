import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link, useNavigate, useRouter } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader } from '../loader';
import { authClient } from '@/lib/auth-client';
import { useUser } from '@/contexts/user-context';
import { useToast } from '@/hooks/use-toast';
import { toast } from '../ui/toast';

const schema = z.object({
  email: z
    .string()
    .email('Invalid email address') // Custom error message for email
    .nonempty('Email is required'), // Ensure the email is not empty
  password: z.string().nonempty('Password is required'),
});
type formFields = z.infer<typeof schema>;

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const navigate = useNavigate({ from: '/login' });
  //const { toast } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },

    reset,
  } = useForm<formFields>({ resolver: zodResolver(schema) });

  const { user, setUser } = useUser();

  const onsubmit = async (formData: formFields) => {
    await authClient.signIn.email(
      {
        email: formData.email,
        password: formData.password,
      },
      {
        onRequest: (ctx: any) => {},
        onSuccess: (ctx: any) => {
          setUser({ ...user, ...ctx.data.user });
          localStorage.setItem('authUser', JSON.stringify(ctx.data.user));
          console.log(JSON.stringify(ctx.data.user));
          setTimeout(() => {
            navigate({ to: '/dashboard' });
          }, 100); // Give React time to process state

          reset();
          //  router.invalidate();
        },
        onError: (ctx: any) => {
          toast({
            type: 'error',
            title: 'Error',
            description: ctx.error.message,
          });
        },
      },
    );
  };

  return (
    <div className={cn('flex flex-col gap-6 max-w-max', className)} {...props}>
      <Card className="overflow-hidden bg-gray-2">
        <CardContent className="grid p-0 md:grid-cols-2 ">
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
                  {...register('password')}
                />
                {errors.password && (
                  <span className="text-red-600 text-xs ">
                    {errors.password.message}
                  </span>
                )}
                <a
                  href="#"
                  className="ml-auto text-xs underline-offset-2 hover:underline"
                >
                  Forgot your password?
                </a>
              </div>
              <Button type="submit" className="w-full">
                {isSubmitting ? (
                  <>
                    <Loader />
                    <span>Logging in...</span>
                  </>
                ) : (
                  'Login'
                )}
              </Button>

              <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
                <span className="relative z-10 bg-gray-2 px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
              <div className="">
                <Button variant="outline" className="w-full">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path
                      d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                      fill="currentColor"
                    />
                  </svg>
                  Google
                </Button>
              </div>
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
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{' '}
        and <a href="#">Privacy Policy</a>.
      </div>
    </div>
  );
}
// function setUser removed to avoid duplicate identifier error
