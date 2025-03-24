import { OrgForm } from '@/components/organization/organization-form';
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/organization')({
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
  component: OrgForm,
});
