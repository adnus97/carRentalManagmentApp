// src/routes/_layout.tsx
import { AppLayout } from '@/layouts/appLayout';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { getOrganizationByUser } from '@/api/organization';

export const Route = createFileRoute('/_layout')({
  beforeLoad: async ({ context, location }) => {
    if (!context.auth.is_authenticated) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        },
      });
    }

    // Check if user has verified email (this should be handled by better-auth)
    if (!context.auth.user?.emailVerified) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        },
      });
    }

    // Check if user has an organization (except for certain routes)
    const allowedWithoutOrg = ['/organizationForm', '/account-settings'];

    const currentPath = location.pathname;
    const shouldCheckOrg = !allowedWithoutOrg.some((path) =>
      currentPath.startsWith(path),
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
        // If we can't fetch organizations, redirect to org form
        throw redirect({
          to: '/organizationForm',
          search: {
            redirect: location.href,
          },
        });
      }
    }

    return { user: context.auth.user };
  },
  component: AppLayout,
});
