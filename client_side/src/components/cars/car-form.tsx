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
import { DatePickerDemo } from '../date-picker';
import { DialogDescription } from '@radix-ui/react-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

const d = new Date();
let year = d.getFullYear();
const schema = z.object({
  plateNumber: z.string().min(1, 'Plate number is required'),
  make: z.string().nonempty('Make is required'),
  model: z.string().nonempty('Model is required'),
  year: z
    .number({ invalid_type_error: 'Year must be a number' })
    .min(2010, 'Year must be greater than 2010')
    .max(year, 'Year must be less than or equal to current year'),
  purchasePrice: z
    .number({ invalid_type_error: 'Price must be a number' })
    .min(1, 'Price must be greater than 0'),
  pricePerDay: z
    .number({ invalid_type_error: 'Rent price must be a number' })
    .min(1, 'Rent price must be greater than 0'),
  mileage: z.number().min(0, 'Mileage must be a positive number'),
  color: z.string().optional(),
  fuelType: z.string().optional(),
  monthlyLeasePrice: z
    .number()
    .min(0, 'Monthly lease price must be a positive number'),
  insuranceExpiryDate: z.date().refine((date) => date > new Date(), {
    message: 'Insurance expiry date must be in the future',
  }),
});
type formFields = z.infer<typeof schema>;

