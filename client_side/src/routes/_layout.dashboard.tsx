import { GridExample } from '@/components/cars-grid';
import { useUser } from '@/contexts/user-context';
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router';

export const Route = createFileRoute('/_layout/dashboard')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="h-3/6">
      <GridExample />
    </div>
  );
}
