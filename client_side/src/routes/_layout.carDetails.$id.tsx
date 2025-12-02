// src/routes/_layout.dashboard.cars.$id.tsx
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { getCarDetails } from '@/api/cars';
import CarDetailsPage from '@/components/cars/car-details-page';
import { Loader } from '@/components/loader';

export const Route = createFileRoute('/_layout/carDetails/$id')({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['carDetails', id],
    queryFn: () => getCarDetails(id),
  });

  if (isLoading)
    return (
      <p className="flex  w-fit h-full mx-auto items-center gap-2 text-gray-500">
        <Loader />
        Loading car details...
      </p>
    );
  if (isError || !data)
    return (
      <p className="flex  w-full h-full justify-center  items-center  text-red-500">
        Error loading car details.
      </p>
    );

  return (
    <div>
      {/* Car Details Component */}
      <CarDetailsPage carId={id} />
    </div>
  );
}
