import { authClient } from '@/lib/auth-client';
import { User } from '@/types/user';

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  needsVerification: boolean;
  isSuperAdmin: boolean;
  hasActiveSubscription: boolean;
}

/**
 * Single source of truth for auth state
 */
export async function getAuthState(): Promise<AuthState> {
  try {
    const session = await authClient.getSession();
    const user = (session?.data?.user as User) || null;

    return {
      isAuthenticated: !!user,
      user,
      needsVerification: user ? !user.emailVerified : false,
      isSuperAdmin: user?.role === 'super_admin',
      hasActiveSubscription: user?.subscriptionStatus === 'active',
    };
  } catch (error) {
    console.error('Auth state check failed:', error);
    return {
      isAuthenticated: false,
      user: null,
      needsVerification: false,
      isSuperAdmin: false,
      hasActiveSubscription: false,
    };
  }
}

/**
 * Check if user has organization
 */
export async function checkUserHasOrganization(
  userId: string,
): Promise<boolean> {
  try {
    const response = await fetch(`/api/v1/organizations/by-user/${userId}`, {
      credentials: 'include',
    });

    if (!response.ok) return false;

    const organizations = await response.json();
    return Array.isArray(organizations) && organizations.length > 0;
  } catch (error) {
    console.error('Organization check failed:', error);
    return false;
  }
}
