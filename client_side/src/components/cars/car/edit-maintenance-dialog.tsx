'use client';

import { useState, useMemo } from 'react';
import { Pencil } from 'lucide-react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { successToast, errorToast } from '@/components/ui/toast';
import { updateMaintenanceLog } from '@/api/cars';
import { useQueryClient } from '@tanstack/react-query';
import { MaintenanceLogRow } from '@/types/car-tables';
import { FormDatePicker } from '@/components/form-date-picker';
import { useTranslation } from 'react-i18next';

export function EditMaintenanceDialog({
  log,
  carId,
}: {
  log: MaintenanceLogRow;
  carId: string;
}) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { t } = useTranslation(['cars', 'common']);

  // Localized zod schema
  const schema = useMemo(
    () =>
      z.object({
        type: z.string().nonempty('cars.maintenance.errors.type_required'),
        description: z
          .string()
          .nonempty('cars.maintenance.errors.description_required'),
        cost: z
          .number({ invalid_type_error: 'cars.maintenance.errors.cost_number' })
          .min(0, 'cars.maintenance.errors.cost_min'),
        mileage: z
          .number({
            invalid_type_error: 'cars.form.errors.mileage_number',
          })
          .optional(),
        createdAt: z.date({
          required_error: 'cars.maintenance.errors.date_required',
          invalid_type_error: 'cars.maintenance.errors.date_invalid',
        }),
      }),
    [],
  );

  type FormFields = z.infer<typeof schema>;

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormFields>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: log.type,
      description: log.description || '',
      cost: Number(log.cost || 0),
      mileage: log.mileage ?? undefined,
      createdAt: new Date(log.createdAt),
    },
  });

  const onSubmit = async (values: FormFields) => {
    try {
      await updateMaintenanceLog(log.id, {
        type: values.type,
        description: values.description,
        cost: values.cost,
        mileage: values.mileage,
        createdAt: values.createdAt.toISOString(),
      });
      successToast(t('maintenance.toasts.updated', 'Maintenance updated'));
      setOpen(false);
      queryClient.invalidateQueries({
        queryKey: ['carMaintenanceLogs', carId],
      });
      queryClient.invalidateQueries({ queryKey: ['carDetails', carId] });
    } catch (e: any) {
      errorToast(
        e?.response?.data?.message ||
          t('maintenance.toasts.update_failed', 'Failed to update maintenance'),
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 p-0"
          title={t('maintenance.edit_button_title', 'Edit maintenance')}
          aria-label={t('maintenance.edit_button_title', 'Edit maintenance')}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {t('maintenance.edit_title', 'Edit Maintenance')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <Label>{t('maintenance.fields.type', 'Type')}</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
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
                    'cars.maintenance.errors.type_required',
                )}
              </p>
            )}
          </div>

          <div>
            <Label>{t('maintenance.fields.description', 'Description')}</Label>
            <Input
              {...register('description')}
              placeholder={t(
                'maintenance.placeholders.description',
                'Enter description',
              )}
            />
            {errors.description && (
              <p className="text-red-500 text-xs">
                {t(
                  (errors.description.message as string) ||
                    'cars.maintenance.errors.description_required',
                )}
              </p>
            )}
          </div>

          <div>
            <Label>{t('maintenance.fields.cost', 'Cost')}</Label>
            <Input
              type="number"
              {...register('cost', { valueAsNumber: true })}
              placeholder={t('maintenance.placeholders.cost', 'e.g. 500')}
            />
            {errors.cost && (
              <p className="text-red-500 text-xs">
                {t(
                  (errors.cost.message as string) ||
                    'cars.maintenance.errors.cost_number',
                )}
              </p>
            )}
          </div>

          <div>
            <Label>
              {t('form.labels.mileage', {
                ns: 'cars',
                defaultValue: 'Mileage',
              })}
            </Label>
            <Input
              type="number"
              {...register('mileage', { valueAsNumber: true })}
              placeholder={t('maintenance.placeholders.mileage', 'e.g. 120000')}
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
                    'Select date & time',
                  )}
                />
              )}
            />
            {errors.createdAt && (
              <p className="text-red-500 text-xs">
                {t(
                  (errors.createdAt.message as string) ||
                    'cars.maintenance.errors.date_invalid',
                )}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting
              ? t('car_details.saving', 'Saving...')
              : t('form.actions.save', { ns: 'cars', defaultValue: 'Save' })}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
