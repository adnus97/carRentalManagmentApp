'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader } from 'lucide-react';
import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Separator } from '@/components/ui/separator';
import { useEffect } from 'react';
import { updateCustomer, Customer } from '@/api/customers';
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

export function EditClientDialog({
  open,
  onOpenChange,
  customer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
}) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: Partial<Customer>) => updateCustomer(customer!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      onOpenChange(false);
      toast({
        type: 'success',
        title: 'Success!',
        description: 'Client has been updated successfully.',
      });
    },
    onError: (error: any) => {
      const errorMessage = Array.isArray(error?.response?.data?.message)
        ? error.response.data.message.join(', ')
        : error?.response?.data?.message || 'Failed to update client.';

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

  // Reset form when customer changes
  useEffect(() => {
    if (customer) reset(customer);
  }, [customer, reset]);

  const onSubmit = (data: FormFields) => {
    if (!customer) return;
    mutation.mutate(data);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        onOpenChange(open);
        if (!open && customer) reset(customer);
      }}
    >
      <DialogContent className="sm:max-w-[400px] pt-8">
        <DialogTitle className="pb-1 text-lg font-semibold">
          Edit Client
        </DialogTitle>
        <p className="text-sm text-muted-foreground mb-4">
          Update the client information below.
        </p>
        <Separator className="mb-4" />

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          {/* First Name */}
          <div>
            <Label>First Name *</Label>
            <Input {...register('firstName')} />
            {errors.firstName && (
              <span className="text-red-500 text-xs">
                {errors.firstName.message}
              </span>
            )}
          </div>

          {/* Last Name */}
          <div>
            <Label>Last Name *</Label>
            <Input {...register('lastName')} />
            {errors.lastName && (
              <span className="text-red-500 text-xs">
                {errors.lastName.message}
              </span>
            )}
          </div>

          {/* Email */}
          <div>
            <Label>Email</Label>
            <Input {...register('email')} />
            {errors.email && (
              <span className="text-red-500 text-xs">
                {errors.email.message}
              </span>
            )}
          </div>

          {/* Phone */}
          <div>
            <Label>Phone *</Label>
            <Input {...register('phone')} />
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
              <Input {...register('documentId')} />
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
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {isSubmitting || mutation.isPending ? (
                <Loader className="animate-spin mr-2" />
              ) : null}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
