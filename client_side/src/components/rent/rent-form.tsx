'use client';

import React, { useEffect, useMemo, useState } from 'react';
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
import { FormDatePicker } from '../form-date-picker';
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
import { useTranslation } from 'react-i18next';

// Zod schema factory with i18n keys (like Cars form)
const makeRentSchema = () =>
  z
    .object({
      carId: z.string().min(1, 'form.errors.car_required'),
      customerId: z.string().min(1, 'form.errors.customer_required'),
      startDate: z.date({
        required_error: 'form.errors.start_required',
        invalid_type_error: 'form.errors.start_invalid',
      }),
      expectedEndDate: z.preprocess(
        (val) =>
          val instanceof Date ? val : val ? new Date(val as string) : null,
        z
          .date({
            invalid_type_error: 'form.errors.end_invalid',
          })
          .nullable()
          .optional(),
      ),
      returnedAt: z.coerce
        .date({
          invalid_type_error: 'form.errors.return_invalid',
        })
        .nullable()
        .optional(),
      isOpenContract: z.boolean().default(false),
      totalPrice: z
        .number({ invalid_type_error: 'form.errors.total_price_number' })
        .min(0, 'form.errors.total_price_non_negative')
        .optional()
        .nullable(),
      deposit: z
        .number({ invalid_type_error: 'form.errors.deposit_number' })
        .min(0, 'form.errors.deposit_non_negative')
        .default(0),
      guarantee: z
        .number({ invalid_type_error: 'form.errors.guarantee_number' })
        .min(0, 'form.errors.guarantee_non_negative')
        .default(0),
      totalPaid: z
        .number({ invalid_type_error: 'form.errors.total_paid_number' })
        .min(0, 'form.errors.total_paid_non_negative')
        .default(0),
      isFullyPaid: z.boolean().default(false),
    })
    .superRefine((data, ctx) => {
      if (!data.isOpenContract) {
        if (!data.expectedEndDate) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'form.errors.end_required_closed',
            path: ['expectedEndDate'],
          });
        } else if (data.expectedEndDate <= data.startDate) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'form.errors.end_after_start',
            path: ['expectedEndDate'],
          });
        }
      }

      if (data.startDate) {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        if (data.startDate < oneYearAgo) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'form.errors.start_too_old',
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
          message: 'form.errors.paid_exceeds_price',
          path: ['totalPaid'],
        });
      }
    });

