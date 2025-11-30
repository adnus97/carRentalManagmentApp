import { createFileRoute, redirect } from '@tanstack/react-router';
import { SignupForm } from '@/components/Auth/SignUp-form';
import { authClient } from '@/lib/auth-client';

export const Route = createFileRoute('/_auth/signup')({
  beforeLoad: async () => {
    const session = await authClient.getSession();

    if (session.data) {
      throw redirect({
        to: '/dashboard',
      });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <SignupForm />;
}
