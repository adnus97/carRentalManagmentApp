'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Loader } from 'lucide-react';
import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Separator } from '@/components/ui/separator';
import { useState } from 'react';
import { createCustomer } from '@/api/customers';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/toast';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

const schema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().min(6, 'Phone is required'),
  documentId: z.string().min(2, 'Document ID is required'),
  documentType: z.enum(['passport', 'driver_license', 'id_card'], {
    required_error: 'Document type is required',
  }),
});

type FormFields = z.infer<typeof schema>;

export function AddClientDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setIsOpen(false);
      reset();
      toast({
        type: 'success',
        title: 'Success!',
        description: 'Client has been added successfully.',
      });
    },
    onError: (error: any) => {
      const errorMessage = Array.isArray(error?.response?.data?.message)
        ? error.response.data.message.join(', ')
        : error?.response?.data?.message || 'Failed to add client.';

      toast({
        type: 'error',
        title: 'Error',
        description: errorMessage,
      });
    },
  });

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormFields>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      documentId: '',
      documentType: undefined,
    },
  });

  const onSubmit = (data: FormFields) => {
    mutation.mutate(data);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) reset();
      }}
    >
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button variant="default">
            <Plus size={20} /> Add Client
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[400px] pt-8">
        <DialogTitle className="pb-1 hidden sm:block">
          Add a new Client
        </DialogTitle>
        <p className="text-sm text-muted-foreground hidden sm:block">
          Fill out the form below to add a new client to the system.
        </p>
        <Separator className="mb-2 hidden sm:block" />

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          {/* First Name */}
          <div>
            <Label>First Name *</Label>
            <Input {...register('firstName')} placeholder="e.g. John" />
            {errors.firstName && (
              <span className="text-red-500 text-xs">
                {errors.firstName.message}
              </span>
            )}
          </div>

          {/* Last Name */}
          <div>
            <Label>Last Name *</Label>
            <Input {...register('lastName')} placeholder="e.g. Doe" />
            {errors.lastName && (
              <span className="text-red-500 text-xs">
                {errors.lastName.message}
              </span>
            )}
          </div>

          {/* Email */}
          <div>
            <Label>Email</Label>
            <Input {...register('email')} placeholder="e.g. john@example.com" />
            {errors.email && (
              <span className="text-red-500 text-xs">
                {errors.email.message}
              </span>
            )}
          </div>

          {/* Phone */}
          <div>
            <Label>Phone *</Label>
            <Input {...register('phone')} placeholder="e.g. 0612345678" />
            {errors.phone && (
              <span className="text-red-500 text-xs">
                {errors.phone.message}
              </span>
            )}
          </div>

          {/* Document ID + Type side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Document ID *</Label>
              <Input {...register('documentId')} placeholder="e.g. TA123456" />
              {errors.documentId && (
                <span className="text-red-500 text-xs">
                  {errors.documentId.message}
                </span>
              )}
            </div>
            <div>
              <Label>Document Type *</Label>
              <Controller
                control={control}
                name="documentType"
                render={({ field }) => (
                  <Select
                    onValueChange={(val) => field.onChange(val)}
                    value={field.value}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="passport">Passport</SelectItem>
                      <SelectItem value="driver_license">
                        Driver License
                      </SelectItem>
                      <SelectItem value="id_card">ID Card</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.documentType && (
                <span className="text-red-500 text-xs">
                  {errors.documentType.message}
                </span>
              )}
            </div>
          </div>

          {/* Save button */}
          <div className="text-right pt-2">
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
