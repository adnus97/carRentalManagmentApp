import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateCar } from '@/api/cars';
import { successToast, errorToast } from '@/components/ui/toast';

export function useUpdateCar(carId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: any) => updateCar(carId, payload),
    onSuccess: () => {
      successToast('Car updated successfully');
      queryClient.invalidateQueries({ queryKey: ['carDetails', carId] });
    },
    onError: (err: any) => {
      errorToast(err?.response?.data?.message || 'Failed to update car');
    },
  });
}
