'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateCar, Car } from '@/api/cars';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/toast';
import { FormDatePicker } from '@/components/form-date-picker';
import { useEffect } from 'react';
import { Separator } from '@/components/ui/separator';
import { Loader } from '@/components/loader';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { MoroccanPlateInput } from '@/components/ui/moroccanPlateInput';

const currentYear = new Date().getFullYear();

const schema = z.object({
  plateNumber: z
    .string()
    .min(1, 'form.errors.plate_required')
    .regex(/^\d{1,5}-[أ-ي]-\d{1,2}$/, 'Invalid plate number'),
  make: z.string().nonempty('form.errors.make_required'),
  model: z.string().nonempty('form.errors.model_required'),
  year: z
    .number({ invalid_type_error: 'form.errors.year_number' })
    .min(2010, 'form.errors.year_min')
    .max(currentYear, 'form.errors.year_max'),
  purchasePrice: z
    .number({ invalid_type_error: 'form.errors.price_number' })
    .min(1, 'form.errors.price_min'),
  pricePerDay: z
    .number({ invalid_type_error: 'form.errors.rent_number' })
    .min(1, 'form.errors.rent_min'),
  mileage: z
    .number({ invalid_type_error: 'form.errors.mileage_number' })
    .min(0, 'form.errors.mileage_min'),
  color: z.string().optional(),
  fuelType: z.string().optional(),
  monthlyLeasePrice: z
    .number({ invalid_type_error: 'form.errors.monthly_number' })
    .min(0, 'form.errors.monthly_min'),
  insuranceExpiryDate: z.date().refine((date) => date > new Date(), {
    message: 'form.errors.insurance_future',
  }),
  technicalVisiteExpiryDate: z.date().refine((date) => date > new Date(), {
    message: 'form.errors.tech_future',
  }),

  status: z.enum(['active', 'sold', 'leased', 'maintenance', 'deleted']),
});

type formFields = z.infer<typeof schema>;

