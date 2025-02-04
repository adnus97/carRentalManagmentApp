import { useUser } from '@/contexts/user-context';
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router';

export const Route = createFileRoute('/_layout/dashboard')({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/_layout/dashboard"!</div>;
}
