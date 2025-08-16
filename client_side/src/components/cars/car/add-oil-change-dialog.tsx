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
import { addOilChange } from '@/api/cars';
import { successToast, errorToast } from '@/components/ui/toast';
import { DatePickerDemo } from '../../../components/date-picker';
import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const oilChangeSchema = z.object({
  changedAt: z.date({ required_error: 'Date is required' }),
  mileage: z
    .number({ invalid_type_error: 'Mileage must be a number' })
    .min(1, 'Mileage is required'),
  notes: z.string().optional(),
});

type OilChangeFormFields = z.infer<typeof oilChangeSchema>;

export default function AddOilChangeDialog({ carId }: { carId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (payload: OilChangeFormFields) => addOilChange(carId, payload),
    onSuccess: () => {
      successToast('Oil change recorded');
      queryClient.invalidateQueries({ queryKey: ['carDetails', carId] });
      setIsOpen(false);
      reset();
    },
    onError: (err: any) => {
      errorToast(err?.response?.data?.message || 'Failed to record oil change');
    },
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<OilChangeFormFields>({
    resolver: zodResolver(oilChangeSchema),
    defaultValues: {
      changedAt: undefined,
      mileage: undefined,
      notes: '',
    },
  });

  const onSubmit = (data: OilChangeFormFields) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">+ Add Oil Change</Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Oil Change</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Date</Label>
            <Controller
              control={control}
              name="changedAt"
              render={({ field }) => (
                <DatePickerDemo value={field.value} onChange={field.onChange} />
              )}
            />
            {errors.changedAt && (
              <p className="text-red-500 text-xs">{errors.changedAt.message}</p>
            )}
          </div>
          <div>
            <Label>Mileage</Label>
            <Input
              type="number"
              {...register('mileage', { valueAsNumber: true })}
            />
            {errors.mileage && (
              <p className="text-red-500 text-xs">{errors.mileage.message}</p>
            )}
          </div>
          <div>
            <Label>Notes</Label>
            <Input {...register('notes')} />
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
