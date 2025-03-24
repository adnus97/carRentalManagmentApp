import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from '@phosphor-icons/react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader } from 'lucide-react';
import { Separator } from '../ui/separator';
import { useState } from 'react';
import { createCar } from '@/api/cars';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

const d = new Date();
let year = d.getFullYear();
const schema = z.object({
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
});
type formFields = z.infer<typeof schema>;

export function DialogDemo({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: createCar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['car'] });
      toast({
        title: 'Success',
        description: 'Car created successfully!',
      });
    },
    onError: (error) => {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'Failed to create car.',
        variant: 'destructive',
      });
    },
  });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    reset,
  } = useForm<formFields>({
    resolver: zodResolver(schema),
    defaultValues: {
      make: '',
      model: '',
      year: undefined,
      purchasePrice: undefined,
      pricePerDay: undefined,
    },
  });

  const onSubmit = (data: formFields) => {
    alert('Form submitted!'); // Check if this fires
    mutation.mutate({
      make: data.make,
      model: data.model,
      year: data.year,
      purchasePrice: data.purchasePrice,
      pricePerDay: data.pricePerDay,
    });
    console.log('Form Submitted:', data);
  };

  return (
    <Dialog
      onOpenChange={() => {
        setIsOpen(!isOpen);
        reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="default" className="pr-6 mr-14">
          <Plus size={40} />
          Add car
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader className="mt-4">
            <DialogTitle>Add a new car</DialogTitle>
            <DialogDescription>
              Add a new car here. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <Separator className="mt-2 mb-2" />
          <div className="grid gap-5 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="make" className="text-right">
                Make
              </Label>
              <div className="col-span-3">
                <Input
                  id="make"
                  placeholder='e.g. "Toyota"'
                  {...register('make')}
                />
                {errors.make && (
                  <span className="text-red-500 text-sm mt-1 block">
                    {errors.make.message}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="model" className="text-right">
                Model
              </Label>
              <div className="col-span-3">
                <Input
                  id="model"
                  placeholder='e.g. "Corolla"'
                  {...register('model')}
                />
                {errors.model && (
                  <span className="text-red-500 text-sm mt-1 block">
                    {errors.model.message}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="year" className="text-right">
                Year
              </Label>
              <div className="col-span-3">
                <Input
                  id="year"
                  type="number"
                  placeholder='e.g. "2020"'
                  {...register('year', { valueAsNumber: true })}
                />
                {errors.year && (
                  <span className="text-red-500 text-sm mt-1 block">
                    {errors.year.message}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="purchasePrice" className="text-right">
                Price (DHS)
              </Label>
              <div className="col-span-3">
                <Input
                  id="purchasePrice"
                  type="number"
                  placeholder='e.g. "280000"'
                  {...register('purchasePrice', { valueAsNumber: true })}
                />
                {errors.purchasePrice && (
                  <span className="text-red-500 text-sm mt-1 block">
                    {errors.purchasePrice.message}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="rentPrice" className="text-right">
                Daily rent fee (DHS)
              </Label>
              <div className="col-span-3">
                <Input
                  id="rentPrice"
                  type="number"
                  placeholder='e.g. "400"'
                  {...register('pricePerDay', { valueAsNumber: true })}
                />
                {errors.pricePerDay && (
                  <span className="text-red-500 text-sm mt-1 block">
                    {errors.pricePerDay.message}
                  </span>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">
              {' '}
              {isSubmitting ? (
                <>
                  <Loader />
                  <span>Saving...</span>
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
