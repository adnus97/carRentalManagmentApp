'use client';

import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { DatePickerDemo } from '../date-picker';
import { toast } from '../ui/toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader } from '../loader';
import { createRent } from '@/api/rents';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { getCustomers } from '@/api/customers';
import { Separator } from '../ui/separator';

const rentSchema = z
  .object({
    carId: z.string().nonempty('Car is required'),
    customerId: z.string().nonempty('Customer is required'),
    startDate: z.date({ required_error: 'Start date is required' }),
    expectedEndDate: z.coerce.date().nullable().optional(),
    returnedAt: z.coerce.date().nullable().optional(),
    isOpenContract: z.boolean(),
    totalPrice: z.number().int().min(0).optional().nullable(),
    deposit: z
      .number({ invalid_type_error: 'Deposit is required' })
      .int('Deposit must be a number')
      .min(1, 'Deposit is required'),
    guarantee: z.number().int().min(0).default(0),
    totalPaid: z.number().int().min(0).default(0),
    isFullyPaid: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (
      data.expectedEndDate &&
      data.startDate &&
      data.expectedEndDate <= data.startDate
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End date must be after start date',
        path: ['expectedEndDate'],
      });
    }
  });
type RentFormFields = z.infer<typeof rentSchema>;

type RentFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCarId: string;
  defaultCarModel?: string;
  pricePerDay: number;
};

