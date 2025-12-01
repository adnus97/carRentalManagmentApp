import { createFileRoute, redirect, Outlet } from '@tanstack/react-router';
import { authClient } from '@/lib/auth-client';
import { Loader } from '@/components/loader';

export const Route = createFileRoute('/_auth')({
  beforeLoad: async ({ location }) => {
    // Always allow reset-password page regardless of auth state
    if (location.pathname === '/reset-password') {
      return;
    }

    try {
      const session = await authClient.getSession();

      // If authenticated & verified, redirect to dashboard
      if (session?.data?.user?.emailVerified) {
        throw redirect({
          to: '/dashboard',
          replace: true,
        });
      }
    } catch (error: any) {
      // If it's a redirect, rethrow it
      if (error && typeof error === 'object' && 'href' in error) {
        throw error;
      }
      // Otherwise allow access to auth pages
      console.error('Auth check error:', error);
    }
  },
  component: () => <Outlet />,
  pendingComponent: () => (
    <div className="flex items-center justify-center min-h-screen">
      <Loader />
    </div>
  ),
});
