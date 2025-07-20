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
import { Checkbox } from '@/components/ui/checkbox';
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

const rentSchema = z.object({
  carId: z.string().nonempty('Car is required'),
  customerId: z.string().nonempty('Customer is required'),
  startDate: z.date({ required_error: 'Start date is required' }),
  expectedEndDate: z.coerce.date().nullable().optional(),
  returnedAt: z.coerce.date().nullable().optional(),
  isOpenContract: z.boolean(),
  totalPrice: z.number().int().min(0).optional().nullable(),
  customPrice: z.number().int().min(0).optional().nullable(),
  deposit: z.number().int().min(0).default(0),
  guarantee: z.number().int().min(0).default(0),
  lateFee: z.number().int().min(0).default(0),
  status: z.enum(['active', 'completed', 'canceled']).default('active'),
  damageReport: z.string().optional().default(''),
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
      customPrice: 0,
      deposit: 0,
      guarantee: 0,
      lateFee: 0,
      status: 'active',
      damageReport: '',
      returnedAt: null,
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
  const returnedAt = watch('returnedAt');

  // Set totalPrice and expectedEndDate to 0/null if isOpenContract is checked
  useEffect(() => {
    if (isOpenContract) {
      setValue('totalPrice', 0);
      setValue('expectedEndDate', null);
    }
  }, [isOpenContract, setValue]);

  // Auto-calculate totalPrice if both dates are set and isOpenContract is false
  useEffect(() => {
    if (
      !isOpenContract &&
      startDate &&
      expectedEndDate &&
      !isNaN(startDate.getTime()) &&
      !isNaN(expectedEndDate.getTime())
    ) {
      const msPerDay = 1000 * 60 * 60 * 24;
      const days = Math.max(
        1,
        Math.ceil((expectedEndDate.getTime() - startDate.getTime()) / msPerDay),
      );
      setValue('totalPrice', days * pricePerDay);
    }
  }, [startDate, expectedEndDate, pricePerDay, isOpenContract, setValue]);

  // Auto-set returnedAt to expectedEndDate if contract is not open and expectedEndDate is set
  useEffect(() => {
    if (!isOpenContract && expectedEndDate && !returnedAt) {
      setValue('returnedAt', expectedEndDate);
    }
  }, [isOpenContract, expectedEndDate, returnedAt, setValue]);

  const onSubmit = (data: RentFormFields) => {
    mutation.mutate({
      carId: data.carId,
      userId: data.customerId,
      startDate: data.startDate,
      expectedEndDate: data.expectedEndDate ? data.expectedEndDate : undefined,
      returnedAt: data.returnedAt ? data.returnedAt : undefined,
      customerId: data.customerId,
      totalPrice: data.totalPrice ?? 0,
      customPrice: data.customPrice ?? 0,
      deposit: data.deposit ?? 0,
      guarantee: data.guarantee ?? 0,
      lateFee: data.lateFee ?? 0,
      isOpenContract: data.isOpenContract,
      status: data.status,
      damageReport: data.damageReport,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-full sm:max-w-[600px] p-4 pt-14">
        <DialogTitle>Create Rent Contract</DialogTitle>
        <DialogDescription>
          Fill out the form below to create a new rent contract for the selected
          vehicle.
        </DialogDescription>
        <Separator className="my-2" />
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-6 w-full"
          noValidate
        >
          {/* Car Model and Customer side by side */}
          <div className="flex flex-col sm:flex-row gap-4">
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
          <div className="flex flex-col sm:flex-row gap-4">
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
          <div className="flex items-center space-x-3">
            <Controller
              control={control}
              name="isOpenContract"
              render={({ field }) => (
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(checked) =>
                    field.onChange(checked === true)
                  }
                  id="isOpenContract"
                />
              )}
            />
            <Label htmlFor="isOpenContract" className="cursor-pointer">
              Open Contract (no fixed end date)
            </Label>
          </div>

          {/* Pricing and Fees */}
          <div className="flex flex-col sm:flex-row gap-4">
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
              <Label htmlFor="customPrice">Custom Price</Label>
              <Input
                id="customPrice"
                type="number"
                {...register('customPrice', { valueAsNumber: true })}
                placeholder="Custom price"
                className="mt-1 w-full"
              />
              {errors.customPrice && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.customPrice.message}
                </p>
              )}
            </div>
            <div className="flex-1">
              <Label htmlFor="deposit">Deposit</Label>
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
              <Label htmlFor="guarantee">Guarantee</Label>
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