export function RentFormDialog({
  open,
  onOpenChange,
  defaultCarId,
  defaultCarModel,
  pricePerDay,
}: RentFormDialogProps) {
  const queryClient = useQueryClient();

  const { data: customers, isLoading: customersLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: getCustomers,
  });

  const mutation = useMutation({
    mutationFn: createRent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rents'] });
      onOpenChange(false);
      reset();
      toast({
        type: 'success',
        title: 'Success!',
        description: 'Rent contract created successfully.',
      });
    },
    onError: () => {
      toast({
        type: 'error',
        title: 'Error',
        description: 'Failed to create rent contract.',
      });
    },
  });

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue,
  } = useForm<RentFormFields>({
    resolver: zodResolver(rentSchema),
    defaultValues: {
      carId: defaultCarId,
      customerId: '',
      startDate: undefined,
      expectedEndDate: null,
      isOpenContract: false,
      totalPrice: 0,
      deposit: 0,
      guarantee: 0,
      returnedAt: null,
      totalPaid: 0,
      isFullyPaid: false,
    },
  });

  useEffect(() => {
    if (defaultCarId) {
      setValue('carId', defaultCarId);
    }
  }, [defaultCarId, setValue]);

  const isOpenContract = watch('isOpenContract');
  const startDate = watch('startDate');
  const expectedEndDate = watch('expectedEndDate');
  const deposit = watch('deposit');
  const totalPaid = watch('totalPaid');
  const isFullyPaid = watch('isFullyPaid');

  useEffect(() => {
    if (isOpenContract) {
      setValue('totalPrice', 0);
      setValue('expectedEndDate', null);
    }
  }, [isOpenContract, setValue]);

  useEffect(() => {
    if (
      !isOpenContract &&
      startDate &&
      expectedEndDate &&
      !isNaN(startDate.getTime()) &&
      !isNaN(expectedEndDate.getTime()) &&
      expectedEndDate > startDate
    ) {
      const msPerDay = 1000 * 60 * 60 * 24;
      const days = Math.max(
        1,
        Math.ceil((expectedEndDate.getTime() - startDate.getTime()) / msPerDay),
      );
      setValue('totalPrice', days * pricePerDay);
    } else {
      setValue('totalPrice', 0);
    }
  }, [startDate, expectedEndDate, pricePerDay, isOpenContract, setValue]);

  useEffect(() => {
    if (!isOpenContract && expectedEndDate) {
      setValue('returnedAt', expectedEndDate);
    }
    if (isOpenContract) {
      setValue('returnedAt', null);
    }
  }, [isOpenContract, expectedEndDate, setValue]);

  useEffect(() => {
    setValue('totalPaid', deposit || 0);
  }, [deposit, setValue]);

  const onSubmit = (data: RentFormFields) => {
    mutation.mutate({
      carId: data.carId,
      userId: data.customerId,
      startDate: data.startDate,
      expectedEndDate: data.expectedEndDate ? data.expectedEndDate : undefined,
      returnedAt: data.returnedAt ? data.returnedAt : undefined,
      customerId: data.customerId,
      totalPrice: data.totalPrice ?? 0,
      deposit: data.deposit ?? 0,
      guarantee: data.guarantee ?? 0,
      isOpenContract: data.isOpenContract,
      totalPaid: data.totalPaid ?? 0,
      isFullyPaid: data.isFullyPaid ?? false,
      status: 'active',
      lateFee: 0,
      damageReport: '',
      isDeleted: false,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-full sm:max-w-[500px] ">
        {/* Hide title and description on small screens */}
        <DialogTitle className="hidden sm:block">
          Create Rent Contract
        </DialogTitle>
        <DialogDescription className="hidden sm:block">
          Fill out the form below to create a new rent contract for the selected
          vehicle.
        </DialogDescription>
        <Separator className="my-2 hidden sm:block" />
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-3 w-full"
          noValidate
        >
          {/* Car Model and Customer side by side */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <Label>Car Model</Label>
              <Input
                value={defaultCarModel || ''}
                disabled
                className="mt-1 w-full"
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="customerId">Customer</Label>
              <Controller
                control={control}
                name="customerId"
                render={({ field }) => (
                  <div className="mt-1 w-full">
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ''}
                      disabled={customersLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers?.map((customer: any) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {`${customer.firstName || ''} ${customer.lastName || ''}`.trim() ||
                              customer.name ||
                              customer.email ||
                              customer.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              />
              {errors.customerId && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.customerId.message}
                </p>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <Label>Start Date</Label>
              <Controller
                control={control}
                name="startDate"
                render={({ field }) => (
                  <div className="w-full">
                    <DatePickerDemo
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </div>
                )}
              />
              {errors.startDate && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.startDate.message}
                </p>
              )}
            </div>
            <div className="flex-1">
              <Label>Expected End Date</Label>
              <Controller
                control={control}
                name="expectedEndDate"
                render={({ field }) => (
                  <div className="w-full">
                    <DatePickerDemo
                      value={field.value ?? undefined}
                      onChange={field.onChange}
                      disabled={isOpenContract}
                    />
                  </div>
                )}
              />
              {errors.expectedEndDate && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.expectedEndDate.message}
                </p>
              )}
            </div>
          </div>

          {/* Open Contract */}
          <div className="flex items-center space-x-2">
            <Controller
              control={control}
              name="isOpenContract"
              render={({ field }) => (
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                  id="isOpenContract"
                />
              )}
            />
            <Label htmlFor="isOpenContract" className="cursor-pointer">
              Open Contract (no fixed end date)
            </Label>
          </div>

          {/* Pricing and Fees */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <Label htmlFor="totalPrice">Total Price (DHS)</Label>
              <Input
                id="totalPrice"
                type="number"
                {...register('totalPrice', { valueAsNumber: true })}
                placeholder="Total price"
                className="mt-1 w-full"
                disabled={true}
              />
              {errors.totalPrice && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.totalPrice.message}
                </p>
              )}
            </div>
            <div className="flex-1">
              <Label htmlFor="deposit">Deposit (DHS)</Label>
              <Input
                id="deposit"
                type="number"
                {...register('deposit', { valueAsNumber: true })}
                placeholder="Deposit amount"
                className="mt-1 w-full"
              />
              {errors.deposit && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.deposit.message}
                </p>
              )}
            </div>
            <div className="flex-1">
              <Label htmlFor="guarantee">Guarantee (DHS)</Label>
              <Input
                id="guarantee"
                type="number"
                {...register('guarantee', { valueAsNumber: true })}
                placeholder="Guarantee amount"
                className="mt-1 w-full"
              />
              {errors.guarantee && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.guarantee.message}
                </p>
              )}
            </div>
          </div>

          {/* Mark as fully paid (checkbox, own line) */}
          <div className="flex items-center space-x-2">
            <Controller
              control={control}
              name="isFullyPaid"
              render={({ field }) => (
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                  id="isFullyPaid"
                />
              )}
            />
            <Label htmlFor="isFullyPaid" className="cursor-pointer">
              Mark as fully paid
            </Label>
          </div>

          {/* Total Paid (1/3 width) */}
          <div className="flex">
            <div className="w-1/3">
              <Label htmlFor="totalPaid">Total Paid (DHS)</Label>
              <Input
                id="totalPaid"
                type="number"
                value={totalPaid || 0}
                disabled
                className="mt-1 w-full"
                readOnly
              />
              {errors.totalPaid && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.totalPaid.message}
                </p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting} className="px-6 py-2">
              {isSubmitting ? (
                <Loader className="animate-spin mr-2 inline-block" />
              ) : null}
              Save Rent
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
