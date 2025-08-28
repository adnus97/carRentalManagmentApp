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
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useUpdateCar } from '@/hooks/use-update-car';

export default function UpdateMileageDialog({
  carId,
  currentMileage,
}: {
  carId: string;
  currentMileage: number;
}) {
  const [isOpen, setIsOpen] = useState(false);

  // ✅ Zod schema with min/max validation
  const mileageSchema = z.object({
    mileage: z
      .number({ invalid_type_error: 'Mileage must be a number' })
      .min(currentMileage, `Mileage cannot be less than ${currentMileage} km`)
      .max(1_000_000, 'Mileage cannot exceed 1,000,000 km'),
  });

  type MileageFormFields = z.infer<typeof mileageSchema>;

  const mutation = useUpdateCar(carId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MileageFormFields>({
    resolver: zodResolver(mileageSchema),
    defaultValues: { mileage: currentMileage },
  });

  const onSubmit = (data: MileageFormFields) => {
    mutation.mutate(data, {
      onSuccess: () => {
        reset({ mileage: data.mileage });
        setIsOpen(false); // ✅ close dialog on success
      },
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Update Mileage</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Mileage</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Mileage Input */}
          <div>
            <Label>Mileage (km)</Label>
            <Input
              type="number"
              {...register('mileage', { valueAsNumber: true })}
            />
            {errors.mileage && (
              <p className="text-red-500 text-xs">{errors.mileage.message}</p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || mutation.isPending}
          >
            {isSubmitting || mutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
