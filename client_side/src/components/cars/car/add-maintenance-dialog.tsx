'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addMaintenanceLog, getCarDetails } from '@/api/cars';
import { successToast, errorToast } from '@/components/ui/toast';
import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';

const maintenanceSchema = z.object({
  type: z.string().nonempty('Type is required'),
  description: z.string().nonempty('Description is required'),
  cost: z
    .number({ invalid_type_error: 'Cost must be a number' })
    .min(0, 'Cost is required'),
  mileage: z.number().optional(),
});

type MaintenanceFormFields = z.infer<typeof maintenanceSchema>;

export default function AddMaintenanceDialog({ carId }: { carId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  // ✅ Fetch car details (to check rental status)
  const { data: carDetails, isLoading: carLoading } = useQuery({
    queryKey: ['carDetails', carId],
    queryFn: () => getCarDetails(carId),
  });

  const car = carDetails?.car;
  const rentalHistory = carDetails?.rentalHistory || [];

  // ✅ Reuse the same "active rent" logic from CarDetailsPage
  const activeRent = rentalHistory.find(
    (r: any) =>
      r.status === 'active' &&
      (!r.returnedAt || new Date(r.returnedAt) > new Date()),
  );
  const isRented = Boolean(activeRent);

  const mutation = useMutation({
    mutationFn: (payload: MaintenanceFormFields) =>
      addMaintenanceLog(carId, payload),
    onSuccess: () => {
      successToast('Maintenance log added');
      queryClient.invalidateQueries({
        queryKey: ['carMaintenanceLogs', carId],
      });
      queryClient.invalidateQueries({ queryKey: ['carDetails', carId] });
      setIsOpen(false);
      reset();
    },
    onError: (err: any) => {
      errorToast(
        err?.response?.data?.message || 'Failed to add maintenance log',
      );
    },
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MaintenanceFormFields>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      type: 'other',
      description: '',
      cost: 0,
      mileage: 0,
    },
  });

  const onSubmit = (data: MaintenanceFormFields) => {
    if (isRented) {
      errorToast('This car is currently rented. Maintenance not allowed.');
      return;
    }
    mutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          disabled={carLoading}
          onClick={() => {
            if (isRented) {
              errorToast(
                'This car is currently rented. Maintenance cannot be added.',
              );
              return;
            }
            setIsOpen(true);
          }}
        >
          + Add Maintenance
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Maintenance Log</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Type */}
          <div>
            <Label>Type</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select
                  value={field.value || 'other'}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="oil_change">Oil Change</SelectItem>
                    <SelectItem value="tire_rotation">Tire Rotation</SelectItem>
                    <SelectItem value="inspection">Inspection</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.type && (
              <p className="text-red-500 text-xs">{errors.type.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <Label>Description</Label>
            <Input {...register('description')} />
            {errors.description && (
              <p className="text-red-500 text-xs">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Cost */}
          <div>
            <Label>Cost</Label>
            <Input
              type="number"
              {...register('cost', { valueAsNumber: true })}
            />
            {errors.cost && (
              <p className="text-red-500 text-xs">{errors.cost.message}</p>
            )}
          </div>

          {/* Mileage */}
          <div>
            <Label>Mileage (optional)</Label>
            <Input
              type="number"
              {...register('mileage', { valueAsNumber: true })}
            />
            {errors.mileage && (
              <p className="text-red-500 text-xs">{errors.mileage.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
