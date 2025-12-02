import { CarsGrid } from '@/components/cars/cars-grid';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_layout/dashboard')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="p-4 full w-full">
      <CarsGrid />
    </div>
  );
}
