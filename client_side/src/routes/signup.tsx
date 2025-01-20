import { createFileRoute, redirect } from '@tanstack/react-router';
import { SignupForm } from '@/components/Auth/SignUp-form';

export const Route = createFileRoute('/signup')({
  component: RouteComponent,
});

function RouteComponent() {
  return <SignupForm />;
}
