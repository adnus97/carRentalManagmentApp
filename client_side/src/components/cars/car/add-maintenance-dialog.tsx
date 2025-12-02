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
import { FormDatePicker } from '@/components/form-date-picker';
import { useTranslation } from 'react-i18next';

export default function AddMaintenanceDialog({ carId }: { carId: string }) {
  const { t } = useTranslation('cars');

  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch car details (to check rental status if needed)
  const { isLoading: carLoading } = useQuery({
    queryKey: ['carDetails', carId],
    queryFn: () => getCarDetails(carId),
  });

  // i18n-aware schema
  const maintenanceSchema = useMemo(
    () =>
      z.object({
        type: z.string().nonempty('maintenance.form.errors.type_required'),
        description: z
          .string()
          .nonempty('maintenance.form.errors.description_required'),
        cost: z
          .number({ invalid_type_error: 'maintenance.form.errors.cost_number' })
          .min(0, 'maintenance.form.errors.cost_required'),
        mileage: z
          .number({ invalid_type_error: 'cars.form.errors.mileage_number' })
          .optional(),
        createdAt: z.date({
          required_error: 'maintenance.form.errors.date_required',
          invalid_type_error: 'maintenance.form.errors.date_invalid',
        }),
      }),
    [],
  );

  type MaintenanceFormFields = z.infer<typeof maintenanceSchema>;

  const mutation = useMutation({
    mutationFn: (payload: MaintenanceFormFields) =>
      addMaintenanceLog(carId, {
        type: payload.type,
        description: payload.description,
        cost: payload.cost,
        mileage: payload.mileage,
        createdAt: payload.createdAt.toISOString(),
      }),
    onSuccess: () => {
      successToast(t('maintenance.toasts.added', 'Maintenance log added'));
      queryClient.invalidateQueries({
        queryKey: ['carMaintenanceLogs', carId],
      });
      queryClient.invalidateQueries({ queryKey: ['carDetails', carId] });
      setIsOpen(false);
      reset();
    },
    onError: (err: any) => {
      errorToast(
        err?.response?.data?.message ||
          t('maintenance.toasts.add_failed', 'Failed to add maintenance log'),
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
      createdAt: new Date(),
    },
  });

  const onSubmit = (data: MaintenanceFormFields) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          disabled={carLoading}
          onClick={() => {
            setIsOpen(true);
          }}
        >
          {t('maintenance.actions.add', '+ Add Maintenance')}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {t('maintenance.dialog.title', 'Add Maintenance Log')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Type */}
          <div>
            <Label>{t('maintenance.grid.type', 'Type')}</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select
                  value={field.value || 'other'}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t(
                        'maintenance.placeholders.type',
                        'Select type',
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="oil_change">
                      {t('maintenance.types.oil_change', 'Oil Change')}
                    </SelectItem>
                    <SelectItem value="tire_rotation">
                      {t('maintenance.types.tire_rotation', 'Tire Rotation')}
                    </SelectItem>
                    <SelectItem value="inspection">
                      {t('maintenance.types.inspection', 'Inspection')}
                    </SelectItem>
                    <SelectItem value="other">
                      {t('maintenance.types.other', 'Other')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.type && (
              <p className="text-red-500 text-xs">
                {t(
                  (errors.type.message as string) ||
                    'maintenance.form.errors.type_required',
                )}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <Label>{t('maintenance.grid.description', 'Description')}</Label>
            <Input
              placeholder={t(
                'maintenance.placeholders.description',
                'Enter description',
              )}
              {...register('description')}
            />
            {errors.description && (
              <p className="text-red-500 text-xs">
                {t(
                  (errors.description.message as string) ||
                    'maintenance.form.errors.description_required',
                )}
              </p>
            )}
          </div>

          {/* Cost */}
          <div>
            <Label>{t('maintenance.grid.cost', 'Cost')}</Label>
            <Input
              type="number"
              placeholder={t('maintenance.placeholders.cost', 'e.g. 500')}
              {...register('cost', { valueAsNumber: true })}
            />
            {errors.cost && (
              <p className="text-red-500 text-xs">
                {t(
                  (errors.cost.message as string) ||
                    'maintenance.form.errors.cost_required',
                )}
              </p>
            )}
          </div>

          {/* Mileage */}
          <div>
            <Label>
              {t('form.labels.mileage_optional', {
                ns: 'cars',
                defaultValue: 'Mileage (optional)',
              })}
            </Label>
            <Input
              type="number"
              placeholder={t('maintenance.placeholders.mileage', 'e.g. 120000')}
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

          {/* Date & Time */}
          <div>
            <Label>{t('maintenance.fields.datetime', 'Date & Time')}</Label>
            <Controller
              control={control}
              name="createdAt"
              render={({ field }) => (
                <FormDatePicker
                  value={field.value}
                  onChange={field.onChange}
                  placeholder={t(
                    'maintenance.placeholders.datetime',
                    'Select date and time',
                  )}
                />
              )}
            />
            {errors.createdAt && (
              <p className="text-red-500 text-xs">
                {t(
                  (errors.createdAt.message as string) ||
                    'maintenance.form.errors.date_invalid',
                )}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting
              ? t('targets.actions.saving', 'Saving...')
              : t('form.actions.save', { ns: 'cars', defaultValue: 'Save' })}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
