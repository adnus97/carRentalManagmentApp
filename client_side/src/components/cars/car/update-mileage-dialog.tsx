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
import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useUpdateCar } from '@/hooks/use-update-car';
import { useTranslation } from 'react-i18next';

export default function UpdateMileageDialog({
  carId,
  currentMileage,
}: {
  carId: string;
  currentMileage: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation(['cars', 'common']);

  // Zod schema with localized messages (built with current mileage)
  const mileageSchema = useMemo(
    () =>
      z.object({
        mileage: z
          .number({ invalid_type_error: 'cars.form.errors.mileage_number' })
          .min(
            currentMileage,
            t('car_details.mileage_min', {
              defaultValue: 'Mileage cannot be less than {{min}} km',
              min: currentMileage,
            }),
          )
          .max(
            1_000_000,
            t('car_details.mileage_max', {
              defaultValue: 'Mileage cannot exceed 1,000,000 km',
            }),
          ),
      }),
    [currentMileage, t],
  );

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
        setIsOpen(false);
      },
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          {t('car_details.update_mileage.open', 'Update Mileage')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t('car_details.update_mileage.title', 'Update Mileage')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Mileage Input */}
          <div>
            <Label>{t('car_details.mileage_label', 'Mileage (km)')}</Label>
            <Input
              type="number"
              {...register('mileage', { valueAsNumber: true })}
            />
            {errors.mileage && (
              <p className="text-red-500 text-xs">
                {t(
                  (errors.mileage.message as string) ||
                    'cars.form.errors.mileage_number',
                )}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || mutation.isPending}
          >
            {isSubmitting || mutation.isPending
              ? t('car_details.saving', 'Saving...')
              : t('form.actions.save', { ns: 'cars', defaultValue: 'Save' })}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
