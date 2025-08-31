// src/routes/_layout.dashboard.cars.$id.tsx
import { createFileRoute, useRouter } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCarDetails, updateCar, deleteCar } from '@/api/cars';
import { Button } from '@/components/ui/button';
import { successToast, errorToast } from '@/components/ui/toast';
import CarDetailsPage from '@/components/cars/car-details-page';
import { ArrowLeft } from '@phosphor-icons/react';
import { Loader } from '@/components/loader';

export const Route = createFileRoute('/_layout/carDetails/$id')({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  const router = useRouter();
  const queryClient = useQueryClient();

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

  const { car } = data;

  return (
    <div>
      {/* Car Details Component */}
      <CarDetailsPage carId={id} />
    </div>
  );
}
