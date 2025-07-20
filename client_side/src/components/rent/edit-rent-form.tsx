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
import { updateRent, getRentById } from '@/api/rents';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '../ui/separator';

const editRentSchema = z.object({
  returnedAt: z.date({ required_error: 'Return date is required' }),
  lateFee: z
    .number({ required_error: 'Late fee is required' })
    .int('Late fee must be an integer')
    .min(0, 'Late fee must be at least 0'),
  damageReport: z.string().nullable(),
  totalPrice: z
    .number()
    .int('Total price must be an integer')
    .min(0, 'Total price must be at least 0')
    .optional(),
});

type EditRentFormFields = z.infer<typeof editRentSchema>;

type EditRentFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rentId: string;
  carModel?: string;
};

export function EditRentFormDialog({
  open,
  onOpenChange,
  rentId,
  carModel,
}: EditRentFormDialogProps) {
  const queryClient = useQueryClient();

  // Fetch rent data for default values (may be an array!)
  const { data: rentArray, isLoading: rentLoading } = useQuery({
    queryKey: ['rent', rentId],
    queryFn: () => getRentById(rentId),
    enabled: open && !!rentId,
  });

  // If the API returns an array, use the first item; otherwise, use the object directly
  const rentData = Array.isArray(rentArray) ? rentArray[0] : rentArray;

  const mutation = useMutation({
    mutationFn: (data: EditRentFormFields) =>
      updateRent(rentId, {
        ...data,
        damageReport: data.damageReport ?? undefined,
      }),
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
      returnedAt: undefined,
      lateFee: undefined,
      damageReport: '',
      totalPrice: 0,
    },
  });

  // Watch fields
  const returnedAt = watch('returnedAt');
  const [totalPrice, setTotalPrice] = useState<number>(0);

  // Set form values and total price when rentData is loaded
  useEffect(() => {
    if (open && rentData) {
      reset({
        returnedAt: rentData.returnedAt
          ? new Date(rentData.returnedAt)
          : undefined,
        lateFee: rentData.lateFee ?? undefined,
        damageReport: rentData.damageReport ?? '',
      });
      setTotalPrice(
        typeof rentData.totalPrice === 'number' &&
          Number.isFinite(rentData.totalPrice)
          ? rentData.totalPrice
          : 0,
      );
    }
  }, [open, rentData, reset]);

  // If contract is open, update total price when returnedAt changes
  useEffect(() => {
    if (
      rentData &&
      rentData.isOpenContract === true &&
      rentData.startDate &&
      returnedAt &&
      rentData.pricePerDay !== undefined
    ) {
      const start = new Date(rentData.startDate);
      const end = new Date(returnedAt);

      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const msPerDay = 1000 * 60 * 60 * 24;
        // Exclude start day, include end day
        const days = Math.max(
          1,
          Math.ceil((end.getTime() - start.getTime()) / msPerDay),
        );
        const price = days * Number(rentData.pricePerDay);
        setTotalPrice(Number.isFinite(price) ? price : 0);
        return;
      }
    }

    if (rentData && typeof rentData.totalPrice === 'number') {
      setTotalPrice(
        Number.isFinite(rentData.totalPrice) ? rentData.totalPrice : 0,
      );
    } else {
      setTotalPrice(0);
    }
  }, [rentData, returnedAt]);

  // Disable returnedAt if loading or not open contract
  const isReturnedAtDisabled =
    rentLoading || !rentData || rentData.isOpenContract !== true;

  const onSubmit = (data: EditRentFormFields) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-full sm:max-w-[500px] p-4 pt-14">
        <DialogTitle>Edit Rent Contract</DialogTitle>
        <DialogDescription>
          {carModel && <span className="font-semibold">Car: {carModel}</span>}
          <br />
          Update the return date, late fee, and damage report for this rent
          contract.
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
                      disabled={isReturnedAtDisabled}
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
            {/* Late Fee */}
            <div>
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
            {/* Total Price (read-only, always shown, always updated for open contracts) */}
            <div>
              <Label>Total Price (DHS)</Label>
              <Input
                value={Number.isFinite(totalPrice) ? totalPrice : 0}
                disabled
                className="mt-1 w-full"
                readOnly
              />
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
