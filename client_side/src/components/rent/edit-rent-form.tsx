'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  Calendar,
  Camera,
  Car,
  CheckCircle2,
  Clock,
  Calculator,
  User,
  XCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Loader } from '../loader';
import { FormDatePicker } from '../form-date-picker';
import { toast } from '../ui/toast';

import { RentStatus } from '@/types/rent-status.type';
import { CarImageUpload } from './car-image-upload';

import {
  getRentById,
  getRentImages,
  updateRent,
  updateRentImages,
} from '@/api/rents';
import { getCars, Car as CarType } from '@/api/cars';
import { getCustomers } from '@/api/customers';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ---------------- Helpers ----------------
const MADIcon = ({ className = 'h-3 w-3' }: { className?: string }) => (
  <div
    className={`inline-flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-bold text-xs px-5 py-1 ${className}`}
  >
    (DHS)
  </div>
);

function asDate(value: unknown): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysBetween(start: Date, end: Date) {
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

// ---------------- Schema ----------------
// expectedEndDate is NOT shown, but we keep it internally to send to backend.
const editRentSchema = z.object({
  carId: z.string().min(1),
  customerId: z.string().min(1),

  startDate: z.date(),
  returnedAt: z
    .date({
      required_error: 'form.errors.return_required',
      invalid_type_error: 'form.errors.return_invalid',
    })
    .nullable()
    .optional(),

  // hidden/internal
  expectedEndDate: z.date().nullable().optional(),

  lateFee: z.number({ required_error: 'Late fee is required' }).min(0),
  deposit: z.number().min(0).default(0),
  guarantee: z.number().min(0).default(0),

  damageReport: z.string().optional(),

  totalPrice: z.number().min(0).optional(),
  totalPaid: z.number().min(0).optional(),
  isFullyPaid: z.boolean().optional(),

  isOpenContract: z.boolean(),

  // display-only
  carModel: z.string().optional(),
  customerName: z.string().optional(),
});

type EditRentFormFields = z.infer<typeof editRentSchema>;

// ---------------- Status UI ----------------
const statusConfig = (t: any) => ({
  reserved: {
    color: 'bg-blue-500',
    icon: Clock,
    label: t('edit.status.reserved', 'Reserved'),
  },
  active: {
    color: 'bg-green-500',
    icon: CheckCircle2,
    label: t('edit.status.active', 'Active'),
  },
  completed: {
    color: 'bg-gray-500',
    icon: CheckCircle2,
    label: t('edit.status.completed', 'Completed'),
  },
  canceled: {
    color: 'bg-red-500',
    icon: XCircle,
    label: t('edit.status.canceled', 'Canceled'),
  },
});

// ---------------- Props ----------------
type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rentId: string;

  carModel?: string;
  customerName?: string;

  startDate: string | Date;
  returnedAt?: string | Date;

  pricePerDay: number; // fallback
  totalPrice: number;

  status?: RentStatus;
  isFullyPaid?: boolean;
  totalPaid?: number;
  deposit?: number;
  guarantee?: number;
  lateFee?: number;

  isOpenContract: boolean;

  onRentUpdated?: () => void;
};

