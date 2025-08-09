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
import { RentStatus } from '@/types/rent-status.type';

const rentSchema = z
  .object({
    carId: z.string().min(1, 'Car is required'),
    customerId: z.string().min(1, 'Customer is required'),
    startDate: z.date({ required_error: 'Start date is required' }),
    expectedEndDate: z.coerce.date().nullable().optional(),
    returnedAt: z.coerce.date().nullable().optional(),
    isOpenContract: z.boolean().default(false),
    totalPrice: z
      .number({ invalid_type_error: 'Total price must be a number' })
      .min(0, 'Total price cannot be negative')
      .optional()
      .nullable(),
    deposit: z
      .number({ invalid_type_error: 'Deposit must be a number' })
      .min(0, 'Deposit cannot be negative')
      .default(0),
    guarantee: z
      .number({ invalid_type_error: 'Guarantee must be a number' })
      .min(0, 'Guarantee cannot be negative')
      .default(0),
    totalPaid: z
      .number({ invalid_type_error: 'Total paid must be a number' })
      .min(0, 'Total paid cannot be negative')
      .default(0),
    isFullyPaid: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    // Validate that either expectedEndDate or isOpenContract is set
    if (!data.isOpenContract && !data.expectedEndDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Expected end date is required for fixed contracts',
        path: ['expectedEndDate'],
      });
    }

    // Validate end date is after start date
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

    // Validate start date is not too far in the past (1 year)
    if (data.startDate) {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      if (data.startDate < oneYearAgo) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Start date cannot be more than one year in the past',
          path: ['startDate'],
        });
      }
    }

    // Only validate total paid vs total price for fixed contracts
    if (
      !data.isOpenContract &&
      data.totalPrice !== undefined &&
      data.totalPrice !== null &&
      data.totalPaid !== undefined &&
      data.totalPaid !== null &&
      data.totalPaid > data.totalPrice
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Total paid cannot exceed total price for fixed contracts',
        path: ['totalPaid'],
      });
    }

    // Only validate fully paid logic for fixed contracts
    if (
      !data.isOpenContract &&
      data.isFullyPaid &&
      data.totalPrice !== undefined &&
      data.totalPrice !== null &&
      data.totalPaid !== data.totalPrice
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Total paid must equal total price when marked as fully paid (fixed contracts only)',
        path: ['isFullyPaid'],
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
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to create rent contract.';

      toast({
        type: 'error',
        title: 'Error',
        description: errorMessage,
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
    trigger,
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
  const totalPrice = watch('totalPrice');
  const totalPaid = watch('totalPaid');
  const isFullyPaid = watch('isFullyPaid');

  // Handle open contract toggle
  useEffect(() => {
    if (isOpenContract) {
      setValue('totalPrice', 0);
      setValue('expectedEndDate', null);
      setValue('returnedAt', null);
    }
    trigger(['expectedEndDate', 'totalPrice']);
  }, [isOpenContract, setValue, trigger]);

  // Calculate total price based on dates and price per day
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
    } else if (!isOpenContract) {
      setValue('totalPrice', 0);
    }
  }, [startDate, expectedEndDate, pricePerDay, isOpenContract, setValue]);

  // Set returned date same as expected end date for fixed contracts
  useEffect(() => {
    if (!isOpenContract && expectedEndDate) {
      setValue('returnedAt', expectedEndDate);
    }
    if (isOpenContract) {
      setValue('returnedAt', null);
    }
  }, [isOpenContract, expectedEndDate, setValue]);

  // Handle fully paid checkbox
  useEffect(() => {
    if (
      isFullyPaid &&
      !isOpenContract &&
      totalPrice !== undefined &&
      totalPrice !== null
    ) {
      // For fixed contracts, set total paid to total price
      setValue('totalPaid', totalPrice);
    } else if (isFullyPaid && isOpenContract) {
      // For open contracts, don't automatically set total paid
      // User can manually enter any amount
    } else if (!isFullyPaid) {
      // If not fully paid, set to deposit amount
      setValue('totalPaid', deposit || 0);
    }
    trigger(['totalPaid', 'isFullyPaid']);
  }, [isFullyPaid, totalPrice, deposit, isOpenContract, setValue, trigger]);

  // Update total paid when deposit changes (if not fully paid)
  useEffect(() => {
    if (!isFullyPaid) {
      setValue('totalPaid', deposit || 0);
    }
  }, [deposit, isFullyPaid, setValue]);

  const onSubmit = (data: RentFormFields) => {
    if (!data.carId) {
      toast({
        type: 'error',
        title: 'Validation Error',
        description: 'Please select a car.',
      });
      return;
    }

    if (!data.customerId) {
      toast({
        type: 'error',
        title: 'Validation Error',
        description: 'Please select a customer.',
      });
      return;
    }

    mutation.mutate({
      carId: data.carId,
      customerId: data.customerId,
      startDate: data.startDate,
      expectedEndDate: data.expectedEndDate || undefined,
      returnedAt: data.returnedAt || undefined,
      totalPrice: data.totalPrice ?? 0,
      deposit: data.deposit ?? 0,
      guarantee: data.guarantee ?? 0,
      isOpenContract: data.isOpenContract,
      totalPaid: data.totalPaid ?? 0,
      isFullyPaid: data.isFullyPaid,
      status: 'reserved' as RentStatus,
      lateFee: 0,
      damageReport: '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-full sm:max-w-[500px]">
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
          {/* Car Model and Customer */}
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
              <Label htmlFor="customerId">Customer *</Label>
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
                      <SelectTrigger
                        className={errors.customerId ? 'border-red-500' : ''}
                      >
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
              <Label>Start Date *</Label>
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
              <Label>Expected End Date {!isOpenContract && '*'}</Label>
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
                  className="rounded"
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
                className={`mt-1 w-full ${errors.totalPrice ? 'border-red-500' : ''}`}
                disabled={isOpenContract}
                readOnly={!isOpenContract}
              />
              {errors.totalPrice && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.totalPrice.message}
                </p>
              )}
            </div>
            <div className="flex-1">
              <Label htmlFor="deposit">Deposit (DHS) *</Label>
              <Input
                id="deposit"
                type="number"
                {...register('deposit', { valueAsNumber: true })}
                placeholder="Deposit amount"
                className={`mt-1 w-full ${errors.deposit ? 'border-red-500' : ''}`}
                min="0"
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
                className={`mt-1 w-full ${errors.guarantee ? 'border-red-500' : ''}`}
                min="0"
              />
              {errors.guarantee && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.guarantee.message}
                </p>
              )}
            </div>
          </div>

          {/* Mark as fully paid */}
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
                  className="rounded"
                  disabled={!isOpenContract && !totalPrice}
                />
              )}
            />
            <Label htmlFor="isFullyPaid" className="cursor-pointer">
              Mark as fully paid
            </Label>
            {errors.isFullyPaid && (
              <p className="text-red-500 text-sm">
                {errors.isFullyPaid.message}
              </p>
            )}
          </div>

          {/* Total Paid */}
          <div className="flex">
            <div className="w-1/3">
              <Label htmlFor="totalPaid">Total Paid (DHS)</Label>
              <Input
                id="totalPaid"
                type="number"
                {...register('totalPaid', { valueAsNumber: true })}
                className={`mt-1 w-full ${errors.totalPaid ? 'border-red-500' : ''}`}
                disabled={!isOpenContract && isFullyPaid}
                readOnly={!isOpenContract && isFullyPaid}
                min="0"
                placeholder="Amount paid"
              />
              {errors.totalPaid && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.totalPaid.message}
                </p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="px-6 py-2">
              {isSubmitting ? (
                <Loader className="animate-spin mr-2 inline-block" />
              ) : null}
              Create Rent Contract
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
