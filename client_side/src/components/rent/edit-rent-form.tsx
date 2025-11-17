'use client';

import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog';
import { FormDatePicker } from '../form-date-picker';
import { toast } from '../ui/toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader } from '../loader';
import {
  updateRent,
  getRentById,
  getRentImages,
  updateRentImages,
} from '@/api/rents';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '../ui/separator';
import { CarImageUpload } from './car-image-upload';
import {
  Car,
  User,
  Calculator,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Lock,
  Clock,
  Camera,
  Calendar,
} from 'lucide-react';
import { RentStatus } from '@/types/rent-status.type';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTranslation } from 'react-i18next';

// MAD Currency Icon Component (unchanged)
const MADIcon = ({ className = 'h-3 w-3' }: { className?: string }) => (
  <div
    className={`inline-flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-bold text-xs px-5 py-1 ${className}`}
  >
    (DHS)
  </div>
);

// Zod schema (ONLY returnedAt translated to i18n keys)
const editRentSchema = z.object({
  returnedAt: z
    .date({
      required_error: 'form.errors.return_required',
      invalid_type_error: 'form.errors.return_invalid',
    })
    .nullable()
    .optional(),
  lateFee: z.number({ required_error: 'Late fee is required' }).min(0),
  deposit: z.number().min(0).default(0),
  guarantee: z.number().min(0).default(0),
  damageReport: z.string().optional(),
  totalPrice: z.number().min(0).optional(),
  totalPaid: z.number().min(0).optional(),
  isFullyPaid: z.boolean().optional(),
  isOpenContract: z.boolean(),
  carModel: z.string().optional(),
  customerName: z.string().optional(),
  startDate: z.union([z.string(), z.date()]),
});

type EditRentFormFields = z.infer<typeof editRentSchema>;
type ValidFieldName = keyof EditRentFormFields;

// Status config (labels translated via t)
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

// Permissions unchanged
const getFieldPermissions = (status: RentStatus, isOpenContract: boolean) => {
  const permissions: Record<
    RentStatus,
    {
      editable: ValidFieldName[];
      readonly: ValidFieldName[];
      hidden: ValidFieldName[];
    }
  > = {
    reserved: {
      editable: [
        'returnedAt',
        'deposit',
        'lateFee',
        'guarantee',
        'totalPaid',
        'isFullyPaid',
        'damageReport',
      ],
      readonly: ['totalPrice'],
      hidden: [],
    },
    active: {
      editable: [
        'lateFee',
        'totalPaid',
        'isFullyPaid',
        'damageReport',
        ...(isOpenContract ? (['returnedAt'] as ValidFieldName[]) : []),
      ],
      readonly: [
        'totalPrice',
        'deposit',
        'guarantee',
        ...(!isOpenContract ? (['returnedAt'] as ValidFieldName[]) : []),
      ],
      hidden: [],
    },
    completed: {
      editable: ['totalPaid', 'isFullyPaid', 'damageReport', 'lateFee'],
      readonly: ['totalPrice', 'deposit', 'guarantee', 'returnedAt'],
      hidden: [],
    },
    canceled: {
      editable: [],
      readonly: [
        'totalPrice',
        'deposit',
        'guarantee',
        'returnedAt',
        'lateFee',
        'totalPaid',
        'isFullyPaid',
        'damageReport',
      ],
      hidden: [],
    },
  };
  return permissions[status] || permissions.reserved;
};

const getImagePermissions = (status: RentStatus) => {
  return status !== 'completed' && status !== 'canceled';
};

