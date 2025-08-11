'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateCar, Car } from '@/api/cars';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/toast';
import { DatePickerDemo } from '@/components/date-picker';
import { useEffect } from 'react';
import { Separator } from '@/components/ui/separator';
import { Loader } from '@/components/loader';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const currentYear = new Date().getFullYear();

const schema = z.object({
  make: z.string().nonempty('Make is required'),
  model: z.string().nonempty('Model is required'),
  year: z
    .number({ invalid_type_error: 'Year must be a number' })
    .min(2010, 'Year must be greater than 2010')
    .max(currentYear, 'Year must be less than or equal to current year'),
  purchasePrice: z
    .number({ invalid_type_error: 'Price must be a number' })
    .min(1, 'Price must be greater than 0'),
  pricePerDay: z
    .number({ invalid_type_error: 'Rent price must be a number' })
    .min(1, 'Rent price must be greater than 0'),
  mileage: z.number().min(0, 'Mileage must be a positive number'),
  monthlyLeasePrice: z
    .number()
    .min(0, 'Monthly lease price must be a positive number'),
  insuranceExpiryDate: z.date().refine((date) => date > new Date(), {
    message: 'Insurance expiry date must be in the future',
  }),
  status: z.enum(['active', 'sold', 'leased', 'maintenance', 'deleted']),
});

type formFields = z.infer<typeof schema>;

export function EditCarFormDialog({
  open,
  onOpenChange,
  car,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  car: Car | null;
}) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<formFields> }) =>
      updateCar(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cars'] });
      onOpenChange(false);
      toast({
        type: 'success',
        title: 'Car Updated',
        description: 'The car details have been updated successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        type: 'error',
        title: 'Error',
        description: error?.response?.data?.message || 'Failed to update car.',
      });
    },
  });

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<formFields>({
    resolver: zodResolver(schema),
    defaultValues: {
      make: '',
      model: '',
      year: undefined,
      purchasePrice: undefined,
      pricePerDay: undefined,
      mileage: undefined,
      monthlyLeasePrice: undefined,
      insuranceExpiryDate: undefined,
      status: 'active',
    },
  });

  useEffect(() => {
    if (car) {
      reset({
        make: car.make,
        model: car.model,
        year: car.year,
        purchasePrice: car.purchasePrice,
        pricePerDay: car.pricePerDay,
        mileage: car.mileage,
        monthlyLeasePrice: car.monthlyLeasePrice,
        insuranceExpiryDate: new Date(car.insuranceExpiryDate),
        status: car.status,
      });
    }
  }, [car, reset]);

  const onSubmit = (data: formFields) => {
    if (!car) return;
    mutation.mutate({ id: car.id, data });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) reset();
      }}
    >
      <DialogContent className="sm:max-w-[450px] pt-8">
        <DialogTitle className="pb-1 text-lg font-semibold">
          Edit Car
        </DialogTitle>
        <p className="text-sm text-muted-foreground mb-4">
          Update the details below to modify the car information.
        </p>
        <Separator className="mb-4" />

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Make */}
            <div className="flex flex-col">
              <Label htmlFor="make" className="mb-1">
                Make
              </Label>
              <Input
                id="make"
                placeholder="e.g. Toyota"
                {...register('make')}
              />
              {errors.make && (
                <span className="text-red-500 text-xs">
                  {errors.make.message}
                </span>
              )}
            </div>

            {/* Model */}
            <div className="flex flex-col">
              <Label htmlFor="model" className="mb-1">
                Model
              </Label>
              <Input
                id="model"
                placeholder="e.g. Corolla"
                {...register('model')}
              />
              {errors.model && (
                <span className="text-red-500 text-xs">
                  {errors.model.message}
                </span>
              )}
            </div>

            {/* Year */}
            <div className="flex flex-col">
              <Label htmlFor="year" className="mb-1">
                Year
              </Label>
              <Input
                id="year"
                type="number"
                placeholder="e.g. 2020"
                {...register('year', { valueAsNumber: true })}
              />
              {errors.year && (
                <span className="text-red-500 text-xs">
                  {errors.year.message}
                </span>
              )}
            </div>

            {/* Price/Day */}
            <div className="flex flex-col">
              <Label htmlFor="pricePerDay" className="mb-1">
                Price/Day (DHS)
              </Label>
              <Input
                id="pricePerDay"
                type="number"
                placeholder="e.g. 150"
                {...register('pricePerDay', { valueAsNumber: true })}
              />
              {errors.pricePerDay && (
                <span className="text-red-500 text-xs">
                  {errors.pricePerDay.message}
                </span>
              )}
            </div>

            {/* Purchase Price */}
            <div className="flex flex-col">
              <Label htmlFor="purchasePrice" className="mb-1">
                Purchase Price (DHS)
              </Label>
              <Input
                id="purchasePrice"
                type="number"
                placeholder="e.g. 280000"
                {...register('purchasePrice', { valueAsNumber: true })}
              />
              {errors.purchasePrice && (
                <span className="text-red-500 text-xs">
                  {errors.purchasePrice.message}
                </span>
              )}
            </div>

            {/* Monthly Lease Price */}
            <div className="flex flex-col">
              <Label htmlFor="monthlyLeasePrice" className="mb-1">
                Monthly Lease (DHS)
              </Label>
              <Input
                id="monthlyLeasePrice"
                type="number"
                placeholder="e.g. 4000"
                {...register('monthlyLeasePrice', { valueAsNumber: true })}
              />
              {errors.monthlyLeasePrice && (
                <span className="text-red-500 text-xs">
                  {errors.monthlyLeasePrice.message}
                </span>
              )}
            </div>

            {/* Insurance Expiry */}
            <div className="flex flex-col sm:col-span-2">
              <Label htmlFor="insuranceExpiryDate" className="mb-1">
                Insurance Expiry
              </Label>
              <Controller
                control={control}
                name="insuranceExpiryDate"
                render={({ field }) => (
                  <DatePickerDemo
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              {errors.insuranceExpiryDate && (
                <span className="text-red-500 text-xs">
                  {errors.insuranceExpiryDate.message}
                </span>
              )}
            </div>

            {/* Mileage + Status in same row */}
            <div className="flex flex-col">
              <Label htmlFor="mileage" className="mb-1">
                Mileage
              </Label>
              <Input
                id="mileage"
                type="number"
                placeholder="e.g. 120000"
                {...register('mileage', { valueAsNumber: true })}
              />
              {errors.mileage && (
                <span className="text-red-500 text-xs">
                  {errors.mileage.message}
                </span>
              )}
            </div>

            <div className="flex flex-col">
              <Label className="mb-1">Status</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="sold">Sold</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.status && (
                <span className="text-red-500 text-xs">
                  {errors.status.message}
                </span>
              )}
            </div>
          </div>

          {/* Save button */}
          <div className="text-right mt-6">
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? (
                <Loader className="animate-spin mr-2" />
              ) : null}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
