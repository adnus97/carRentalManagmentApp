import { LoginForm } from '@/components/Auth/Login-form';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/login')({
  component: RouteComponent,
});

function RouteComponent() {
  return <LoginForm />;
}