const getTooltipMessage = (
  field: ValidFieldName,
  status: RentStatus,
  isOpenContract: boolean,
  t: any,
) => {
  const messages: Record<ValidFieldName, Record<RentStatus, string>> = {
    returnedAt: {
      reserved: '',
      active: isOpenContract
        ? ''
        : t(
            'edit.lock.returnedAt_active_closed',
            'Return date is fixed for closed contracts',
          ),
      completed: t(
        'edit.lock.returnedAt_completed',
        'Cannot modify return date for completed rentals',
      ),
      canceled: t(
        'edit.lock.returnedAt_canceled',
        'Cannot modify canceled rentals',
      ),
    },
    deposit: {
      reserved: '',
      active: t(
        'edit.lock.deposit_active',
        'Deposit cannot be changed for active rentals',
      ),
      completed: t(
        'edit.lock.deposit_completed',
        'Deposit is locked for completed rentals',
      ),
      canceled: t('edit.lock.canceled', 'Cannot modify canceled rentals'),
    },
    guarantee: {
      reserved: '',
      active: t(
        'edit.lock.guarantee_active',
        'Guarantee cannot be changed for active rentals',
      ),
      completed: t(
        'edit.lock.guarantee_completed',
        'Guarantee is locked for completed rentals',
      ),
      canceled: t('edit.lock.canceled', 'Cannot modify canceled rentals'),
    },
    totalPrice: {
      reserved: isOpenContract
        ? t('edit.hint.totalPrice_auto', 'Auto-calculated based on return date')
        : t(
            'edit.lock.totalPrice_fixed',
            'Price is fixed for closed contracts',
          ),
      active: isOpenContract
        ? t('edit.hint.totalPrice_auto', 'Auto-calculated based on return date')
        : t(
            'edit.lock.totalPrice_fixed',
            'Price is fixed for closed contracts',
          ),
      completed: t(
        'edit.lock.totalPrice_completed',
        'Total price is locked for completed rentals',
      ),
      canceled: t('edit.lock.canceled', 'Cannot modify canceled rentals'),
    },
    lateFee: {
      reserved: '',
      active: '',
      completed: '',
      canceled: t('edit.lock.canceled', 'Cannot modify canceled rentals'),
    },
    totalPaid: {
      reserved: '',
      active: '',
      completed: '',
      canceled: t('edit.lock.canceled', 'Cannot modify canceled rentals'),
    },
    isFullyPaid: {
      reserved: '',
      active: '',
      completed: '',
      canceled: t('edit.lock.canceled', 'Cannot modify canceled rentals'),
    },
    damageReport: {
      reserved: '',
      active: '',
      completed: '',
      canceled: t('edit.lock.canceled', 'Cannot modify canceled rentals'),
    },
    carModel: { reserved: '', active: '', completed: '', canceled: '' },
    customerName: { reserved: '', active: '', completed: '', canceled: '' },
    startDate: { reserved: '', active: '', completed: '', canceled: '' },
    isOpenContract: { reserved: '', active: '', completed: '', canceled: '' },
  };

  return messages[field]?.[status] || '';
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rentId: string;
  carModel?: string;
  customerName?: string;
  startDate: string | Date;
  returnedAt?: string | Date;
  pricePerDay: number;
  totalPrice: number;
  status?: RentStatus;
  isFullyPaid?: boolean;
  totalPaid?: number;
  deposit?: number;
  guarantee?: number;
  lateFee?: number;
  isOpenContract: boolean;
  rentContractId?: string;
  rentNumber?: number;
  year?: number;
  onRentUpdated?: () => void;
};

