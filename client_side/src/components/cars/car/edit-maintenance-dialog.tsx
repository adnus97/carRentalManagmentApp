'use client';

import { useState } from 'react';
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

const schema = z.object({
  type: z.string().nonempty(),
  description: z.string().nonempty(),
  cost: z.number().min(0),
  mileage: z.number().optional(),
  createdAt: z.date(),
});
type FormFields = z.infer<typeof schema>;

export function EditMaintenanceDialog({
  log,
  carId,
}: {
  log: MaintenanceLogRow;
  carId: string;
}) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

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
      createdAt: new Date(log.createdAt), // convert ISO -> Date for picker
    },
  });

  const onSubmit = async (values: FormFields) => {
    try {
      await updateMaintenanceLog(log.id, {
        type: values.type,
        description: values.description,
        cost: values.cost,
        mileage: values.mileage,
        createdAt: values.createdAt.toISOString(), // Date -> ISO for API
      });
      successToast('Maintenance updated');
      setOpen(false);
      queryClient.invalidateQueries({
        queryKey: ['carMaintenanceLogs', carId],
      });
      queryClient.invalidateQueries({ queryKey: ['carDetails', carId] });
    } catch (e: any) {
      errorToast(e?.response?.data?.message || 'Failed to update maintenance');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 p-0"
          title="Edit maintenance"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Maintenance</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <Label>Type</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
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

          <div>
            <Label>Description</Label>
            <Input {...register('description')} />
          </div>

          <div>
            <Label>Cost</Label>
            <Input
              type="number"
              {...register('cost', { valueAsNumber: true })}
            />
          </div>

          <div>
            <Label>Mileage</Label>
            <Input
              type="number"
              {...register('mileage', { valueAsNumber: true })}
            />
          </div>

          <div>
            <Label>Date & Time</Label>
            <Controller
              control={control}
              name="createdAt"
              render={({ field }) => (
                <FormDatePicker value={field.value} onChange={field.onChange} />
              )}
            />
            {errors.createdAt && (
              <p className="text-red-500 text-xs">
                {String(errors.createdAt.message)}
              </p>
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
