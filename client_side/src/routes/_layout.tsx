import { AppLayout } from '@/layouts/appLayout';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { getOrganizationByUser } from '@/api/organization';

export const Route = createFileRoute('/_layout')({
  beforeLoad: async ({ context, location }) => {
    const { auth } = context;

    // ✅ Step 1: Authentication check
    if (!auth?.is_authenticated) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      });
    }

    // ✅ Step 2: Email verification check
    if (!auth.user?.emailVerified) {
      throw redirect({
        to: '/login',
        search: { message: 'Please verify your email before continuing' },
      });
    }

    const user = auth.user;

    // ✅ Step 3: Super admin bypass
    if (user.role === 'super_admin') {
      if (location.pathname === '/' || location.pathname === '/dashboard') {
        throw redirect({ to: '/admin/dashboard' });
      }
      return { user };
    }

    // ✅ Step 4: Subscription check FIRST (most important)
    const allowedWithoutSubscription = [
      '/subscription-required',
      '/account-settings',
    ];
    const needsSubscription = !allowedWithoutSubscription.some(
      (p) => location.pathname === p,
    );

    if (needsSubscription && user.subscriptionStatus !== 'active') {
      throw redirect({ to: '/subscription-required' });
    }

    // ✅ Step 5: Organization check SECOND (after subscription is verified)
    const allowedWithoutOrg = [
      '/organizationForm',
      '/account-settings',
      '/subscription-required',
    ];
    const needsOrg = !allowedWithoutOrg.some((p) => location.pathname === p);

    if (needsOrg) {
      try {
        const orgs = await getOrganizationByUser();
        if (!orgs || orgs.length === 0) {
          throw redirect({ to: '/organizationForm' });
        }
      } catch (error) {
        console.error('Organization check failed:', error);
        throw redirect({ to: '/organizationForm' });
      }
    }

    return { user };
  },
  component: AppLayout,
});
