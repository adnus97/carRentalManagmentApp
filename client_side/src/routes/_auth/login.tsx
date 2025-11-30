import { LoginForm } from '@/components/Auth/Login-form';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { authClient } from '@/lib/auth-client'; // Your Better Auth client

export const Route = createFileRoute('/_auth/login')({
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
  return <LoginForm />;
}
