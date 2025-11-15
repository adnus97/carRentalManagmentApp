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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addMonthlyTarget } from '@/api/cars';
import { successToast, errorToast } from '@/components/ui/toast';
import { FormDatePicker } from '../../../components/form-date-picker';
import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { TargetRow } from '@/types/car-tables';
import { useTranslation } from 'react-i18next';

export default function AddTargetDialog({
  carId,
  targets,
}: {
  carId: string;
  targets: TargetRow[];
}) {
  const { t, i18n } = useTranslation('cars');
  const lang = i18n.language || 'en';
  const currency = t('currency', 'DHS');

  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  // i18n-aware schema (messages are keys or fully localized strings)
  const targetSchema = useMemo(
    () =>
      z
        .object({
          revenueGoal: z
            .number({
              invalid_type_error: 'targets.form.errors.revenue_number',
            })
            .min(1, 'targets.form.errors.revenue_required'),
          targetRents: z
            .number({
              invalid_type_error: 'targets.form.errors.rents_number',
            })
            .min(1, 'targets.form.errors.rents_required'),
          startDate: z.date({
            required_error: 'targets.form.errors.start_required',
          }),
          endDate: z.date({
            required_error: 'targets.form.errors.end_required',
          }),
        })
        .refine((data) => data.endDate > data.startDate, {
          message: 'targets.form.errors.end_after_start',
          path: ['endDate'],
        })
        .refine((data) => data.endDate > new Date(), {
          message: 'targets.form.errors.end_in_future',
          path: ['endDate'],
        }),
    [],
  );

  type TargetFormFields = z.infer<typeof targetSchema>;

  const mutation = useMutation({
    mutationFn: (payload: TargetFormFields) => addMonthlyTarget(carId, payload),
    onSuccess: () => {
      successToast(t('targets.toasts.added', 'Target added successfully'));
      queryClient.invalidateQueries({ queryKey: ['carDetails', carId] });
      queryClient.invalidateQueries({ queryKey: ['activeTargetCard', carId] });
      queryClient.invalidateQueries({
        queryKey: ['carTargets.v-merge', carId],
      });
      setIsOpen(false);
      reset();
    },
    onError: (err: any) => {
      errorToast(
        err?.response?.data?.message ||
          t('targets.toasts.add_failed', 'Failed to add target'),
      );
    },
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TargetFormFields>({
    resolver: zodResolver(targetSchema),
    defaultValues: {
      revenueGoal: undefined,
      targetRents: undefined,
      startDate: undefined,
      endDate: undefined,
    },
  });

  const onSubmit = (data: TargetFormFields) => {
    mutation.mutate(data);
  };

  // Check if there is already an active target
  const hasActiveTarget = () => {
    const now = new Date();
    return targets.some(
      (tRow) =>
        new Date(tRow.startDate) <= now &&
        new Date(tRow.endDate) >= now &&
        !tRow.isExpired,
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          onClick={(e) => {
            if (hasActiveTarget()) {
              e.preventDefault();
              errorToast(
                t(
                  'targets.errors.already_active',
                  'You already have an active target. Please wait until it ends.',
                ),
              );
              return;
            }
            setIsOpen(true);
          }}
        >
          {t('targets.actions.add', '+ Add Target')}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {t('targets.dialog.title', 'Add Monthly Target')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Revenue Goal */}
          <div>
            <Label>
              {t('targets.form.labels.revenue', 'Revenue Goal')} ({currency})
            </Label>
            <Input
              type="number"
              placeholder={t('targets.form.placeholders.revenue', 'e.g. 8000')}
              {...register('revenueGoal', { valueAsNumber: true })}
            />
            {errors.revenueGoal && (
              <p className="text-red-500 text-xs">
                {t(
                  (errors.revenueGoal.message as string) ||
                    'targets.form.errors.revenue_required',
                )}
              </p>
            )}
          </div>

          {/* Target Rents */}
          <div>
            <Label>{t('targets.form.labels.rents', 'Target Rents')}</Label>
            <Input
              type="number"
              placeholder={t('targets.form.placeholders.rents', 'e.g. 40')}
              {...register('targetRents', { valueAsNumber: true })}
            />
            {errors.targetRents && (
              <p className="text-red-500 text-xs">
                {t(
                  (errors.targetRents.message as string) ||
                    'targets.form.errors.rents_required',
                )}
              </p>
            )}
          </div>

          {/* Start Date */}
          <div>
            <Label>{t('targets.form.labels.start', 'Start Date')}</Label>
            <Controller
              control={control}
              name="startDate"
              render={({ field }) => (
                <FormDatePicker
                  value={field.value}
                  onChange={field.onChange}
                  placeholder={t(
                    'targets.form.placeholders.start',
                    'Select start date',
                  )}
                />
              )}
            />
            {errors.startDate && (
              <p className="text-red-500 text-xs">
                {t(
                  (errors.startDate.message as string) ||
                    'targets.form.errors.start_required',
                )}
              </p>
            )}
          </div>

          {/* End Date */}
          <div>
            <Label>{t('targets.form.labels.end', 'End Date')}</Label>
            <Controller
              control={control}
              name="endDate"
              render={({ field }) => (
                <FormDatePicker
                  value={field.value}
                  onChange={field.onChange}
                  placeholder={t(
                    'targets.form.placeholders.end',
                    'Select end date',
                  )}
                />
              )}
            />
            {errors.endDate && (
              <p className="text-red-500 text-xs">
                {t(
                  (errors.endDate.message as string) ||
                    'targets.form.errors.end_required',
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