export function EditRentFormDialog({
  open,
  onOpenChange,
  rentId,
  carModel,
  customerName,
  startDate: startDateProp,
  returnedAt: returnedAtProp,
  pricePerDay: pricePerDayProp,
  totalPrice: initialTotalPrice,
  status: initialStatus,
  isFullyPaid: initialIsFullyPaid,
  totalPaid: initialTotalPaid,
  deposit: initialDeposit,
  guarantee: initialGuarantee,
  lateFee: initialLateFee,
  isOpenContract: isOpenContractProp,
  onRentUpdated,
}: Props) {
  const { t } = useTranslation('rent');
  const queryClient = useQueryClient();

  const originalTotalPriceRef = useRef<number>(initialTotalPrice ?? 0);

  const [newImages, setNewImages] = useState<File[]>([]);
  const [hasImageChanges, setHasImageChanges] = useState(false);

  const { data: rentArray, isLoading: rentLoading } = useQuery({
    queryKey: ['rent', rentId],
    queryFn: () => getRentById(rentId),
    enabled: open && !!rentId,
  });

  const { data: existingImages = [], isLoading: imagesLoading } = useQuery({
    queryKey: ['rent-images', rentId],
    queryFn: () => getRentImages(rentId),
    enabled: open && !!rentId,
  });

  // Cars list for dropdown
  const { data: carsPage, isLoading: carsLoading } = useQuery({
    queryKey: ['cars-org', 'select'],
    queryFn: () => getCars(1, 200),
    enabled: open,
  });

  // Customers list for dropdown (same endpoint as create form)
  const { data: customersPage, isLoading: customersLoading } = useQuery({
    queryKey: ['customers', 'select'],
    queryFn: () => getCustomers(1, 100),
    enabled: open,
  });

  const cars = useMemo(
    () => (carsPage?.data ?? []).filter((c: CarType) => c.status !== 'deleted'),
    [carsPage],
  );

  const customers = useMemo(
    () => (customersPage?.data ?? []).filter((c: any) => !c?.isBlacklisted),
    [customersPage],
  );

  const rentData = Array.isArray(rentArray) ? rentArray[0] : rentArray;

  const currentStatus: RentStatus =
    (rentData?.status as RentStatus) ?? initialStatus ?? 'reserved';

  const isOpenContract: boolean =
    (rentData?.isOpenContract as boolean) ?? isOpenContractProp;

  const canEditImages =
    currentStatus !== 'completed' && currentStatus !== 'canceled';
  const canCancel =
    currentStatus !== 'completed' && currentStatus !== 'canceled';

  const resetImageState = useCallback(() => {
    setNewImages([]);
    setHasImageChanges(false);
  }, []);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<EditRentFormFields>({
    resolver: zodResolver(editRentSchema),
    defaultValues: {
      carId: '',
      customerId: '',

      startDate: asDate(startDateProp) ?? new Date(),
      returnedAt: asDate(returnedAtProp) ?? null,
      expectedEndDate: asDate(returnedAtProp) ?? null,

      lateFee: initialLateFee ?? 0,
      deposit: initialDeposit ?? 0,
      guarantee: initialGuarantee ?? 0,

      damageReport: '',
      totalPrice: initialTotalPrice ?? 0,
      totalPaid: initialTotalPaid ?? 0,
      isFullyPaid: initialIsFullyPaid ?? false,

      isOpenContract: isOpenContractProp ?? false,

      carModel: carModel ?? '',
      customerName: customerName ?? '',
    },
  });

  const carId = watch('carId');
  const customerId = watch('customerId');
  const startDate = watch('startDate');
  const returnedAt = watch('returnedAt');
  const deposit = watch('deposit');
  const lateFee = watch('lateFee');

  const selectedCar = useMemo(
    () => cars.find((c) => c.id === carId),
    [cars, carId],
  );
  const selectedPricePerDay =
    typeof selectedCar?.pricePerDay === 'number'
      ? selectedCar.pricePerDay
      : pricePerDayProp;

  const selectedCustomer = useMemo(
    () => customers.find((c: any) => c.id === customerId),
    [customers, customerId],
  );

  const [totalPrice, setTotalPrice] = useState<number>(initialTotalPrice ?? 0);

  // Reset when open & rentData available
  useEffect(() => {
    if (!open || !rentData) return;

    const start =
      asDate(rentData.startDate) ?? asDate(startDateProp) ?? new Date();

    // prefer returnedAt, fallback expectedEndDate
    const end =
      asDate(rentData.returnedAt) ??
      asDate((rentData as any).expectedEndDate) ??
      null;

    const priceToUse =
      typeof rentData.totalPrice === 'number' &&
      Number.isFinite(rentData.totalPrice)
        ? rentData.totalPrice
        : (initialTotalPrice ?? 0);

    originalTotalPriceRef.current = priceToUse;
    setTotalPrice(priceToUse);

    reset({
      carId: rentData.carId,
      customerId: rentData.customerId,

      startDate: start,
      returnedAt: end,
      expectedEndDate: end,

      lateFee: rentData.lateFee ?? initialLateFee ?? 0,
      deposit: rentData.deposit ?? initialDeposit ?? 0,
      guarantee: rentData.guarantee ?? initialGuarantee ?? 0,

      damageReport: rentData.damageReport ?? '',
      totalPrice: priceToUse,
      totalPaid:
        typeof rentData.totalPaid === 'number'
          ? rentData.totalPaid
          : (rentData.deposit ?? 0) + (rentData.lateFee ?? 0),
      isFullyPaid: rentData.isFullyPaid ?? initialIsFullyPaid ?? false,

      isOpenContract: rentData.isOpenContract ?? isOpenContractProp,

      carModel: rentData.carModel ?? carModel ?? '',
      customerName: rentData.customerName ?? customerName ?? '',
    });

    resetImageState();
  }, [
    open,
    rentData,
    reset,
    resetImageState,
    startDateProp,
    initialTotalPrice,
    initialLateFee,
    initialDeposit,
    initialGuarantee,
    initialIsFullyPaid,
    isOpenContractProp,
    carModel,
    customerName,
  ]);

  // Keep totalPaid = deposit + lateFee (your existing behavior)
  useEffect(() => {
    setValue('totalPaid', (deposit || 0) + (lateFee || 0));
  }, [deposit, lateFee, setValue]);

  // Auto: expectedEndDate always equals returnedAt (hidden)
  useEffect(() => {
    setValue('expectedEndDate', returnedAt ?? null, { shouldDirty: true });
  }, [returnedAt, setValue]);

  // Auto: totalPrice updates when car/start/return changes
  useEffect(() => {
    // If open contract and no returnedAt: show "Open" (UI) and keep numeric 0 in state
    if (isOpenContract && !returnedAt) {
      setTotalPrice(0);
      setValue('totalPrice', 0, { shouldDirty: true });
      return;
    }

    if (!startDate || !returnedAt) return;
    if (returnedAt <= startDate) return;

    const days = daysBetween(startDate, returnedAt);
    const newPrice = days * (selectedPricePerDay || 0);

    setTotalPrice(newPrice);
    setValue('totalPrice', newPrice, { shouldDirty: true });
  }, [isOpenContract, startDate, returnedAt, selectedPricePerDay, setValue]);

  const imagesMutation = useMutation({
    mutationFn: (images: File[]) => updateRentImages(rentId, images),
    onError: (error: any) => {
      toast({
        type: 'error',
        title: t('edit.images.update_failed_title', 'Image Update Failed'),
        description:
          error?.response?.data?.message ||
          t('edit.images.update_failed_desc', 'Failed to update images.'),
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () =>
      updateRent(rentId, { status: 'canceled' }, currentStatus, isOpenContract),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rents'] });
      queryClient.invalidateQueries({ queryKey: ['rent', rentId] });
      queryClient.invalidateQueries({ queryKey: ['rent-images', rentId] });
      onRentUpdated?.();
      onOpenChange(false);
      toast({
        type: 'success',
        title: t('edit.cancel.success_title', 'Success!'),
        description: t(
          'edit.cancel.success_desc',
          'Rental contract has been canceled.',
        ),
      });
    },
    onError: (error: any) => {
      toast({
        type: 'error',
        title: t('common.error', { ns: 'common', defaultValue: 'Error' }),
        description:
          error?.response?.data?.message ||
          error.message ||
          t('edit.cancel.failed_desc', 'Failed to cancel rental contract.'),
      });
    },
  });

  const mutation = useMutation({
    mutationFn: async (payload: { data: Record<string, any> }) => {
      // optional: prevent selecting blacklisted customer even if UI filters it
      if (selectedCustomer?.isBlacklisted) {
        throw new Error(
          t(
            'form.blacklisted',
            'This customer is blacklisted and cannot rent a car.',
          ),
        );
      }

      const rentResult = await updateRent(
        rentId,
        payload.data,
        currentStatus,
        isOpenContract,
      );

      if (hasImageChanges && canEditImages) {
        await imagesMutation.mutateAsync(newImages);
      }
      return rentResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rents'] });
      queryClient.invalidateQueries({ queryKey: ['rent', rentId] });
      queryClient.invalidateQueries({ queryKey: ['rent-images', rentId] });
      onRentUpdated?.();
      onOpenChange(false);
      resetImageState();
      toast({
        type: 'success',
        title: t('edit.update.success_title', 'Success!'),
        description: hasImageChanges
          ? t(
              'edit.update.success_desc_images',
              'Rental contract and images updated successfully.',
            )
          : t(
              'edit.update.success_desc',
              'Rental contract updated successfully.',
            ),
      });
    },
    onError: (error: any) => {
      toast({
        type: 'error',
        title: t('common.error', { ns: 'common', defaultValue: 'Error' }),
        description:
          error?.response?.data?.message ||
          error.message ||
          t('edit.update.failed_desc', 'Failed to update rental contract.'),
      });
    },
  });

  const onSubmit = (data: EditRentFormFields) => {
    const end = data.returnedAt ?? null;

    const payload: Record<string, any> = {
      carId: data.carId,
      customerId: data.customerId,

      startDate: data.startDate,
      returnedAt: end,

      // hidden but always aligned:
      expectedEndDate: end,

      deposit: data.deposit,
      guarantee: data.guarantee,
      lateFee: data.lateFee,
      totalPaid: data.totalPaid,
      isFullyPaid: data.isFullyPaid,
      totalPrice: data.totalPrice,
      damageReport: data.damageReport === '' ? null : data.damageReport,
    };

    mutation.mutate({ data: payload });
  };

  const isLoading =
    rentLoading ||
    carsLoading ||
    customersLoading ||
    mutation.isPending ||
    imagesMutation.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) resetImageState();
      }}
    >
      <DialogContent className="w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col bg-gray-1 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-slate-700 bg-gray-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-md bg-blue-600 text-white">
              <Car className="h-4 w-4" />
            </div>

            <div className="leading-tight">
              <DialogTitle className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 flex-wrap">
                <span>{t('edit.title', 'Edit Rental Contract')}</span>

                {rentData?.rentContractId && (
                  <Badge variant="outline" className="text-xs">
                    {rentData.rentContractId}
                  </Badge>
                )}

                <Badge
                  variant="secondary"
                  className={`${
                    statusConfig(t)[currentStatus].color
                  } text-white flex items-center gap-1 text-xs`}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  {statusConfig(t)[currentStatus].label}
                </Badge>

                {isOpenContract && (
                  <Badge variant="outline" className="text-xs">
                    {t('grid.open', 'Open')}
                  </Badge>
                )}
              </DialogTitle>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-gray-1 p-3 sm:p-4">
          {rentLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader className="animate-spin h-6 w-6" />
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
                {/* Left */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Planning */}
                  <section className="bg-white dark:bg-gray-1 border border-gray-200 dark:border-slate-700 rounded-xl p-3 sm:p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-green-500" />
                      <h3 className="text-sm font-medium">
                        {t('edit.schedule', 'Schedule')}
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Car */}
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">
                          {t('edit.car', 'Car')}
                        </Label>
                        <Controller
                          control={control}
                          name="carId"
                          render={({ field }) => (
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                              disabled={isLoading}
                            >
                              <SelectTrigger>
                                <SelectValue
                                  placeholder={t(
                                    'edit.select_car',
                                    'Select a car',
                                  )}
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {cars.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.make} {c.model} • {c.plateNumber}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        {errors.carId && (
                          <p className="text-red-500 text-xs mt-1">
                            {t(errors.carId.message as any)}
                          </p>
                        )}
                      </div>

                      {/* Customer */}
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">
                          {t('edit.customer', 'Customer')}
                        </Label>
                        <Controller
                          control={control}
                          name="customerId"
                          render={({ field }) => (
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                              disabled={isLoading}
                            >
                              <SelectTrigger>
                                <SelectValue
                                  placeholder={t(
                                    'form.select_customer',
                                    'Select customer',
                                  )}
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {customers.map((c: any) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {`${c.firstName || ''} ${c.lastName || ''}`.trim() ||
                                      c.email ||
                                      c.id}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        {errors.customerId && (
                          <p className="text-red-500 text-xs mt-1">
                            {t(errors.customerId.message as any)}
                          </p>
                        )}
                      </div>

                      {/* Start Date */}
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">
                          {t('edit.start_date', 'Start Date')}
                        </Label>
                        <Controller
                          control={control}
                          name="startDate"
                          render={({ field }) => (
                            <FormDatePicker
                              value={field.value ?? undefined}
                              onChange={field.onChange}
                              disabled={isLoading}
                            />
                          )}
                        />
                      </div>

                      {/* Return Date */}
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">
                          {t('edit.return_date', 'Return Date')}
                        </Label>
                        <Controller
                          control={control}
                          name="returnedAt"
                          render={({ field }) => (
                            <FormDatePicker
                              value={field.value ?? undefined}
                              onChange={field.onChange}
                              placeholder={t('grid.open', 'Open')}
                              disabled={isLoading}
                            />
                          )}
                        />
                        {errors.returnedAt && (
                          <p className="text-red-500 text-xs mt-1">
                            {t(errors.returnedAt.message as any)}
                          </p>
                        )}
                      </div>
                    </div>

                    {isOpenContract && (
                      <Alert className="mt-3 py-2">
                        <AlertCircle className="h-3 w-3" />
                        <AlertDescription className="text-xs leading-tight">
                          {t(
                            'edit.open_hint',
                            'Open contract: if Return Date is empty, total price will display as Open.',
                          )}
                        </AlertDescription>
                      </Alert>
                    )}
                  </section>

                  {/* Notes */}
                  <section className="border border-gray-200 dark:border-slate-700 rounded-xl p-3 sm:p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      <h3 className="text-sm font-medium">
                        {t('edit.notes', 'Notes')}
                      </h3>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">
                        {t('edit.damage_report', 'Damage Report')}
                      </Label>
                      <Controller
                        control={control}
                        name="damageReport"
                        render={({ field }) => (
                          <Textarea
                            {...field}
                            value={field.value || ''}
                            placeholder={t(
                              'edit.damage_placeholder',
                              'Damages, issues, or notes...',
                            )}
                            rows={3}
                            className="text-xs resize-none rounded-lg border border-gray-200 dark:border-slate-700"
                          />
                        )}
                      />
                    </div>
                  </section>

                  {/* Images */}
                  <section className="border border-gray-200 dark:border-slate-700 rounded-xl p-3 sm:p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Camera className="h-4 w-4 text-purple-500" />
                      <h3 className="text-sm font-medium">
                        {t('edit.car_images', 'Car Images')}
                      </h3>
                    </div>

                    {imagesLoading ? (
                      <div className="flex items-center justify-center py-4 border rounded-lg">
                        <Loader className="animate-spin mr-2 h-4 w-4" />
                        <span className="text-sm text-muted-foreground">
                          {t('edit.loading_images', 'Loading images...')}
                        </span>
                      </div>
                    ) : (
                      <CarImageUpload
                        onImagesChange={(files) => {
                          if (files?.length) setHasImageChanges(true);
                          setNewImages(files);
                        }}
                        existingImages={existingImages.map((img: any) => ({
                          id: img.id,
                          url: img.url,
                          name: img.name,
                          path: img.path,
                        }))}
                        maxImages={4}
                        disabled={isLoading || !canEditImages}
                      />
                    )}
                  </section>
                </div>

                {/* Right */}
                <section className="border border-gray-200 dark:border-slate-700 rounded-xl p-3 sm:p-4 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">
                      {t('edit.financial_details', 'Financial Details')}
                    </h3>
                    <MADIcon />
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {t('edit.total_price', 'Total Price')}
                      </span>
                      <span className="text-lg font-bold text-blue-600">
                        {isOpenContract && !returnedAt
                          ? t('grid.open', 'Open')
                          : Number.isFinite(totalPrice)
                            ? totalPrice.toLocaleString('en-US')
                            : t('grid.open', 'Open')}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">
                          {t('edit.deposit', 'Deposit')}
                        </Label>
                        <Controller
                          control={control}
                          name="deposit"
                          render={({ field }) => (
                            <Input
                              type="number"
                              min={0}
                              value={field.value ?? 0}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value === ''
                                    ? 0
                                    : Number(e.target.value),
                                )
                              }
                              className="text-right h-9 text-sm rounded-lg border-gray-200 dark:border-slate-700"
                            />
                          )}
                        />
                      </div>

                      <div>
                        <Label className="text-xs">
                          {t('edit.guarantee', 'Guarantee')}
                        </Label>
                        <Controller
                          control={control}
                          name="guarantee"
                          render={({ field }) => (
                            <Input
                              type="number"
                              min={0}
                              value={field.value ?? 0}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value === ''
                                    ? 0
                                    : Number(e.target.value),
                                )
                              }
                              className="text-right h-9 text-sm rounded-lg border-gray-200 dark:border-slate-700"
                            />
                          )}
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs">
                        {t('edit.late_fee', 'Late Fee')}
                      </Label>
                      <Controller
                        control={control}
                        name="lateFee"
                        render={({ field }) => (
                          <Input
                            type="number"
                            min={0}
                            value={field.value ?? 0}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value === ''
                                  ? 0
                                  : Number(e.target.value),
                              )
                            }
                            className="text-right h-9 text-sm rounded-lg border-gray-200 dark:border-slate-700"
                          />
                        )}
                      />
                    </div>

                    <div>
                      <Label className="text-xs">
                        {t('edit.total_paid', 'Total Paid')}
                      </Label>
                      <div className="relative">
                        <Controller
                          control={control}
                          name="totalPaid"
                          render={({ field }) => (
                            <Input
                              type="number"
                              value={field.value || 0}
                              readOnly
                              disabled
                              className="text-right bg-muted h-9 text-sm rounded-lg"
                            />
                          )}
                        />
                        <Calculator className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 rounded-lg px-3 py-2 border border-gray-200 dark:border-slate-700">
                      <Controller
                        control={control}
                        name="isFullyPaid"
                        render={({ field }) => (
                          <input
                            type="checkbox"
                            checked={!!field.value}
                            onChange={(e) => field.onChange(e.target.checked)}
                            className="h-4 w-4"
                          />
                        )}
                      />
                      <Label className="text-xs">
                        {t('edit.fully_paid', 'Fully paid')}
                      </Label>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 mt-auto">
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full"
                    >
                      {isLoading ? (
                        <>
                          <Loader className="animate-spin mr-2 h-4 w-4" />
                          {t('edit.saving', 'Saving...')}
                        </>
                      ) : (
                        t('edit.save_changes', 'Save Changes')
                      )}
                    </Button>

                    {!canCancel ? null : (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => cancelMutation.mutate()}
                        disabled={cancelMutation.isPending || isLoading}
                        className="w-full"
                      >
                        {cancelMutation.isPending ? (
                          <>
                            <Loader className="animate-spin mr-1 h-3 w-3" />
                            {t('edit.canceling', 'Canceling...')}
                          </>
                        ) : (
                          t('edit.cancel_contract', 'Cancel Contract')
                        )}
                      </Button>
                    )}
                  </div>
                </section>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