export function EditRentFormDialog({
  open,
  onOpenChange,
  rentId,
  carModel,
  customerName,
  startDate,
  returnedAt: initialReturnedAt,
  pricePerDay,
  totalPrice: initialTotalPrice,
  status: initialStatus,
  isFullyPaid: initialIsFullyPaid,
  totalPaid: initialTotalPaid,
  deposit: initialDeposit,
  guarantee: initialGuarantee,
  lateFee: initialLateFee,
  isOpenContract,
  onRentUpdated,
}: Props) {
  const { t } = useTranslation('rent');
  const queryClient = useQueryClient();
  const originalTotalPriceRef = useRef<number>(initialTotalPrice ?? null);

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

  const rentData = Array.isArray(rentArray) ? rentArray[0] : rentArray;

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<EditRentFormFields>({
    resolver: zodResolver(editRentSchema),
    defaultValues: {
      carModel: carModel ?? '',
      customerName: customerName ?? '',
      startDate: startDate ?? '',
      returnedAt: initialReturnedAt ? new Date(initialReturnedAt) : new Date(),
      lateFee: initialLateFee ?? 0,
      deposit: initialDeposit ?? 0,
      guarantee: initialGuarantee ?? 0,
      damageReport: '',
      totalPrice: initialTotalPrice ?? 0,
      totalPaid: initialTotalPaid ?? 0,
      isFullyPaid: initialIsFullyPaid ?? false,
      isOpenContract: isOpenContract,
    },
  });

  const returnedAt = watch('returnedAt');
  const deposit = watch('deposit');
  const lateFee = watch('lateFee');
  const [totalPrice, setTotalPrice] = useState<number | null>(
    initialTotalPrice ?? null,
  );

  const currentStatus = initialStatus || 'reserved';

  const permissions = useMemo(
    () => getFieldPermissions(currentStatus, isOpenContract),
    [currentStatus, isOpenContract],
  );

  const canEditImages = useMemo(
    () => getImagePermissions(currentStatus),
    [currentStatus],
  );

  const currentStatusCfg = useMemo(
    () => statusConfig(t)[currentStatus],
    [currentStatus, t],
  );

  const handleImagesChange = useCallback((images: File[]) => {
    setNewImages(images);
    setHasImageChanges(true);
  }, []);

  const resetImageState = useCallback(() => {
    setNewImages([]);
    setHasImageChanges(false);
  }, []);

  const FieldWrapper = useCallback(
    ({
      children,
      field,
      label,
    }: {
      children: React.ReactNode;
      field: ValidFieldName;
      label: string;
    }) => {
      if (permissions.hidden.includes(field)) return null;

      const isReadonly = permissions.readonly.includes(field);
      const tooltipMessage = getTooltipMessage(
        field,
        currentStatus,
        isOpenContract,
        t,
      );

      return (
        <div className="space-y-1">
          <Label className="text-xs font-medium flex items-center gap-1">
            {label}
            {isReadonly && tooltipMessage && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Lock className="h-3 w-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">{tooltipMessage}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </Label>
          <div className={`${isReadonly ? 'opacity-60' : ''}`}>{children}</div>
        </div>
      );
    },
    [permissions, currentStatus, isOpenContract, t],
  );

  useEffect(() => {
    if (open && rentData) {
      const priceToUse =
        typeof rentData.totalPrice === 'number' &&
        Number.isFinite(rentData.totalPrice)
          ? rentData.totalPrice
          : (initialTotalPrice ?? 0);

      originalTotalPriceRef.current = priceToUse;

      reset({
        carModel: rentData.carModel ?? carModel ?? '',
        customerName: rentData.customerName ?? customerName ?? '',
        startDate: rentData.startDate ?? startDate ?? '',
        returnedAt:
          rentData.returnedAt &&
          new Date(rentData.returnedAt).getFullYear() !== 9999
            ? new Date(rentData.returnedAt)
            : null,
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
        isOpenContract: rentData.isOpenContract ?? isOpenContract,
      });
      setTotalPrice(priceToUse);
      resetImageState();
    }
  }, [
    open,
    rentData,
    reset,
    resetImageState,
    carModel,
    customerName,
    startDate,
    initialLateFee,
    initialDeposit,
    initialGuarantee,
    initialIsFullyPaid,
    isOpenContract,
    initialTotalPrice,
  ]);

  useEffect(() => {
    if (
      isOpenContract &&
      startDate &&
      returnedAt &&
      new Date(returnedAt).getFullYear() !== 9999 &&
      typeof pricePerDay === 'number'
    ) {
      const start = new Date(startDate);
      const end = new Date(returnedAt);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start) {
        const days = Math.max(
          1,
          Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
        );
        const price = days * pricePerDay;
        setTotalPrice(price);
        setValue('totalPrice', price);
        return;
      }
    }
    setTotalPrice(originalTotalPriceRef.current || null);
    setValue('totalPrice', originalTotalPriceRef.current || undefined);
  }, [isOpenContract, startDate, returnedAt, pricePerDay, setValue]);

  useEffect(() => {
    setValue('totalPaid', (deposit || 0) + (lateFee || 0));
  }, [deposit, lateFee, setValue]);

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
    mutationFn: async ({
      data,
      status,
      isOpenContract,
    }: {
      data: Record<string, any>;
      status: RentStatus;
      isOpenContract: boolean;
    }) => {
      const rentResult = await updateRent(rentId, data, status, isOpenContract);
      if (hasImageChanges) {
        await imagesMutation.mutateAsync(newImages);
      }
      return rentResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rents'] });
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
    const filteredData: Record<string, any> = {};
    permissions.editable.forEach((field) => {
      const value = data[field];
      filteredData[field] =
        field === 'damageReport' && value === '' ? null : value;
    });

    if (Object.keys(filteredData).length === 0 && !hasImageChanges) {
      toast({
        type: 'info',
        title: t('edit.no_changes_title', 'No Changes'),
        description: t(
          'edit.no_changes_desc',
          'No changes were made to update.',
        ),
      });
      return;
    }

    mutation.mutate({
      data: filteredData,
      status: currentStatus,
      isOpenContract,
    });
  };

  const getCurrentStatusMessage = () => {
    switch (currentStatus) {
      case 'active':
        return isOpenContract
          ? t(
              'edit.status_hint.active_open',
              'Active open contracts: update return date, payments, images, and damage reports.',
            )
          : t(
              'edit.status_hint.active_closed',
              'Active closed contracts: update payments, images, and damage reports only.',
            );
      case 'completed':
        return t(
          'edit.status_hint.completed',
          'Completed rentals: update payment records and damage reports only.',
        );
      case 'canceled':
        return t(
          'edit.status_hint.canceled',
          'Canceled rentals: no modifications allowed.',
        );
      default:
        return t(
          'edit.status_hint.reserved',
          'Reserved rentals can be fully modified.',
        );
    }
  };

  const hasEditableFields = permissions.editable.length > 0;
  const canCancel =
    currentStatus !== 'canceled' && currentStatus !== 'completed';
  const hasAnyChanges = hasEditableFields || (canEditImages && hasImageChanges);
  const isLoading = mutation.isPending || imagesMutation.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) {
          resetImageState();
        }
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
                    statusConfig(t)[(currentStatus as RentStatus) || 'reserved']
                      .color
                  } text-white flex items-center gap-1 text-xs`}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  {
                    statusConfig(t)[(currentStatus as RentStatus) || 'reserved']
                      .label
                  }
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

        {/* Status note */}
        <div className="px-5 py-2">
          <Alert className="py-2">
            <AlertCircle className="h-3 w-3" />
            <AlertDescription className="text-xs leading-tight">
              {getCurrentStatusMessage()}
            </AlertDescription>
          </Alert>
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
                  <section className="bg-white dark:bg-gray-1 border border-gray-200 dark:border-slate-700 rounded-xl p-3 sm:p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-green-500" />
                      <h3 className="text-sm font-medium">
                        {t('edit.schedule', 'Schedule')}
                      </h3>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">
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
                          />
                        )}
                      />
                      {errors.returnedAt && (
                        <p className="text-red-500 text-xs mt-1">
                          {t(errors.returnedAt.message as any)}
                        </p>
                      )}
                    </div>
                  </section>

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
                        disabled={isLoading}
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
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium">
                          {t('edit.total_price', 'Total Price')}
                        </span>
                      </div>
                      <span className="text-lg font-bold text-blue-600">
                        {totalPrice !== null && Number.isFinite(totalPrice)
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

                    {['completed', 'canceled'].includes(
                      currentStatus || '',
                    ) ? null : (
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
