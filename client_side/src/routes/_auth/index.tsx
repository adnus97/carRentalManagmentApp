import { createFileRoute, Navigate, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_auth/')({
  beforeLoad: ({ context }) => {
    // Redirect authenticated users to their appropriate dashboard
    if (context.auth.is_authenticated) {
      if (context.auth.user?.role === 'super_admin') {
        throw redirect({ to: '/admin/dashboard' });
      }
      throw redirect({ to: '/dashboard' });
    }
    // Redirect unauthenticated to login
    throw redirect({ to: '/login' });
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <Navigate to="/dashboard" replace />;
}
