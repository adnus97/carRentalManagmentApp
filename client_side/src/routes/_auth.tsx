import { useUser } from '@/contexts/user-context';
import { authClient } from '@/lib/auth-client';
import {
  createFileRoute,
  Outlet,
  redirect,
  useRouter,
} from '@tanstack/react-router';
import { useEffect } from 'react';

export const Route = createFileRoute('/_auth')({
  beforeLoad: ({ context, location }) => {
    console.log('context', context);
    if (!context.auth.is_authenticated) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        },
      });
    }
    return { user: context.auth.user };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const auth = useUser();
  const router = useRouter();
  const session = authClient.useSession();
  console.log('auth', auth.user);
  useEffect(() => {
    if (session.data) {
      auth.setUser(session.data.user as any);
      router.invalidate();
    }
  }, [session]);
  return <Outlet />;
}
