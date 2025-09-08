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
  plateNumber: z.string().min(1, 'Plate number is required'),
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
  color: z.string().optional(),
  fuelType: z.string().optional(),
  monthlyLeasePrice: z
    .number()
    .min(0, 'Monthly lease price must be a positive number'),
  insuranceExpiryDate: z.date().refine((date) => date > new Date(), {
    message: 'Insurance expiry date must be in the future',
  }),
  technicalVisiteExpiryDate: z.date().refine((date) => date > new Date(), {
    message: 'Technical visit expiry date must be in the future',
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
      plateNumber: '',
      make: '',
      model: '',
      year: undefined,
      purchasePrice: undefined,
      pricePerDay: undefined,
      mileage: undefined,
      color: '',
      fuelType: 'gasoline',
      monthlyLeasePrice: undefined,
      insuranceExpiryDate: undefined,
      technicalVisiteExpiryDate: undefined,
      status: 'active',
    },
  });

  useEffect(() => {
    if (car) {
      reset({
        plateNumber: car.plateNumber,
        make: car.make,
        model: car.model,
        year: car.year,
        purchasePrice: car.purchasePrice,
        pricePerDay: car.pricePerDay,
        mileage: car.mileage,
        color: car.color || '',
        fuelType: car.fuelType || 'gasoline',
        monthlyLeasePrice: car.monthlyLeasePrice,
        insuranceExpiryDate: new Date(car.insuranceExpiryDate),
        technicalVisiteExpiryDate: new Date(car.technicalVisiteExpiryDate),
        status: car.status,
      });
    }
  }, [car, reset]);

  const onSubmit = (data: formFields) => {
    if (!car) return;

    console.log('Raw form data:', data);
    console.log(
      'Insurance date type:',
      typeof data.insuranceExpiryDate,
      data.insuranceExpiryDate,
    );
    console.log(
      'Technical visit date type:',
      typeof data.technicalVisiteExpiryDate,
      data.technicalVisiteExpiryDate,
    );

    // ✅ Force conversion to native Date objects
    const formattedData = {
      ...data,
      // Force conversion to native Date objects
      insuranceExpiryDate: new Date(data.insuranceExpiryDate),
      technicalVisiteExpiryDate: new Date(data.technicalVisiteExpiryDate),
    };

    console.log('Formatted data:', formattedData);
    console.log(
      'Insurance date after conversion:',
      formattedData.insuranceExpiryDate,
      typeof formattedData.insuranceExpiryDate,
    );
    console.log(
      'Technical visit date after conversion:',
      formattedData.technicalVisiteExpiryDate,
      typeof formattedData.technicalVisiteExpiryDate,
    );

    mutation.mutate({ id: car.id, data: formattedData });
  };

  const colorOptions = [
    'White',
    'Black',
    'Silver',
    'Gray',
    'Blue',
    'Red',
    'Green',
    'Yellow',
    'Orange',
    'Brown',
    'Purple',
    'Gold',
    'Beige',
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) reset();
      }}
    >
      <DialogContent className="sm:max-w-[600px] pt-4 max-h-[90vh] overflow-hidden">
        <DialogTitle className="text-lg font-semibold">Edit Car</DialogTitle>
        <p className="text-sm text-muted-foreground">
          Update the details below to modify the car information.
        </p>
        <Separator />

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[9px]">
            {/* Plate Number - Full width */}
            <div className="flex flex-col sm:col-span-2">
              <Label htmlFor="plateNumber" className="mb-1">
                Plate Number *
              </Label>
              <Input
                id="plateNumber"
                className="w-full font-mono"
                placeholder="e.g. 123-A-456"
                {...register('plateNumber')}
              />
              {errors.plateNumber && (
                <span className="text-red-500 text-xs mt-1">
                  {errors.plateNumber.message}
                </span>
              )}
            </div>

            {/* Make */}
            <div className="flex flex-col">
              <Label htmlFor="make" className="mb-1">
                Make *
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
                Model *
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
            <div>
              <Label htmlFor="fuelType">Fuel Type</Label>
              <Controller
                control={control}
                name="fuelType"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field?.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select fuel type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gasoline">Gasoline</SelectItem>
                      <SelectItem value="diesel">Diesel</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                      <SelectItem value="electric">Electric</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Color */}
            <div>
              <Label htmlFor="color">Color</Label>
              <Controller
                control={control}
                name="color"
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ''}
                  >
                    <SelectTrigger
                      className={errors.color ? 'border-red-500' : ''}
                    >
                      <SelectValue placeholder="Select color" />
                    </SelectTrigger>
                    <SelectContent className="overflow-y-auto h-[300px]">
                      {colorOptions.map((color) => (
                        <SelectItem key={color} value={color.toLowerCase()}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded-full border border-gray-300"
                              style={{ backgroundColor: color.toLowerCase() }}
                            />
                            {color}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.color && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.color.message}
                </p>
              )}
            </div>

            {/* Fuel Type */}
            {/* Year */}
            <div className="flex flex-col">
              <Label htmlFor="year" className="mb-1">
                Year *
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
                Price/Day (DHS) *
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
                Purchase Price (DHS) *
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
                Monthly Lease (DHS) *
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

            {/* Mileage */}
            <div className="flex flex-col">
              <Label htmlFor="mileage" className="mb-1">
                Mileage (km) *
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

            {/* Status */}
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

            {/* Insurance Expiry - Full width */}
            <div className="flex flex-col">
              <Label htmlFor="insuranceExpiryDate" className="mb-1">
                Insurance Expiry *
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

            {/* Technical Visit Expiry - Full width */}
            <div className="flex flex-col">
              <Label htmlFor="technicalVisiteExpiryDate" className="mb-1">
                Technical Visit Expiry *
              </Label>
              <Controller
                control={control}
                name="technicalVisiteExpiryDate"
                render={({ field }) => (
                  <DatePickerDemo
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              {errors.technicalVisiteExpiryDate && (
                <span className="text-red-500 text-xs">
                  {errors.technicalVisiteExpiryDate.message}
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
