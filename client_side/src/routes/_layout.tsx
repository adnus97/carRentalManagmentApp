// src/routes/_layout.tsx
import { AppLayout } from '@/layouts/appLayout';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { getOrganizationByUser } from '@/api/organization';

export const Route = createFileRoute('/_layout')({
  beforeLoad: async ({ context, location }) => {
    // ✅ Step 1: Check authentication
    if (!context.auth.is_authenticated) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        },
      });
    }

    // ✅ Step 2: Check email verification
    if (!context.auth.user?.emailVerified) {
      throw redirect({
        to: '/login',
        search: {
          message: 'Please verify your email before continuing',
        },
      });
    }

    const user = context.auth.user;

    // ✅ Step 3: SUPER ADMIN CHECK FIRST (before any other checks)
    if (user.role === 'super_admin') {
      // Redirect super admin from root to admin dashboard
      if (location.pathname === '/' || location.pathname === '/dashboard') {
        throw redirect({
          to: '/admin/dashboard',
        });
      }

      // Super admins bypass all other checks
      return { user };
    }

    // ✅ Step 4: Regular user - Check subscription
    if (user.subscriptionStatus !== 'active') {
      const allowedWithoutSubscription = [
        '/subscription-required',
        '/account-settings',
      ];

      if (
        !allowedWithoutSubscription.some((path) =>
          location.pathname.startsWith(path),
        )
      ) {
        throw redirect({
          to: '/subscription-required',
          search: {
            redirect: location.href,
          },
        });
      }
    }

    // ✅ Step 5: Regular user - Check organization
    const allowedWithoutOrg = [
      '/organizationForm',
      '/account-settings',
      '/subscription-required',
    ];

    const shouldCheckOrg = !allowedWithoutOrg.some((path) =>
      location.pathname.startsWith(path),
    );

    if (shouldCheckOrg) {
      try {
        const organizations = await getOrganizationByUser();
        if (!organizations || organizations.length === 0) {
          throw redirect({
            to: '/organizationForm',
            search: {
              redirect: location.href,
            },
          });
        }
      } catch (error) {
        throw redirect({
          to: '/organizationForm',
        });
      }
    }

    return { user };
  },
  component: AppLayout,
});
