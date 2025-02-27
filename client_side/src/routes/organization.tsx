import { OrgForm } from '@/components/organization/organization-form';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/organization')({
  component: RouteComponent,
});

function RouteComponent() {
  return <OrgForm />;
}
