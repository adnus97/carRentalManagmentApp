'use client';

import { createFileRoute, useRouter } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { getCustomerById } from '@/api/customers';
import { Loader } from '@/components/loader';
import { ClientDetailsPage } from '../components/customers/client-details';

export const Route = createFileRoute('/_layout/customerDetails/$id')({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams(); // ✅ correct way
  const router = useRouter();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['customerDetails', id],
    queryFn: () => getCustomerById(id),
  });

  if (isLoading)
    return (
      <p className="flex w-fit h-full mx-auto items-center gap-2 text-gray-500">
        <Loader />
        Loading customer details...
      </p>
    );

  if (isError || !data)
    return (
      <p className="flex w-full h-full justify-center items-center text-red-500">
        Error loading customer details.
      </p>
    );

  return (
    <div>
      <ClientDetailsPage customerId={id} />
    </div>
  );
}
