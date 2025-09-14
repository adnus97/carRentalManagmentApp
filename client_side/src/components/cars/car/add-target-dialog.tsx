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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addMonthlyTarget } from '@/api/cars';
import { successToast, errorToast } from '@/components/ui/toast';
import { FormDatePicker } from '../../../components/form-date-picker';
import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { TargetRow } from '@/types/car-tables';

const targetSchema = z
  .object({
    revenueGoal: z
      .number({ invalid_type_error: 'Revenue goal must be a number' })
      .min(1, 'Revenue goal is required'),
    targetRents: z
      .number({ invalid_type_error: 'Target rents must be a number' })
      .min(1, 'Target rents is required'),
    startDate: z.date({ required_error: 'Start date is required' }),
    endDate: z.date({ required_error: 'End date is required' }),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: 'End date must be after start date',
    path: ['endDate'],
  })
  .refine((data) => data.endDate > new Date(), {
    message: 'End date cannot be in the past',
    path: ['endDate'],
  });

type TargetFormFields = z.infer<typeof targetSchema>;

export default function AddTargetDialog({
  carId,
  targets,
}: {
  carId: string;
  targets: TargetRow[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (payload: TargetFormFields) => addMonthlyTarget(carId, payload),
    onSuccess: () => {
      successToast('Target added successfully');
      queryClient.invalidateQueries({ queryKey: ['carDetails', carId] });
      queryClient.invalidateQueries({ queryKey: ['activeTargetCard', carId] }),
        queryClient.invalidateQueries({
          queryKey: ['carTargets.v-merge', carId],
        }),
        setIsOpen(false);
      reset();
    },
    onError: (err: any) => {
      errorToast(err?.response?.data?.message || 'Failed to add target');
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

  // ✅ Check if there is already an active target
  const hasActiveTarget = () => {
    const now = new Date();
    return targets.some(
      (t) =>
        new Date(t.startDate) <= now &&
        new Date(t.endDate) >= now &&
        !t.isExpired,
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
                'You already have an active target. Please wait until it ends.',
              );
              return;
            }
            setIsOpen(true);
          }}
        >
          + Add Target
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Monthly Target</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Revenue Goal */}
          <div>
            <Label>Revenue Goal (MAD)</Label>
            <Input
              type="number"
              {...register('revenueGoal', { valueAsNumber: true })}
            />
            {errors.revenueGoal && (
              <p className="text-red-500 text-xs">
                {errors.revenueGoal.message}
              </p>
            )}
          </div>

          {/* Target Rents */}
          <div>
            <Label>Target Rents</Label>
            <Input
              type="number"
              {...register('targetRents', { valueAsNumber: true })}
            />
            {errors.targetRents && (
              <p className="text-red-500 text-xs">
                {errors.targetRents.message}
              </p>
            )}
          </div>

          {/* Start Date */}
          <div>
            <Label>Start Date</Label>
            <Controller
              control={control}
              name="startDate"
              render={({ field }) => (
                <FormDatePicker value={field.value} onChange={field.onChange} />
              )}
            />
            {errors.startDate && (
              <p className="text-red-500 text-xs">{errors.startDate.message}</p>
            )}
          </div>

          {/* End Date */}
          <div>
            <Label>End Date</Label>
            <Controller
              control={control}
              name="endDate"
              render={({ field }) => (
                <FormDatePicker value={field.value} onChange={field.onChange} />
              )}
            />
            {errors.endDate && (
              <p className="text-red-500 text-xs">{errors.endDate.message}</p>
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
