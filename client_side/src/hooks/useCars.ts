// src/hooks/useCars.ts
import { useQuery } from '@tanstack/react-query';
import { getCars, getCarById, type Car } from '@/api/cars';

export function useCarSmart(carId: string | null) {
  // First try to get from the list
  const { data: carsData, isLoading: listLoading } = useQuery({
    queryKey: ['cars', 1, 100],
    queryFn: () => getCars(1, 100),
    staleTime: 5 * 60 * 1000,
  });

  const carFromList = carsData?.data.find((c: Car) => c.id === carId);

  // Fallback: fetch directly if not found in list
  const { data: carFromApi, isLoading: apiLoading } = useQuery({
    queryKey: ['car', carId],
    queryFn: () => getCarById(carId!),
    enabled: !!carId && !carFromList,
    staleTime: 5 * 60 * 1000,
  });

  return {
    car: carFromList || carFromApi || null,
    isLoading: listLoading || apiLoading,
  };
}
