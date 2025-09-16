import { AccountSettings } from '@/components/account/account-settings';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_layout/account-settings')({
  component: RouteComponent,
});

function RouteComponent() {
  return <AccountSettings />;
}
