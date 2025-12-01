import { createFileRoute, redirect } from '@tanstack/react-router';
import { SignupForm } from '@/components/Auth/SignUp-form';
import { authClient } from '@/lib/auth-client';
import { getAuthState, checkUserHasOrganization } from '@/lib/auth.utils';

export const Route = createFileRoute('/_auth/signup')({
  beforeLoad: async () => {
    const auth = await getAuthState();

    // If authenticated and verified, redirect to appropriate place
    if (auth.isAuthenticated && !auth.needsVerification) {
      // Super admin
      if (auth.isSuperAdmin) {
        throw redirect({ to: '/admin/dashboard' });
      }

      // Regular user - check org and subscription
      let hasOrg = false;
      if (auth.user && auth.user.id) {
        hasOrg = await checkUserHasOrganization(auth.user.id);
      }

      if (!hasOrg) {
        throw redirect({ to: '/organizationForm' });
      }

      if (!auth.hasActiveSubscription) {
        throw redirect({ to: '/subscription-required' });
      }

      throw redirect({ to: '/dashboard' });
    }

    return { auth };
  },
  component: SignupForm,
});