type RentFormFields = z.infer<ReturnType<typeof makeRentSchema>>;

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
  const { t } = useTranslation('rent');
  const queryClient = useQueryClient();
  const [carImages, setCarImages] = useState<File[]>([]);

  const schema = useMemo(() => makeRentSchema(), []);

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
        title: t('form.success_title', 'Success!'),
        description: t(
          'form.success_desc',
          'Rent contract {{id}} successfully.',
          {
            id: response.data?.rentContractId || t('form.created', 'created'),
          },
        ),
      });
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        t('form.create_failed', 'Failed to create rent contract.');

      toast({
        type: 'error',
        title: t('common.error', { ns: 'common', defaultValue: 'Error' }),
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
    resolver: zodResolver(schema),
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
      !isNaN(startDate?.getTime?.() || NaN) &&
      !isNaN(expectedEndDate?.getTime?.() || NaN) &&
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
        title: t('form.validation_error', 'Validation Error'),
        description: t(
          'form.blacklisted',
          'This customer is blacklisted and cannot rent a car.',
        ),
      });
      return;
    }

    mutation.mutate(data);
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
                {t('form.title', 'Create Rental Contract')}
              </DialogTitle>
              {defaultCarModel && (
                <DialogDescription className="text-xs text-gray-500 dark:text-slate-400">
                  {defaultCarModel} • {t('form.available', 'Available')}
                </DialogDescription>
              )}
            </div>
          </div>
        </div>

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
                    {t('form.section_vehicle_customer', 'Vehicle & Customer')}
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-gray-600 dark:text-slate-300">
                      {t('form.vehicle', 'Vehicle')}
                    </Label>
                    <div className="mt-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 text-sm text-gray-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4 text-gray-400" />
                        <span>
                          {defaultCarModel ||
                            t('form.selected_vehicle', 'Selected Vehicle')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-gray-600 dark:text-slate-300">
                      {t('form.customer_required', 'Customer *')}
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
                              <SelectValue
                                placeholder={t(
                                  'form.select_customer',
                                  'Select customer',
                                )}
                              />
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
                        {t(errors.customerId.message as any)}
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
                    {t('form.section_schedule', 'Schedule')}
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-gray-600 dark:text-slate-300">
                      {t('form.start_date_required', 'Start Date *')}
                    </Label>
                    <div className="mt-1">
                      <Controller
                        control={control}
                        name="startDate"
                        render={({ field }) => (
                          <FormDatePicker
                            value={field.value}
                            onChange={field.onChange}
                            placeholder={t(
                              'form.select_start_date',
                              'Select start date',
                            )}
                          />
                        )}
                      />
                    </div>
                    {errors.startDate && (
                      <p className="text-[11px] text-red-500 mt-1">
                        {t(errors.startDate.message as any)}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs text-gray-600 dark:text-slate-300">
                      {t('form.expected_end_date', 'Expected End Date')}{' '}
                      {!isOpenContract && '*'}
                    </Label>
                    <div className="mt-1">
                      <Controller
                        control={control}
                        name="expectedEndDate"
                        render={({ field }) => (
                          <FormDatePicker
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
                        {t(errors.expectedEndDate.message as any)}
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
                    {t(
                      'form.open_contract_hint',
                      'Open Contract (no fixed end date)',
                    )}
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
                    {t('form.car_images', 'Car Images')}
                  </h3>
                  <Badge variant="outline" className="text-[10px]">
                    {t('form.optional', 'Optional')}
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
                  {t('form.financial_details', 'Financial Details')}
                </h3>
                {totalPrice != null && totalPrice > 0 && (
                  <Badge className="text-[11px] font-semibold">
                    {totalPrice.toLocaleString('en-US')} {t('currency', 'DHS')}
                  </Badge>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-gray-600 dark:text-slate-300">
                    {t('form.total_price', 'Total Price (DHS)')}
                  </Label>
                  <Input
                    type="number"
                    {...register('totalPrice', { valueAsNumber: true })}
                    placeholder={t('form.auto', 'Auto')}
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
                      {t(errors.totalPrice.message as any)}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-gray-600 dark:text-slate-300">
                      {t('form.deposit_required', 'Deposit *')}
                    </Label>
                    <Input
                      type="number"
                      {...register('deposit', { valueAsNumber: true })}
                      placeholder="0"
                      className="mt-1 h-9 rounded-lg text-sm border-gray-200 dark:border-slate-700"
                    />
                    {errors.deposit && (
                      <p className="text-[11px] text-red-500 mt-1">
                        {t(errors.deposit.message as any)}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs text-gray-600 dark:text-slate-300">
                      {t('form.guarantee', 'Guarantee')}
                    </Label>
                    <Input
                      type="number"
                      {...register('guarantee', { valueAsNumber: true })}
                      placeholder="0"
                      className="mt-1 h-9 rounded-lg text-sm border-gray-200 dark:border-slate-700"
                    />
                    {errors.guarantee && (
                      <p className="text-[11px] text-red-500 mt-1">
                        {t(errors.guarantee.message as any)}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-gray-600 dark:text-slate-300">
                    {t('form.total_paid', 'Total Paid (DHS)')}
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
                      {t(errors.totalPaid.message as any)}
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
                    {t('form.mark_fully_paid', 'Mark as fully paid')}
                  </Label>
                </div>
              </div>

              <div className="mt-1 space-y-2">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  onClick={handleSubmit(onSubmit)}
                  variant="default"
                  className="w-full pr-5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader className="animate-spin mr-2 h-4 w-4" />
                      {t('form.creating', 'Creating')}
                      <Loader />
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      {t('form.create_cta', 'Create Rental Contract')}
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
                  {t('form.cancel', 'Cancel')}
                </Button>

                <div className="pt-1">
                  <div className="flex space-x-1 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <WarningCircle
                      size={16}
                      className="text-amber-800 dark:text-amber-300"
                    />
                    <p className="text-[10px] text-amber-800 dark:text-amber-300">
                      {t(
                        'form.blacklist_hint',
                        'Blacklisted customers are hidden from selection.',
                      )}
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
