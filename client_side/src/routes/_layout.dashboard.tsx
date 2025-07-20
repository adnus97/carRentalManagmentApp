import { CarsGrid } from '@/components/cars/cars-grid';
import { useUser } from '@/contexts/user-context';
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router';

export const Route = createFileRoute('/_layout/dashboard')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>
      <CarsGrid />
    </div>
  );
}
