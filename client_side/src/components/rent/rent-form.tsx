'use client';

import React, { useEffect, useState } from 'react';
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
import {
  createRentWithImages,
  buildCreateRentFormData,
  CreateRentResponse,
} from '@/api/rents';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { getCustomers } from '@/api/customers';
import { RentStatus } from '@/types/rent-status.type';
import { AddClientDialog } from '../customers/add-client-form';
import {
  Plus,
  Car,
  User,
  Camera,
  Calendar,
  Check,
  WarningCircle,
} from '@phosphor-icons/react';

import { CarImageUpload } from './car-image-upload';
import { Badge } from '@/components/ui/badge';

import { Checkbox } from '@/components/ui/checkbox';

const rentSchema = z
  .object({
    carId: z.string().min(1, 'Car is required'),
    customerId: z.string().min(1, 'Customer is required'),
    startDate: z.date({ required_error: 'Start date is required' }),
    expectedEndDate: z.preprocess(
      (val) =>
        val instanceof Date ? val : val ? new Date(val as string) : null,
      z.date().nullable().optional(),
    ),
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
    if (!data.isOpenContract) {
      if (!data.expectedEndDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Expected end date is required for fixed contracts',
          path: ['expectedEndDate'],
        });
      } else {
        if (data.expectedEndDate <= data.startDate) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'End date must be after start date',
            path: ['expectedEndDate'],
          });
        }
      }
    }

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

    if (
      !data.isOpenContract &&
      data.totalPrice != null &&
      data.totalPaid != null &&
      data.totalPaid > data.totalPrice
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Total paid cannot exceed total price for fixed contracts',
        path: ['totalPaid'],
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
  const [carImages, setCarImages] = useState<File[]>([]);

  const { data: customers, isLoading: customersLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => getCustomers(1, 100),
  });

  const mutation = useMutation({
    mutationFn: async (payload: RentFormFields) => {
      const fd = buildCreateRentFormData(
        {
          carId: payload.carId,
          customerId: payload.customerId,
          startDate: payload.startDate,
          expectedEndDate: payload.expectedEndDate ?? null,
          returnedAt: payload.returnedAt ?? null,
          totalPrice: payload.totalPrice ?? 0,
          deposit: payload.deposit ?? 0,
          guarantee: payload.guarantee ?? 0,
          lateFee: 0,
          totalPaid: payload.totalPaid ?? 0,
          isFullyPaid: payload.isFullyPaid ?? false,
          isOpenContract: payload.isOpenContract,
          status: 'reserved' as RentStatus,
          damageReport: '',
        },
        carImages,
      );
      return createRentWithImages(fd);
    },
    onSuccess: (response: CreateRentResponse) => {
      queryClient.invalidateQueries({ queryKey: ['rents'] });
      queryClient.invalidateQueries({ queryKey: ['cars'] });
      onOpenChange(false);
      reset();
      setCarImages([]);

      toast({
        type: 'success',
        title: 'Success!',
        description: `Rent contract ${
          response.data?.rentContractId || 'created'
        } successfully.`,
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
    clearErrors,
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
  const isFullyPaid = watch('isFullyPaid');

  useEffect(() => {
    if (isOpenContract) {
      setValue('totalPrice', 0);
      setValue('expectedEndDate', null, { shouldValidate: false });
      setValue('returnedAt', null, { shouldValidate: false });
      clearErrors('expectedEndDate');
    }
  }, [isOpenContract, setValue, clearErrors]);

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

  useEffect(() => {
    if (!isOpenContract && expectedEndDate) {
      setValue('returnedAt', expectedEndDate);
    }
    if (isOpenContract) {
      setValue('returnedAt', null);
    }
  }, [isOpenContract, expectedEndDate, setValue]);

  useEffect(() => {
    if (isFullyPaid && !isOpenContract && totalPrice != null) {
      setValue('totalPaid', totalPrice);
    } else if (!isFullyPaid) {
      setValue('totalPaid', deposit || 0);
    }
    trigger(['totalPaid', 'isFullyPaid']);
  }, [isFullyPaid, totalPrice, deposit, isOpenContract, setValue, trigger]);

  const onSubmit = (data: RentFormFields) => {
    const selectedCustomer = customers?.data?.find(
      (c: any) => c.id === data.customerId,
    );

    if (selectedCustomer?.isBlacklisted) {
      toast({
        type: 'error',
        title: 'Validation Error',
        description: 'This customer is blacklisted and cannot rent a car.',
      });
      return;
    }

    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="
          w-full max-w-4xl
          max-h-[92vh] md:max-h-[90vh] lg:max-h-[88vh]
          overflow-hidden
          flex flex-col
          bg-gray-1
          border border-gray-200 dark:border-slate-700
          rounded-2xl shadow-xl
        "
      >
        {/* Header – no extra X button here to avoid duplication */}
        <div
          className="
            flex items-center justify-between
            px-5 py-3
            border-b border-gray-200 dark:border-slate-700
            bg-gray-1
          "
        >
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-md bg-blue-600 text-white">
              <Car className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <DialogTitle className="text-base font-semibold text-gray-900 dark:text-white">
                Create Rental Contract
              </DialogTitle>
              {defaultCarModel && (
                <DialogDescription className="text-xs text-gray-500 dark:text-slate-400">
                  {defaultCarModel} • Available
                </DialogDescription>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-gray-1 p-3 sm:p-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
            {/* Left – Main */}
            <div className="lg:col-span-2 flex flex-col gap-3 sm:gap-4">
              {/* Vehicle & Customer */}
              <section
                className="
                  bg-white dark:bg-gray-1
                  border border-gray-200 dark:border-slate-700
                  rounded-xl p-3 sm:p-4
                "
              >
                <div className="mb-3 flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-500" />
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    Vehicle & Customer
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-gray-600 dark:text-slate-300">
                      Vehicle
                    </Label>
                    <div className="mt-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 text-sm text-gray-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4 text-gray-400" />
                        <span>{defaultCarModel || 'Selected Vehicle'}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-gray-600 dark:text-slate-300">
                      Customer *
                    </Label>
                    <Controller
                      control={control}
                      name="customerId"
                      render={({ field }) => (
                        <div className="mt-1 flex items-center gap-2">
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || ''}
                            disabled={customersLoading}
                          >
                            <SelectTrigger
                              className={`
                                h-9 rounded-lg px-3
                                border border-gray-200 dark:border-slate-700
                                text-sm text-gray-900 dark:text-white
                                ${errors.customerId ? 'border-red-500' : ''}
                              `}
                            >
                              <SelectValue placeholder="Select customer" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg">
                              {customers?.data
                                ?.filter((c: any) => !c.isBlacklisted)
                                .map((c: any) => (
                                  <SelectItem
                                    key={c.id}
                                    value={c.id}
                                    className="text-sm text-gray-900 dark:text-white"
                                  >
                                    {`${c.firstName || ''} ${c.lastName || ''}`.trim() ||
                                      c.email ||
                                      c.id}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>

                          <AddClientDialog
                            trigger={
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="
                                  h-9 w-9 rounded-lg
                                  border border-gray-200 dark:border-slate-700
                                  text-gray-700 dark:text-slate-300
                                  hover:bg-gray-100 dark:hover:bg-slate-800
                                "
                              >
                                <Plus size={16} />
                              </Button>
                            }
                          />
                        </div>
                      )}
                    />
                    {errors.customerId && (
                      <p className="text-[11px] text-red-500 mt-1">
                        {errors.customerId.message}
                      </p>
                    )}
                  </div>
                </div>
              </section>

              {/* Schedule */}
              <section
                className="
                  border border-gray-200 dark:border-slate-700
                  rounded-xl p-3 sm:p-4
                "
              >
                <div className="mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-green-500" />
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    Schedule
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-gray-600 dark:text-slate-300">
                      Start Date *
                    </Label>
                    <div className="mt-1">
                      <Controller
                        control={control}
                        name="startDate"
                        render={({ field }) => (
                          <DatePickerDemo
                            value={field.value}
                            onChange={field.onChange}
                          />
                        )}
                      />
                    </div>
                    {errors.startDate && (
                      <p className="text-[11px] text-red-500 mt-1">
                        {errors.startDate.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs text-gray-600 dark:text-slate-300">
                      Expected End Date {!isOpenContract && '*'}
                    </Label>
                    <div className="mt-1">
                      <Controller
                        control={control}
                        name="expectedEndDate"
                        render={({ field }) => (
                          <DatePickerDemo
                            value={field.value ?? undefined}
                            onChange={(d) => {
                              field.onChange(d ?? null);
                              trigger('expectedEndDate');
                            }}
                            disabled={isOpenContract}
                          />
                        )}
                      />
                    </div>
                    {errors.expectedEndDate && (
                      <p className="text-[11px] text-red-500 mt-1">
                        {errors.expectedEndDate.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Controller
                    control={control}
                    name="isOpenContract"
                    render={({ field }) => (
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        id="isOpenContract"
                        className="h-4 w-4"
                      />
                    )}
                  />
                  <Label
                    htmlFor="isOpenContract"
                    className="text-xs text-gray-700 dark:text-slate-300 cursor-pointer"
                  >
                    Open Contract (no fixed end date)
                  </Label>
                </div>
              </section>

              {/* Car Images */}
              <section
                className="
                  border border-gray-200 dark:border-slate-700
                  rounded-xl p-3 sm:p-4
                "
              >
                <div className="mb-3 flex items-center gap-2">
                  <Camera className="h-4 w-4 text-purple-500" />
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    Car Images
                  </h3>
                  <Badge variant="outline" className="text-[10px]">
                    Optional
                  </Badge>
                </div>
                <CarImageUpload
                  onImagesChange={setCarImages}
                  maxImages={4}
                  disabled={isSubmitting}
                />
              </section>
            </div>

            {/* Right – Finance */}
            <section
              className="
                border border-gray-200 dark:border-slate-700
                rounded-xl p-3 sm:p-4
                flex flex-col gap-4
              "
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Financial Details
                </h3>
                {totalPrice != null && totalPrice > 0 && (
                  <Badge className="text-[11px] font-semibold">
                    {totalPrice.toLocaleString()} DHS
                  </Badge>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-gray-600 dark:text-slate-300">
                    Total Price (DHS)
                  </Label>
                  <Input
                    type="number"
                    {...register('totalPrice', { valueAsNumber: true })}
                    placeholder="Auto"
                    className={`
                      mt-1 h-9 rounded-lg text-sm
                      border border-gray-200 dark:border-slate-700
                      ${errors.totalPrice ? 'border-red-500' : ''}
                    `}
                    disabled={isOpenContract}
                    readOnly={!isOpenContract}
                  />
                  {errors.totalPrice && (
                    <p className="text-[11px] text-red-500 mt-1">
                      {errors.totalPrice.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-gray-600 dark:text-slate-300">
                      Deposit *
                    </Label>
                    <Input
                      type="number"
                      {...register('deposit', { valueAsNumber: true })}
                      placeholder="0"
                      className="mt-1 h-9 rounded-lg text-sm border-gray-200 dark:border-slate-700"
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-gray-600 dark:text-slate-300">
                      Guarantee
                    </Label>
                    <Input
                      type="number"
                      {...register('guarantee', { valueAsNumber: true })}
                      placeholder="0"
                      className="mt-1 h-9 rounded-lg text-sm border-gray-200 dark:border-slate-700"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-gray-600 dark:text-slate-300">
                    Total Paid (DHS)
                  </Label>
                  <Input
                    type="number"
                    {...register('totalPaid', { valueAsNumber: true })}
                    placeholder="0"
                    className={`
                      mt-1 h-9 rounded-lg text-sm
                      border border-gray-200 dark:border-slate-700
                      ${errors.totalPaid ? 'border-red-500' : ''}
                    `}
                    disabled={!isOpenContract && isFullyPaid}
                    readOnly={!isOpenContract && isFullyPaid}
                  />
                  {errors.totalPaid && (
                    <p className="text-[11px] text-red-500 mt-1">
                      {errors.totalPaid.message}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 rounded-lg px-3 py-2 border border-gray-200 dark:border-slate-700 cursor-pointer">
                  <Controller
                    control={control}
                    name="isFullyPaid"
                    render={({ field }) => (
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        id="isFullyPaid"
                        className="h-4 w-4"
                        disabled={
                          !isOpenContract &&
                          (totalPrice == null || totalPrice === 0)
                        }
                      />
                    )}
                  />
                  <Label
                    htmlFor="isFullyPaid"
                    className="text-xs text-gray-700 dark:text-slate-300"
                  >
                    Mark as fully paid
                  </Label>
                </div>
              </div>

              <div className="mt-1 space-y-2">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  onClick={handleSubmit(onSubmit)}
                  variant="default"
                >
                  {isSubmitting ? (
                    <>
                      <Loader className="animate-spin mr-2 h-4 w-4" />
                      Creating
                      <Loader />
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Create Rental Contract
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                  className="w-full"
                >
                  Cancel
                </Button>

                <div className="pt-1">
                  <div className="flex space-x-1 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <WarningCircle
                      size={16}
                      className="text-amber-800 dark:text-amber-300"
                    />
                    <p className="text-[10px] text-amber-800 dark:text-amber-300">
                      Blacklisted customers are hidden from selection.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
