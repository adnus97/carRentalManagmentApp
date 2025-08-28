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
import { DatePickerDemo } from '../date-picker';
import { toast } from '../ui/toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader } from '../loader';
import { updateRent, getRentById } from '@/api/rents';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '../ui/separator';
import {
  Car,
  User,
  Calculator,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Lock,
  Clock,
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

// MAD Currency Icon Component
const MADIcon = ({ className = 'h-3 w-3' }: { className?: string }) => (
  <div
    className={`inline-flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-bold text-xs px-5 py-1 ${className}`}
  >
    (MAD)
  </div>
);

// Schema - Removed status field
const editRentSchema = z.object({
  returnedAt: z
    .date({ required_error: 'Return date is required' })
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

// Status config
const statusConfig = {
  reserved: { color: 'bg-blue-500', icon: Clock, label: 'Reserved' },
  active: { color: 'bg-green-500', icon: CheckCircle2, label: 'Active' },
  completed: { color: 'bg-gray-500', icon: CheckCircle2, label: 'Completed' },
  canceled: { color: 'bg-red-500', icon: XCircle, label: 'Canceled' },
};

// Updated permissions without status field
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

// Updated tooltip messages without status
const getTooltipMessage = (
  field: ValidFieldName,
  status: RentStatus,
  isOpenContract: boolean,
) => {
  const messages: Record<ValidFieldName, Record<RentStatus, string>> = {
    returnedAt: {
      reserved: '',
      active: isOpenContract ? '' : 'Return date is fixed for closed contracts',
      completed: 'Cannot modify return date for completed rentals',
      canceled: 'Cannot modify canceled rentals',
    },
    deposit: {
      reserved: '',
      active: 'Deposit cannot be changed for active rentals',
      completed: 'Deposit is locked for completed rentals',
      canceled: 'Cannot modify canceled rentals',
    },
    guarantee: {
      reserved: '',
      active: 'Guarantee cannot be changed for active rentals',
      completed: 'Guarantee is locked for completed rentals',
      canceled: 'Cannot modify canceled rentals',
    },
    totalPrice: {
      reserved: isOpenContract
        ? 'Auto-calculated based on return date'
        : 'Price is fixed for closed contracts',
      active: isOpenContract
        ? 'Auto-calculated based on return date'
        : 'Price is fixed for closed contracts',
      completed: 'Total price is locked for completed rentals',
      canceled: 'Cannot modify canceled rentals',
    },
    lateFee: {
      reserved: '',
      active: '',
      completed: '',
      canceled: 'Cannot modify canceled rentals',
    },
    totalPaid: {
      reserved: '',
      active: '',
      completed: '',
      canceled: 'Cannot modify canceled rentals',
    },
    isFullyPaid: {
      reserved: '',
      active: '',
      completed: '',
      canceled: 'Cannot modify canceled rentals',
    },
    damageReport: {
      reserved: '',
      active: '',
      completed: '',
      canceled: 'Cannot modify canceled rentals',
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
  const queryClient = useQueryClient();
  const originalTotalPriceRef = useRef<number>(initialTotalPrice ?? null);

  const { data: rentArray, isLoading: rentLoading } = useQuery({
    queryKey: ['rent', rentId],
    queryFn: () => getRentById(rentId),
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

  // Memoize permissions to prevent re-renders
  const permissions = useMemo(
    () => getFieldPermissions(currentStatus, isOpenContract),
    [currentStatus, isOpenContract],
  );

  // Memoize status config to prevent re-renders
  const currentStatusConfig = useMemo(
    () => statusConfig[currentStatus],
    [currentStatus],
  );

  // Memoize FieldWrapper component
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
    [permissions, currentStatus, isOpenContract],
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
    }
  }, [open, rentData, reset]);

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

  const cancelMutation = useMutation({
    mutationFn: () =>
      updateRent(rentId, { status: 'canceled' }, currentStatus, isOpenContract),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rents'] });
      if (onRentUpdated) {
        onRentUpdated();
      }
      onOpenChange(false);
      toast({
        type: 'success',
        title: 'Success!',
        description: 'Rental contract has been canceled.',
      });
    },
    onError: (error: any) => {
      toast({
        type: 'error',
        title: 'Error',
        description:
          error?.response?.data?.message ||
          error.message ||
          'Failed to cancel rental contract.',
      });
    },
  });

  const mutation = useMutation({
    mutationFn: ({
      data,
      status,
      isOpenContract,
    }: {
      data: Record<string, any>;
      status: RentStatus;
      isOpenContract: boolean;
    }) => updateRent(rentId, data, status, isOpenContract),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rents'] });
      if (onRentUpdated) {
        onRentUpdated();
      }
      onOpenChange(false);
      toast({
        type: 'success',
        title: 'Success!',
        description: 'Rental contract updated successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        type: 'error',
        title: 'Error',
        description:
          error?.response?.data?.message ||
          error.message ||
          'Failed to update rental contract.',
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

    if (Object.keys(filteredData).length === 0) {
      toast({
        type: 'info',
        title: 'No Changes',
        description: 'No changes were made to update.',
      });
      return;
    }

    mutation.mutate({
      data: filteredData,
      status: currentStatus,
      isOpenContract,
    });
  };

  const handleCancel = () => {
    cancelMutation.mutate();
  };

  const getCurrentStatusMessage = () => {
    switch (currentStatus) {
      case 'active':
        return isOpenContract
          ? 'Active open contracts: update return date, payments, and damage reports.'
          : 'Active closed contracts: update payments and damage reports only.';
      case 'completed':
        return 'Completed rentals: update payment records and damage reports only.';
      case 'canceled':
        return 'Canceled rentals: no modifications allowed.';
      default:
        return 'Reserved rentals can be fully modified.';
    }
  };

  const hasEditableFields = permissions.editable.length > 0;
  const canCancel =
    currentStatus !== 'canceled' && currentStatus !== 'completed';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[500px] max-h-[96vh] overflow-y-auto p-4">
        <div className="space-y-2 pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg flex-wrap">
            <span>Edit Rental Contract</span>
            <Badge
              variant="secondary"
              className={`${currentStatusConfig.color} text-white flex items-center gap-1 text-xs`}
            >
              <currentStatusConfig.icon className="h-3 w-3" />
              {currentStatusConfig.label}
            </Badge>
            {isOpenContract && (
              <Badge variant="outline" className="text-xs">
                Open
              </Badge>
            )}
          </DialogTitle>

          {(carModel || customerName) && (
            <div className="flex flex-wrap items-center gap-2">
              {carModel && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Car className="h-3 w-3" />
                  {carModel}
                </Badge>
              )}
              {customerName && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {customerName}
                </Badge>
              )}
            </div>
          )}

          <Alert className="py-2">
            <AlertCircle className="h-3 w-3" />
            <AlertDescription className="text-xs leading-tight">
              {getCurrentStatusMessage()}
            </AlertDescription>
          </Alert>
        </div>

        <Separator />

        {rentLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader className="animate-spin h-6 w-6" />
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Schedule
              </h3>
              <div className="grid grid-cols-1 gap-3">
                <FieldWrapper field="returnedAt" label="Return Date">
                  <Controller
                    control={control}
                    name="returnedAt"
                    render={({ field }) => (
                      <DatePickerDemo
                        value={field.value ?? undefined}
                        onChange={field.onChange}
                        disabled={!permissions.editable.includes('returnedAt')}
                        placeholder="Open"
                      />
                    )}
                  />
                  {errors.returnedAt && (
                    <p className="text-red-500 text-xs">
                      {errors.returnedAt.message}
                    </p>
                  )}
                </FieldWrapper>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                Financial Details <MADIcon />
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <FieldWrapper field="deposit" label="Deposit">
                  <Controller
                    control={control}
                    name="deposit"
                    render={({ field }) => (
                      <Input
                        type="number"
                        min={0}
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val === '' ? 0 : Number(val));
                        }}
                        disabled={!permissions.editable.includes('deposit')}
                        className="text-right h-8 text-xs"
                      />
                    )}
                  />
                </FieldWrapper>
                <FieldWrapper field="lateFee" label="Late Fee">
                  <Controller
                    control={control}
                    name="lateFee"
                    render={({ field }) => (
                      <Input
                        type="number"
                        min={0}
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val === '' ? 0 : Number(val));
                        }}
                        disabled={!permissions.editable.includes('lateFee')}
                        className="text-right h-8 text-xs"
                      />
                    )}
                  />
                </FieldWrapper>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FieldWrapper field="totalPaid" label="Total Paid">
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
                          className="text-right bg-muted h-8 text-xs"
                        />
                      )}
                    />
                    <Calculator className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  </div>
                </FieldWrapper>
                <FieldWrapper field="guarantee" label="Guarantee">
                  <Controller
                    control={control}
                    name="guarantee"
                    render={({ field }) => (
                      <Input
                        type="number"
                        min={0}
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val === '' ? 0 : Number(val));
                        }}
                        disabled={!permissions.editable.includes('guarantee')}
                        className="text-right h-8 text-xs"
                      />
                    )}
                  />
                </FieldWrapper>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 rounded-md p-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium">Total Price</span>
                    <MADIcon />
                    {isOpenContract && (
                      <Badge variant="outline" className="text-xs px-1 py-0">
                        Auto
                      </Badge>
                    )}
                  </div>
                  <span className="text-lg font-bold text-blue-600">
                    {totalPrice !== null && Number.isFinite(totalPrice)
                      ? totalPrice.toLocaleString()
                      : 'Open'}
                  </span>
                </div>
                {isOpenContract && (
                  <p className="text-xs text-muted-foreground">
                    {pricePerDay}/day × days
                  </p>
                )}
              </div>

              <FieldWrapper field="isFullyPaid" label="Payment Status">
                <div className="flex items-center space-x-2">
                  <Controller
                    control={control}
                    name="isFullyPaid"
                    render={({ field }) => (
                      <input
                        type="checkbox"
                        checked={!!field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                        disabled={!permissions.editable.includes('isFullyPaid')}
                        className="h-3 w-3"
                      />
                    )}
                  />
                  <Label className="text-xs">Fully paid</Label>
                </div>
              </FieldWrapper>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Notes
              </h3>
              <FieldWrapper field="damageReport" label="Damage Report">
                <Controller
                  control={control}
                  name="damageReport"
                  render={({ field }) => (
                    <Textarea
                      {...field}
                      value={field.value || ''}
                      placeholder="Damages, issues, or notes..."
                      disabled={!permissions.editable.includes('damageReport')}
                      rows={2}
                      className="text-xs resize-none"
                    />
                  )}
                />
              </FieldWrapper>
            </div>

            <div className="flex justify-between pt-2">
              {canCancel && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCancel}
                  disabled={cancelMutation.isPending}
                  className="h-8 px-4 text-xs bg-red-700 text-white"
                >
                  {cancelMutation.isPending ? (
                    <>
                      <Loader className="animate-spin mr-1 h-3 w-3" />
                      Canceling...
                    </>
                  ) : (
                    'Cancel Contract'
                  )}
                </Button>
              )}

              {hasEditableFields && (
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-8 px-4 text-xs ml-auto"
                >
                  {isSubmitting ? (
                    <>
                      <Loader className="animate-spin mr-1 h-3 w-3" />
                      Updating...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              )}
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
