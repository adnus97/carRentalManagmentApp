import { RentsGrid } from '@/components/rent/rent-grid';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_layout/rents')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>
      <RentsGrid />
    </div>
  );
}