export function DialogDemo({
  className,
  ...props
}: React.ComponentProps<'div'>) {
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
        title: 'Success!',
        description: 'Your action was completed successfully.',
        button: {
          label: 'Undo',
          onClick: () => {
            console.log('Undo clicked');
          },
        },
      });
    },
    onError: (error: any) => {
      console.error('Error:', error);

      // ✅ Clear previous errors
      setBackendErrors({});
      setGeneralError('');

      // ✅ Parse backend error response
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        'An unexpected error occurred';

      // ✅ Handle specific error types
      if (errorMessage.toLowerCase().includes('plate number')) {
        // Plate number uniqueness error
        setBackendErrors({ plateNumber: errorMessage });
        toast({
          type: 'error',
          title: 'Duplicate Plate Number',
          description:
            'This plate number is already registered. Please use a different one.',
        });
      } else if (errorMessage.toLowerCase().includes('organization')) {
        // Organization-related error
        setGeneralError(
          'There was an issue with your account. Please contact support.',
        );
        toast({
          type: 'error',
          title: 'Account Error',
          description: 'Please contact support for assistance.',
        });
      } else if (errorMessage.toLowerCase().includes('required')) {
        // Missing required fields
        setGeneralError('Please fill in all required fields correctly.');
        toast({
          type: 'error',
          title: 'Missing Information',
          description: 'Please check all required fields and try again.',
        });
      } else {
        // Generic error
        setGeneralError(errorMessage);
        toast({
          type: 'error',
          title: 'Error',
          description: errorMessage,
          button: {
            label: 'Retry',
            onClick: () => {
              // ✅ Retry with current form values
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
    watch,
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
      fuelType: 'Diesel',
      pricePerDay: undefined,
      mileage: undefined,
      monthlyLeasePrice: undefined,
      insuranceExpiryDate: undefined,
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
          Add car
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[600px] pt-8 max-h-[90vh] overflow-y-auto">
        <DialogTitle className="pb-1 hidden sm:block">
          Add a new Car
        </DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground hidden sm:block">
          Fill out the form below to add a new car to the system.
        </DialogDescription>
        <Separator className="mb-2 hidden sm:block" />

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 🆕 Plate Number - Full width */}
            <div className="flex flex-col ">
              <Label htmlFor="plateNumber" className="mb-1">
                Plate Number *
              </Label>
              <Input
                id="plateNumber"
                className="w-full font-mono"
                placeholder="e.g. 123-A-456"
                {...register('plateNumber')}
              />
              {errors.plateNumber && (
                <span className="text-red-500 text-xs mt-1">
                  {errors.plateNumber.message}
                </span>
              )}
            </div>

            {/* Make */}
            <div className="flex flex-col">
              <Label htmlFor="make" className="mb-1">
                Make *
              </Label>
              <Input
                id="make"
                className="w-full"
                placeholder="e.g. Toyota"
                {...register('make')}
              />
              {errors.make && (
                <span className="text-red-500 text-xs mt-1">
                  {errors.make.message}
                </span>
              )}
            </div>

            {/* Model */}
            <div className="flex flex-col">
              <Label htmlFor="model" className="mb-1">
                Model *
              </Label>
              <Input
                id="model"
                className="w-full"
                placeholder="e.g. Corolla"
                {...register('model')}
              />
              {errors.model && (
                <span className="text-red-500 text-xs mt-1">
                  {errors.model.message}
                </span>
              )}
            </div>

            {/* Year */}
            <div className="flex flex-col">
              <Label htmlFor="year" className="mb-1">
                Year *
              </Label>
              <Input
                id="year"
                type="number"
                className="w-full"
                placeholder="e.g. 2020"
                {...register('year', { valueAsNumber: true })}
              />
              {errors.year && (
                <span className="text-red-500 text-xs mt-1">
                  {errors.year.message}
                </span>
              )}
            </div>

            <div>
              <Label htmlFor="color">Color</Label>
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
                      <SelectValue placeholder="Select color" />
                    </SelectTrigger>
                    <SelectContent>
                      {colorOptions.map((color) => (
                        <SelectItem key={color} value={color.toLowerCase()}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded-full border border-gray-300"
                              style={{ backgroundColor: color.toLowerCase() }}
                            />
                            {color}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.color && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.color.message}
                </p>
              )}
            </div>

            {/* 🆕 Fuel Type */}
            <div className="flex flex-col">
              <Label className="mb-1">Fuel Type</Label>
              <Controller
                control={control}
                name="fuelType"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select fuel type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gasoline">Gasoline</SelectItem>
                      <SelectItem value="diesel">Diesel</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                      <SelectItem value="electric">Electric</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Price/Day */}
            <div className="flex flex-col">
              <Label htmlFor="pricePerDay" className="mb-1">
                Price/Day (DHS) *
              </Label>
              <Input
                id="pricePerDay"
                type="number"
                placeholder="e.g. 150"
                {...register('pricePerDay', { valueAsNumber: true })}
              />
              {errors.pricePerDay && (
                <span className="text-red-500 text-xs mt-1">
                  {errors.pricePerDay.message}
                </span>
              )}
            </div>

            {/* Purchase Price */}
            <div className="flex flex-col">
              <Label htmlFor="purchasePrice" className="mb-1">
                Purchase Price (DHS) *
              </Label>
              <Input
                id="purchasePrice"
                type="number"
                className="w-full"
                placeholder="e.g. 280000"
                {...register('purchasePrice', { valueAsNumber: true })}
              />
              {errors.purchasePrice && (
                <span className="text-red-500 text-xs mt-1">
                  {errors.purchasePrice.message}
                </span>
              )}
            </div>

            {/* Monthly Lease Price */}
            <div className="flex flex-col">
              <Label htmlFor="monthlyLeasePrice" className="mb-1">
                Monthly Lease (DHS) *
              </Label>
              <Input
                id="monthlyLeasePrice"
                type="number"
                className="w-full"
                placeholder="e.g. 4000"
                {...register('monthlyLeasePrice', { valueAsNumber: true })}
              />
              {errors.monthlyLeasePrice && (
                <span className="text-red-500 text-xs mt-1">
                  {errors.monthlyLeasePrice.message}
                </span>
              )}
            </div>

            {/* Mileage */}
            <div className="flex flex-col">
              <Label htmlFor="mileage" className="mb-1">
                Mileage (km) *
              </Label>
              <Input
                id="mileage"
                type="number"
                className="w-full"
                placeholder="e.g. 120000"
                {...register('mileage', { valueAsNumber: true })}
              />
              {errors.mileage && (
                <span className="text-red-500 text-xs mt-1">
                  {errors.mileage.message}
                </span>
              )}
            </div>

            {/* Insurance Expiry - Full width */}
            <div className="flex flex-col sm:col-span-2">
              <Label htmlFor="insuranceExpiryDate" className="mb-1">
                Insurance Expiry *
              </Label>
              <Controller
                control={control}
                name="insuranceExpiryDate"
                rules={{ required: 'Required' }}
                render={({ field }) => (
                  <DatePickerDemo
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              {errors.insuranceExpiryDate && (
                <span className="text-red-500 text-xs mt-1">
                  {errors.insuranceExpiryDate.message}
                </span>
              )}
            </div>
          </div>

          {/* Save button */}
          <div className="text-right mt-6">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader className="animate-spin mr-2" /> : null}
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
