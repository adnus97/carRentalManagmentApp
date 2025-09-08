import { OrganizationDetails } from '@/components/organization/organization-details';
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_layout/organization')({
  beforeLoad: ({ context, location }) => {
    console.log('context', context);
    if (!context.auth.is_authenticated) {
      throw redirect({
        to: '/signup',
        search: {
          redirect: location.href,
        },
      });
    }
  },
  component: OrganizationDetails,
});
