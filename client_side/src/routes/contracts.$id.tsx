// src/routes/contracts.$id.tsx (if using file-based routing)
import { createFileRoute } from '@tanstack/react-router';
import { ContractView } from '../components/contracts/contract-view';

export const Route = createFileRoute('/contracts/$id')({
  component: ContractPage,
});

function ContractPage() {
  const { id } = Route.useParams();

  return (
    <div className="min-h-screen bg-gray-50">
      <ContractView rentId={id} />
    </div>
  );
}
