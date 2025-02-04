import { AppLayout } from '@/layouts/appLayout';
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_layout')({
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
  },
  component: AppLayout,
});
