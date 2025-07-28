'use client';

import React, { useEffect, useRef, useState } from 'react';
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
import { updateRent, getRentById } from '@/api/rents';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '../ui/separator';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

const editRentSchema = z.object({
  returnedAt: z.date({ required_error: 'Return date is required' }),
  lateFee: z.number({ required_error: 'Late fee is required' }).int().min(0),
  deposit: z.number().int().min(0).default(0),
  damageReport: z.string().nullable(),
  totalPrice: z.number().int().min(0).optional(),
  status: z.enum(['active', 'completed', 'canceled']),
  totalPaid: z.number().int().min(0).optional(),
  isFullyPaid: z.boolean().optional(),
  isOpenContract: z.boolean(),
});

type EditRentFormFields = z.infer<typeof editRentSchema>;

type EditRentFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rentId: string;
  carModel?: string;
  startDate: string | Date;
  pricePerDay: number;
  totalPrice: number;
  status?: 'active' | 'completed' | 'canceled';
  isFullyPaid?: boolean;
  totalPaid?: number;
  deposit?: number;
  lateFee?: number;
  isOpenContract: boolean;
};

export function EditRentFormDialog({
  open,
  onOpenChange,
  rentId,
  carModel,
  startDate,
  pricePerDay,
  totalPrice: initialTotalPrice,
  isOpenContract,
}: EditRentFormDialogProps) {
  const queryClient = useQueryClient();
  const originalTotalPriceRef = useRef<number>(initialTotalPrice ?? 0);

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
      returnedAt: new Date(),
      lateFee: 0,
      deposit: 0,
      damageReport: '',
      totalPrice: initialTotalPrice ?? 0,
      status: 'active',
      totalPaid: 0,
      isFullyPaid: false,
      isOpenContract: isOpenContract,
    },
  });

  // Watch fields
  const returnedAt = watch('returnedAt');
  const deposit = watch('deposit');
  const lateFee = watch('lateFee');
  const [totalPrice, setTotalPrice] = useState<number>(initialTotalPrice ?? 0);

  // Set form values and total price when rentData is loaded
  useEffect(() => {
    if (open && rentData) {
      const priceToUse =
        typeof rentData.totalPrice === 'number' &&
        Number.isFinite(rentData.totalPrice)
          ? rentData.totalPrice
          : typeof initialTotalPrice === 'number'
            ? initialTotalPrice
            : 0;

      originalTotalPriceRef.current = priceToUse;

      reset({
        returnedAt: rentData.returnedAt
          ? new Date(rentData.returnedAt)
          : new Date(),
        lateFee: rentData.lateFee ?? 0,
        deposit: rentData.deposit ?? 0,
        damageReport: rentData.damageReport ?? '',
        totalPrice: priceToUse,
        status: rentData.status ?? 'active',
        totalPaid:
          typeof rentData.totalPaid === 'number' &&
          Number.isFinite(rentData.totalPaid)
            ? rentData.totalPaid
            : (rentData.deposit ?? 0) + (rentData.lateFee ?? 0),
        isFullyPaid: rentData.isFullyPaid ?? false,
        isOpenContract: rentData.isOpenContract ?? isOpenContract,
      });
      setTotalPrice(priceToUse);
    }
  }, [open, rentData, reset, initialTotalPrice, isOpenContract]);

  // DEBUG: Log all values on every render
  useEffect(() => {
    console.log('DEBUG:', {
      isOpenContract,
      startDate,
      returnedAt,
      pricePerDay,
      typeofPricePerDay: typeof pricePerDay,
      totalPrice,
    });
  });

  // Update total price when returnedAt changes (only for open contracts)
  useEffect(() => {
    if (
      isOpenContract &&
      startDate &&
      returnedAt &&
      typeof pricePerDay === 'number'
    ) {
      const start = new Date(startDate);
      const end = new Date(returnedAt);

      console.log('CALC:', { start, end, pricePerDay });

      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start) {
        const msPerDay = 1000 * 60 * 60 * 24;
        const days = Math.max(
          1,
          Math.ceil((end.getTime() - start.getTime()) / msPerDay),
        );
        const price = days * pricePerDay;
        console.log('SETTING TOTAL PRICE', price);
        setTotalPrice(Number.isFinite(price) ? price : 0);
        setValue('totalPrice', Number.isFinite(price) ? price : 0);
        return;
      }
    }
    setTotalPrice(originalTotalPriceRef.current);
    setValue('totalPrice', originalTotalPriceRef.current);
  }, [isOpenContract, startDate, returnedAt, pricePerDay, setValue]);

  // Always update totalPaid as deposit + lateFee
  useEffect(() => {
    setValue('totalPaid', (deposit || 0) + (lateFee || 0));
  }, [deposit, lateFee, setValue]);

  // If open contract and returnedAt is now or in the past, force status to "completed"
  useEffect(() => {
    if (isOpenContract && returnedAt && new Date(returnedAt) <= new Date()) {
      setValue('status', 'completed');
    }
  }, [isOpenContract, returnedAt, setValue]);

  const mutation = useMutation({
    mutationFn: (data: EditRentFormFields) => {
      return updateRent(rentId, {
        ...data,
        damageReport: data.damageReport ?? undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rents'] });
      onOpenChange(false);
      reset();
      toast({
        type: 'success',
        title: 'Success!',
        description: 'Rent contract updated successfully.',
      });
    },
    onError: () => {
      toast({
        type: 'error',
        title: 'Error',
        description: 'Failed to update rent contract.',
      });
    },
  });

  const onSubmit = (data: EditRentFormFields) => {
    mutation.mutate(data);
  };

  // Status options
  let statusOptions: { value: string; label: string }[] = [
    { value: 'active', label: 'Active' },
    { value: 'canceled', label: 'Canceled' },
  ];
  const isCompleted =
    isOpenContract && returnedAt && new Date(returnedAt) <= new Date();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-full sm:max-w-[400px] p-4 pt-14">
        <DialogTitle>Edit Rent Contract</DialogTitle>
        <DialogDescription>
          {carModel && <span className="font-semibold">Car: {carModel}</span>}
          <br />
          Update the return date, late fee, status, payment, and damage report
          for this rent contract.
        </DialogDescription>
        <Separator className="my-2" />
        {rentLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader className="animate-spin" />
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-6 w-full"
            noValidate
          >
            {/* Returned At */}
            <div>
              <Label>Returned At</Label>
              <Controller
                control={control}
                name="returnedAt"
                render={({ field }) => (
                  <div className="w-full">
                    <DatePickerDemo
                      value={field.value ?? undefined}
                      onChange={field.onChange}
                      disabled={!isOpenContract}
                    />
                  </div>
                )}
              />
              {errors.returnedAt && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.returnedAt.message}
                </p>
              )}
            </div>
            {/* Status Dropdown (custom Select) */}
            <div>
              <Label htmlFor="status">Status</Label>
              {isCompleted ? (
                <Input
                  value="Completed"
                  disabled
                  className="mt-1 w-full"
                  readOnly
                />
              ) : (
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              )}
              {errors.status && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.status.message}
                </p>
              )}
            </div>
            {/* Deposit & Late Fee side by side */}
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="deposit">Deposit</Label>
                <Controller
                  control={control}
                  name="deposit"
                  render={({ field }) => (
                    <Input
                      id="deposit"
                      type="number"
                      min={0}
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        field.onChange(val === '' ? 0 : Number(val));
                      }}
                      className="mt-1 w-full"
                    />
                  )}
                />
                {errors.deposit && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.deposit.message}
                  </p>
                )}
              </div>
              <div className="flex-1">
                <Label htmlFor="lateFee">Late Fee</Label>
                <Controller
                  control={control}
                  name="lateFee"
                  render={({ field }) => (
                    <Input
                      id="lateFee"
                      type="number"
                      min={0}
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => {
                        // Convert to number or undefined if empty
                        const val = e.target.value;
                        field.onChange(val === '' ? 0 : Number(val));
                      }}
                      className="mt-1 w-full"
                    />
                  )}
                />
                {errors.lateFee && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.lateFee.message}
                  </p>
                )}
              </div>
            </div>
            {/* Total Paid & Total Price side by side */}
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="totalPaid">Total Paid (DHS)</Label>
                <Controller
                  control={control}
                  name="totalPaid"
                  render={({ field }) => (
                    <Input
                      id="totalPaid"
                      type="number"
                      min={0}
                      {...field}
                      value={field.value ?? 0}
                      disabled
                      className="mt-1 w-full"
                      readOnly
                    />
                  )}
                />
                {errors.totalPaid && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.totalPaid.message}
                  </p>
                )}
              </div>
              <div className="flex-1">
                <Label>Total Price (DHS)</Label>
                <Input
                  value={Number.isFinite(totalPrice) ? totalPrice : 0}
                  disabled
                  className="mt-1 w-full"
                  readOnly
                />
              </div>
            </div>
            {/* Is Fully Paid */}
            <div className="flex items-center space-x-2">
              <Controller
                control={control}
                name="isFullyPaid"
                render={({ field }) => (
                  <input
                    id="isFullyPaid"
                    type="checkbox"
                    checked={!!field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                  />
                )}
              />
              <Label htmlFor="isFullyPaid">Mark as fully paid</Label>
            </div>
            {/* Damage Report */}
            <div>
              <Label htmlFor="damageReport">Damage Report</Label>
              <Controller
                control={control}
                name="damageReport"
                render={({ field }) => (
                  <Textarea
                    id="damageReport"
                    {...field}
                    value={field.value ?? ''}
                    placeholder="Describe any damages..."
                    className="mt-1 w-full"
                  />
                )}
              />
              {errors.damageReport && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.damageReport.message}
                </p>
              )}
            </div>
            {/* Submit Button */}
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2"
              >
                {isSubmitting ? (
                  <Loader className="animate-spin mr-2 inline-block" />
                ) : null}
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
