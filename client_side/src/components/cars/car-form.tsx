import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from '@phosphor-icons/react';
import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader } from 'lucide-react';
import { Separator } from '../ui/separator';
import { useState } from 'react';
import { createCar } from '@/api/cars';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../ui/toast';
import { FormDatePicker } from '../form-date-picker';
import { DialogDescription } from '@radix-ui/react-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useTranslation } from 'react-i18next';

const d = new Date();
let year = d.getFullYear();

const schema = z.object({
  plateNumber: z.string().min(1, 'form.errors.plate_required'),
  make: z.string().nonempty('form.errors.make_required'),
  model: z.string().nonempty('form.errors.model_required'),
  year: z
    .number({ invalid_type_error: 'form.errors.year_number' })
    .min(2010, 'form.errors.year_min')
    .max(year, 'form.errors.year_max'),
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
});
type formFields = z.infer<typeof schema>;

export function DialogDemo({}: React.ComponentProps<'div'>) {
  const { t } = useTranslation(['cars', 'common']);

  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const [backendErrors, setBackendErrors] = useState<Record<string, string>>(
    {},
  );
  const [generalError, setGeneralError] = useState<string>('');
  const mutation = useMutation({
    mutationFn: createCar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cars'] });
      setIsOpen(false);
      reset();
      setBackendErrors({});
      setGeneralError('');
      toast({
        type: 'success',
        title: t('form.toasts.success_title', 'Success!'),
        description: t(
          'form.toasts.success_desc',
          'Your action was completed successfully.',
        ),
        button: {
          label: t('form.toasts.undo', 'Undo'),
          onClick: () => {
            console.log('Undo clicked');
          },
        },
      });
    },
    onError: (error: any) => {
      console.error('Error:', error);

      setBackendErrors({});
      setGeneralError('');

      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        t('form.toasts.generic_error', 'An unexpected error occurred');

      if (errorMessage.toLowerCase().includes('plate number')) {
        setBackendErrors({ plateNumber: errorMessage });
        toast({
          type: 'error',
          title: t(
            'form.toasts.duplicate_plate_title',
            'Duplicate Plate Number',
          ),
          description: t(
            'form.toasts.duplicate_plate_desc',
            'This plate number is already registered. Please use a different one.',
          ),
        });
      } else if (errorMessage.toLowerCase().includes('organization')) {
        setGeneralError(
          t(
            'form.toasts.org_issue_msg',
            'There was an issue with your account. Please contact support.',
          ),
        );
        toast({
          type: 'error',
          title: t('form.toasts.account_error_title', 'Account Error'),
          description: t(
            'form.toasts.account_error_desc',
            'Please contact support for assistance.',
          ),
        });
      } else if (errorMessage.toLowerCase().includes('required')) {
        setGeneralError(
          t(
            'form.toasts.required_msg',
            'Please fill in all required fields correctly.',
          ),
        );
        toast({
          type: 'error',
          title: t('form.toasts.missing_info_title', 'Missing Information'),
          description: t(
            'form.toasts.missing_info_desc',
            'Please check all required fields and try again.',
          ),
        });
      } else {
        setGeneralError(errorMessage);
        toast({
          type: 'error',
          title: t('common.error', 'Error'),
          description: errorMessage,
          button: {
            label: t('form.toasts.retry', 'Retry'),
            onClick: () => {
              const formData = getValues();
              mutation.mutate({
                ...formData,
                fuelType: formData.fuelType ?? 'gasoline',
                status: 'active',
              });
            },
          },
        });
      }
    },
  });

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },

    reset,
    getValues,
  } = useForm<formFields>({
    resolver: zodResolver(schema),
    defaultValues: {
      make: '',
      plateNumber: '',
      model: '',
      year: undefined,
      purchasePrice: undefined,
      color: '',
      fuelType: 'diesel', // keep consistent with DB if it expects lowercase
      pricePerDay: undefined,
      mileage: 0,
      monthlyLeasePrice: 0,
      insuranceExpiryDate: undefined,
      technicalVisiteExpiryDate: undefined,
    },
  });

  const onSubmit = (data: formFields) => {
    mutation.mutate({
      ...data,
      fuelType: data.fuelType ?? '',
      status: 'active',
    });
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
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="default"
          className="text-white flex items-center gap-2 px-4 py-2 rounded-lg"
        >
          <Plus size={40} />
          {t('form.add_car_btn', 'Add car')}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[600px] pt-8 max-h-[90vh] overflow-hidden">
        <DialogTitle className="pb-1 hidden sm:block">
          {t('form.title', 'Add a new Car')}
        </DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground hidden sm:block">
          {t(
            'form.subtitle',
            'Fill out the form below to add a new car to the system.',
          )}
        </DialogDescription>
        <Separator className="mb-2 hidden sm:block" />

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Plate Number */}
            <div className="flex flex-col ">
              <Label htmlFor="plateNumber" className="mb-1">
                {t('form.labels.plate', 'Plate Number')} *
              </Label>
              <Input
                id="plateNumber"
                className="w-full font-mono"
                placeholder={t('form.placeholders.plate', 'e.g. 123-A-456')}
                {...register('plateNumber')}
              />
              {(errors.plateNumber || backendErrors.plateNumber) && (
                <span className="text-red-500 text-xs mt-1">
                  {backendErrors.plateNumber
                    ? backendErrors.plateNumber
                    : t(errors.plateNumber?.message as any)}
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
                className="w-full"
                placeholder={t('form.placeholders.make', 'e.g. Toyota')}
                {...register('make')}
              />
              {errors.make && (
                <span className="text-red-500 text-xs mt-1">
                  {t(
                    (errors.make.message as string) ||
                      'form.errors.make_required',
                  )}
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
                className="w-full"
                placeholder={t('form.placeholders.model', 'e.g. Corolla')}
                {...register('model')}
              />
              {errors.model && (
                <span className="text-red-500 text-xs mt-1">
                  {t(errors.model.message as any)}
                </span>
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
                className="w-full"
                placeholder={t('form.placeholders.year', 'e.g. 2020')}
                {...register('year', { valueAsNumber: true })}
              />
              {errors.year && (
                <span className="text-red-500 text-xs mt-1">
                  {t(errors.year.message as any)}
                </span>
              )}
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
                      {colorOptions.map((color) => (
                        <SelectItem key={color} value={color.toLowerCase()}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded-full border border-gray-300"
                              style={{ backgroundColor: color.toLowerCase() }}
                            />
                            {t(`colors.${color.toLowerCase()}`, color)}
                          </div>
                        </SelectItem>
                      ))}
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
                <span className="text-red-500 text-xs mt-1">
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
                className="w-full"
                placeholder={t(
                  'form.placeholders.purchase_price',
                  'e.g. 280000',
                )}
                {...register('purchasePrice', { valueAsNumber: true })}
              />
              {errors.purchasePrice && (
                <span className="text-red-500 text-xs mt-1">
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
                className="w-full"
                placeholder={t('form.placeholders.monthly_lease', 'e.g. 4000')}
                {...register('monthlyLeasePrice', { valueAsNumber: true })}
              />
              {errors.monthlyLeasePrice && (
                <span className="text-red-500 text-xs mt-1">
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
                className="w-full"
                placeholder={t('form.placeholders.mileage', 'e.g. 120000')}
                {...register('mileage', { valueAsNumber: true })}
              />
              {errors.mileage && (
                <span className="text-red-500 text-xs mt-1">
                  {t(errors.mileage.message as any)}
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
                rules={{ required: t('form.errors.required', 'Required') }}
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
                <span className="text-red-500 text-xs mt-1">
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
                rules={{ required: t('form.errors.required', 'Required') }}
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
                <span className="text-red-500 text-xs mt-1">
                  {t(errors.technicalVisiteExpiryDate.message as any)}
                </span>
              )}
            </div>
          </div>

          {/* Save button */}
          <div className="text-right mt-6">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader className="animate-spin mr-2" /> : null}
              {t('form.actions.save', 'Save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
