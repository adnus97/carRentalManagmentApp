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
import { addMaintenanceLog } from '@/api/cars';
import { successToast, errorToast } from '@/components/ui/toast';
import { DatePickerDemo } from '../../../components/date-picker';
import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const maintenanceSchema = z.object({
  description: z.string().nonempty('Description is required'),
  cost: z
    .number({ invalid_type_error: 'Cost must be a number' })
    .min(1, 'Cost is required'),
  date: z.date({ required_error: 'Date is required' }),
});

type MaintenanceFormFields = z.infer<typeof maintenanceSchema>;

export default function AddMaintenanceDialog({ carId }: { carId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (payload: MaintenanceFormFields) =>
      addMaintenanceLog(carId, payload),
    onSuccess: () => {
      successToast('Maintenance log added');
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
      description: '',
      cost: undefined,
      date: undefined,
    },
  });

  const onSubmit = (data: MaintenanceFormFields) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">+ Add Maintenance</Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Maintenance Log</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Description</Label>
            <Input {...register('description')} />
            {errors.description && (
              <p className="text-red-500 text-xs">
                {errors.description.message}
              </p>
            )}
          </div>
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
          <div>
            <Label>Date</Label>
            <Controller
              control={control}
              name="date"
              render={({ field }) => (
                <DatePickerDemo value={field.value} onChange={field.onChange} />
              )}
            />
            {errors.date && (
              <p className="text-red-500 text-xs">{errors.date.message}</p>
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
