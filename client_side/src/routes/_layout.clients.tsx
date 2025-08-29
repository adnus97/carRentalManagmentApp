import { createFileRoute } from '@tanstack/react-router';
import { ClientsGrid } from '@/components/customers/customersGrid'; // ✅ import your ClientsGrid

export const Route = createFileRoute('/_layout/clients')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="p-4 h-full w-full">
      <ClientsGrid />
    </div>
  );
}