export function EditCarFormDialog({
  open,
  onOpenChange,
  car,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  car: Car | null;
}) {
  const { t } = useTranslation(['cars', 'common']);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<formFields> }) =>
      updateCar(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cars'] });
      onOpenChange(false);
      toast({
        type: 'success',
        title: t('toasts.update_success_title', {
          ns: 'cars',
          defaultValue: 'Car Updated',
        }),
        description: t('toasts.update_success_desc', {
          ns: 'cars',
          defaultValue: 'The car details have been updated successfully.',
        }),
      });
    },
    onError: (error: any) => {
      toast({
        type: 'error',
        title: t('common.error', 'Error'),
        description:
          error?.response?.data?.message ||
          t('toasts.update_error', {
            ns: 'cars',
            defaultValue: 'Failed to update car.',
          }),
      });
    },
  });

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<formFields>({
    resolver: zodResolver(schema),
    defaultValues: {
      plateNumber: '',
      make: '',
      model: '',
      year: undefined,
      purchasePrice: undefined,
      pricePerDay: undefined,
      mileage: undefined,
      color: '',
      fuelType: 'gasoline',
      monthlyLeasePrice: undefined,
      insuranceExpiryDate: undefined,
      technicalVisiteExpiryDate: undefined,
      status: 'active',
    },
  });

  useEffect(() => {
    if (car) {
      reset({
        plateNumber: car.plateNumber,
        make: car.make,
        model: car.model,
        year: car.year,
        purchasePrice: car.purchasePrice,
        pricePerDay: car.pricePerDay,
        mileage: car.mileage,
        color: car.color || '',
        fuelType: car.fuelType || 'gasoline',
        monthlyLeasePrice: car.monthlyLeasePrice,
        insuranceExpiryDate: new Date(car.insuranceExpiryDate),
        technicalVisiteExpiryDate: new Date(car.technicalVisiteExpiryDate),
        status: car.status,
      });
    }
  }, [car, reset]);

  const onSubmit = (data: formFields) => {
    if (!car) return;

    const formattedData = {
      ...data,
      insuranceExpiryDate: new Date(data.insuranceExpiryDate),
      technicalVisiteExpiryDate: new Date(data.technicalVisiteExpiryDate),
    };

    mutation.mutate({ id: car.id, data: formattedData });
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
    <Dialog
      open={open}
      onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) reset();
      }}
    >
      <DialogContent className="sm:max-w-[600px] pt-4 max-h-[90vh] overflow-hidden">
        <DialogTitle className="text-lg font-semibold">
          {t('form.edit_title', { ns: 'cars', defaultValue: 'Edit Car' })}
        </DialogTitle>
        <p className="text-sm text-muted-foreground">
          {t('form.edit_subtitle', {
            ns: 'cars',
            defaultValue:
              'Update the details below to modify the car information.',
          })}
        </p>
        <Separator />

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[9px]">
            {/* Plate Number - Updated to use MoroccanPlateInput */}
            <div className="flex flex-col sm:col-span-2">
              <Label htmlFor="plateNumber" className="mb-1">
                {t('form.labels.plate', 'Plate Number')} *
              </Label>
              <Controller
                control={control}
                name="plateNumber"
                render={({ field }) => (
                  <MoroccanPlateInput
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              {errors.plateNumber && (
                <span className="text-red-500 text-xs mt-1">
                  {t(errors.plateNumber.message as any)}
                </span>
              )}
            </div>

            {/* Make */}
            <div className="flex flex-col">
              <Label htmlFor="make" className="mb-1">
                {t('form.labels.make', 'Make')} *
              </Label>
              <Input
                id="make"
                placeholder={t('form.placeholders.make', 'e.g. Toyota')}
                {...register('make')}
              />
              {errors.make && (
                <span className="text-red-500 text-xs">
                  {t(errors.make.message as any)}
                </span>
              )}
            </div>

            {/* Model */}
            <div className="flex flex-col">
              <Label htmlFor="model" className="mb-1">
                {t('form.labels.model', 'Model')} *
              </Label>
              <Input
                id="model"
                placeholder={t('form.placeholders.model', 'e.g. Corolla')}
                {...register('model')}
              />
              {errors.model && (
                <span className="text-red-500 text-xs">
                  {t(errors.model.message as any)}
                </span>
              )}
            </div>

            {/* Fuel Type */}
            <div>
              <Label htmlFor="fuelType">
                {t('form.labels.fuel', 'Fuel Type')}
              </Label>
              <Controller
                control={control}
                name="fuelType"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field?.value}>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t(
                          'form.placeholders.select_fuel',
                          'Select fuel type',
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gasoline">
                        {t('fuel.gasoline', 'Gasoline')}
                      </SelectItem>
                      <SelectItem value="diesel">
                        {t('fuel.diesel', 'Diesel')}
                      </SelectItem>
                      <SelectItem value="hybrid">
                        {t('fuel.hybrid', 'Hybrid')}
                      </SelectItem>
                      <SelectItem value="electric">
                        {t('fuel.electric', 'Electric')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Color */}
            <div>
              <Label htmlFor="color">{t('form.labels.color', 'Color')}</Label>
              <Controller
                control={control}
                name="color"
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ''}
                  >
                    <SelectTrigger
                      className={errors.color ? 'border-red-500' : ''}
                    >
                      <SelectValue
                        placeholder={t(
                          'form.placeholders.select_color',
                          'Select color',
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent className="overflow-y-auto h-[300px]">
                      {colorOptions.map((color) => {
                        const v = color.toLowerCase();
                        return (
                          <SelectItem key={v} value={v}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-4 h-4 rounded-full border border-gray-300"
                                style={{ backgroundColor: v }}
                              />
                              {t(`colors.${v}`, color)}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.color && (
                <p className="text-red-500 text-sm mt-1">
                  {t(errors.color.message as any)}
                </p>
              )}
            </div>

            {/* Year */}
            <div className="flex flex-col">
              <Label htmlFor="year" className="mb-1">
                {t('form.labels.year', 'Year')} *
              </Label>
              <Input
                id="year"
                type="number"
                placeholder={t('form.placeholders.year', 'e.g. 2020')}
                {...register('year', { valueAsNumber: true })}
              />
              {errors.year && (
                <span className="text-red-500 text-xs">
                  {t(errors.year.message as any)}
                </span>
              )}
            </div>

            {/* Price/Day */}
            <div className="flex flex-col">
              <Label htmlFor="pricePerDay" className="mb-1">
                {t('form.labels.price_per_day', 'Price/Day (DHS)')} *
              </Label>
              <Input
                id="pricePerDay"
                type="number"
                placeholder={t('form.placeholders.price_per_day', 'e.g. 150')}
                {...register('pricePerDay', { valueAsNumber: true })}
              />
              {errors.pricePerDay && (
                <span className="text-red-500 text-xs">
                  {t(errors.pricePerDay.message as any)}
                </span>
              )}
            </div>

            {/* Purchase Price */}
            <div className="flex flex-col">
              <Label htmlFor="purchasePrice" className="mb-1">
                {t('form.labels.purchase_price', 'Purchase Price (DHS)')} *
              </Label>
              <Input
                id="purchasePrice"
                type="number"
                placeholder={t(
                  'form.placeholders.purchase_price',
                  'e.g. 280000',
                )}
                {...register('purchasePrice', { valueAsNumber: true })}
              />
              {errors.purchasePrice && (
                <span className="text-red-500 text-xs">
                  {t(errors.purchasePrice.message as any)}
                </span>
              )}
            </div>

            {/* Monthly Lease Price */}
            <div className="flex flex-col">
              <Label htmlFor="monthlyLeasePrice" className="mb-1">
                {t('form.labels.monthly_lease', 'Monthly Lease (DHS)')} *
              </Label>
              <Input
                id="monthlyLeasePrice"
                type="number"
                placeholder={t('form.placeholders.monthly_lease', 'e.g. 4000')}
                {...register('monthlyLeasePrice', { valueAsNumber: true })}
              />
              {errors.monthlyLeasePrice && (
                <span className="text-red-500 text-xs">
                  {t(errors.monthlyLeasePrice.message as any)}
                </span>
              )}
            </div>

            {/* Mileage */}
            <div className="flex flex-col">
              <Label htmlFor="mileage" className="mb-1">
                {t('form.labels.mileage', 'Mileage (km)')} *
              </Label>
              <Input
                id="mileage"
                type="number"
                placeholder={t('form.placeholders.mileage', 'e.g. 120000')}
                {...register('mileage', { valueAsNumber: true })}
              />
              {errors.mileage && (
                <span className="text-red-500 text-xs">
                  {t(errors.mileage.message as any)}
                </span>
              )}
            </div>

            {/* Status */}
            <div className="flex flex-col">
              <Label className="mb-1">
                {t('columns.status', { ns: 'cars', defaultValue: 'Status' })}
              </Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t('form.placeholders.select_status', {
                          ns: 'cars',
                          defaultValue: 'Select status',
                        })}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">
                        {t('status.active', {
                          ns: 'cars',
                          defaultValue: 'Active',
                        })}
                      </SelectItem>
                      <SelectItem value="sold">
                        {t('status.sold', { ns: 'cars', defaultValue: 'Sold' })}
                      </SelectItem>
                      <SelectItem value="maintenance">
                        {t('status.maintenance', {
                          ns: 'cars',
                          defaultValue: 'Maintenance',
                        })}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.status && (
                <span className="text-red-500 text-xs">
                  {t(errors.status.message as any)}
                </span>
              )}
            </div>

            {/* Insurance Expiry */}
            <div className="flex flex-col">
              <Label htmlFor="insuranceExpiryDate" className="mb-1">
                {t('form.labels.insurance_expiry', 'Insurance Expiry')} *
              </Label>
              <Controller
                control={control}
                name="insuranceExpiryDate"
                render={({ field }) => (
                  <FormDatePicker
                    value={field.value}
                    onChange={field.onChange}
                    placeholder={t(
                      'form.placeholders.insurance_expiry',
                      'Select insurance expiry date',
                    )}
                  />
                )}
              />
              {errors.insuranceExpiryDate && (
                <span className="text-red-500 text-xs">
                  {t(errors.insuranceExpiryDate.message as any)}
                </span>
              )}
            </div>

            {/* Technical Visit Expiry */}
            <div className="flex flex-col">
              <Label htmlFor="technicalVisiteExpiryDate" className="mb-1">
                {t('form.labels.tech_expiry', 'Technical Visit Expiry')} *
              </Label>
              <Controller
                control={control}
                name="technicalVisiteExpiryDate"
                render={({ field }) => (
                  <FormDatePicker
                    value={field.value}
                    onChange={field.onChange}
                    placeholder={t(
                      'form.placeholders.tech_expiry',
                      'Select technical visit expiry date',
                    )}
                  />
                )}
              />
              {errors.technicalVisiteExpiryDate && (
                <span className="text-red-500 text-xs">
                  {t(errors.technicalVisiteExpiryDate.message as any)}
                </span>
              )}
            </div>
          </div>

          {/* Save button */}
          <div className="text-right mt-6">
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? <Loader /> : null}
              <span className="ml-2">{t('form.actions.save', 'Save')}</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
