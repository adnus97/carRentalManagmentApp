// src/routes/_layout.dashboard.cars.$id.tsx
import { createFileRoute, useRouter } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCarDetails, updateCar, deleteCar } from '@/api/cars';
import { Button } from '@/components/ui/button';
import { successToast, errorToast } from '@/components/ui/toast';
import CarDetailsPage from '@/components/cars/car-details-page';
import { ArrowLeft } from '@phosphor-icons/react';

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

  const updateMutation = useMutation({
    mutationFn: (payload: any) => updateCar(id, payload),
    onSuccess: () => {
      successToast('Car updated successfully');
      queryClient.invalidateQueries({ queryKey: ['carDetails', id] }); // ✅ fixed
    },
    onError: (err: any) => {
      errorToast(err?.response?.data?.message || 'Failed to update car');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteCar(id),
    onSuccess: () => {
      successToast('Car deleted successfully');
      router.navigate({ to: '/dashboard' });
    },
    onError: (err: any) => {
      errorToast(err?.response?.data?.message || 'Failed to delete car');
    },
  });

  if (isLoading) return <p className="text-center">Loading car details...</p>;
  if (isError || !data)
    return (
      <p className="text-center text-red-500">Error loading car details.</p>
    );

  const { car } = data;

  return (
    <div>
      {/* Car Details Component */}
      <CarDetailsPage carId={id} />
    </div>
  );
}
