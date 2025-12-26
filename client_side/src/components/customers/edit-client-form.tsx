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
import { useEffect, useState } from 'react';
import { updateCustomer, CustomerWithFiles } from '@/api/customers';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/toast';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { File as ApiFile } from '@/api/files';
import { FileUploaderStyled } from './file-uploader-styled';
import { useTranslation } from 'react-i18next';

// Mirror the Add form schema: address + driversLicense, and documentType excludes driver_license
const schema = z.object({
  firstName: z.string().min(2, 'form.errors.first_required'),
  lastName: z.string().min(2, 'form.errors.last_required'),
  email: z
    .string()
    .email('form.errors.email_invalid')
    .optional()
    .or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().min(2, 'form.errors.address_required'),
  documentId: z.string().min(2, 'form.errors.doc_id_required'),
  documentType: z.enum(['passport', 'id_card'], {
    required_error: 'form.errors.doc_type_required',
  }),
  driversLicense: z.string().optional(), // separate text field
  idCardId: z.string().optional(),
  driversLicenseId: z.string().optional(),
});

type FormFields = z.infer<typeof schema>;

export function EditClientDialog({
  open,
  onOpenChange,
  customer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: CustomerWithFiles | null;
}) {
  const { t } = useTranslation('client');
  const [idCardFile, setIdCardFile] = useState<ApiFile | null>(null);
  const [driversLicenseFile, setDriversLicenseFile] = useState<ApiFile | null>(
    null,
  );

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: Partial<CustomerWithFiles>) =>
      updateCustomer(customer!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({
        queryKey: ['customerDetails', customer?.id],
      });
      onOpenChange(false);
      toast({
        type: 'success',
        title: t('form.toasts.success_title', 'Success!'),
        description: t(
          'form.toasts.updated_desc',
          'Client has been updated successfully.',
        ),
      });
    },
    onError: (error: any) => {
      const errorMessage = Array.isArray(error?.response?.data?.message)
        ? error.response.data.message.join(', ')
        : error?.response?.data?.message ||
          t('form.toasts.update_failed', 'Failed to update client.');

      toast({
        type: 'error',
        title: t('form.toasts.error_title', 'Error'),
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
    setValue,
  } = useForm<FormFields>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      documentId: '',
      documentType: undefined,
      driversLicense: '',
      idCardId: undefined,
      driversLicenseId: undefined,
    },
  });

  // Reset form when customer changes
  useEffect(() => {
    if (customer) {
      reset({
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email || '',
        phone: customer.phone,
        address: (customer as any).address || '', // address is required in new schema
        documentId: customer.documentId || '',
        documentType:
          (customer.documentType as 'passport' | 'id_card') || undefined,
        driversLicense: (customer as any).driversLicense || '',
        idCardId: customer.idCardId || undefined,
        driversLicenseId: customer.driversLicenseId || undefined,
      });

      setIdCardFile(null);
      setDriversLicenseFile(null);
    }
  }, [customer, reset]);

  const onSubmit = (data: FormFields) => {
    if (!customer) return;

    const payload: Partial<CustomerWithFiles> = {
      ...data,
      idCardId: idCardFile?.id || customer.idCardId || undefined,
      driversLicenseId:
        driversLicenseFile?.id || customer.driversLicenseId || undefined,
    };

    mutation.mutate(payload);
  };

  const handleIdCardUpload = (file: ApiFile) => {
    setIdCardFile(file);
    setValue('idCardId', file.id);
  };

  const handleDriversLicenseUpload = (file: ApiFile) => {
    setDriversLicenseFile(file);
    setValue('driversLicenseId', file.id);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        onOpenChange(open);
        if (!open && customer) {
          reset({
            firstName: customer.firstName,
            lastName: customer.lastName,
            email: customer.email || '',
            phone: customer.phone,
            address: (customer as any).address || '',
            documentId: customer.documentId || '',
            documentType:
              (customer.documentType as 'passport' | 'id_card') || undefined,
            driversLicense: (customer as any).driversLicense || '',
            idCardId: customer.idCardId || undefined,
            driversLicenseId: customer.driversLicenseId || undefined,
          });
          setIdCardFile(null);
          setDriversLicenseFile(null);
        }
      }}
    >
      <DialogContent className="sm:max-w-[520px] pt-8 max-h-[80vh] overflow-y-auto">
        <DialogTitle className="pb-1 text-lg font-semibold">
          {t('form.edit_title', 'Edit Client')}
        </DialogTitle>
        <p className="text-sm text-muted-foreground mb-4">
          {t('form.edit_subtitle', 'Update the client information below.')}
        </p>
        <Separator className="mb-4" />

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('form.labels.first', 'First Name')} *</Label>
              <Input {...register('firstName')} />
              {errors.firstName && (
                <span className="text-red-500 text-xs">
                  {t(errors.firstName.message as string)}
                </span>
              )}
            </div>
            <div>
              <Label>{t('form.labels.last', 'Last Name')} *</Label>
              <Input {...register('lastName')} />
              {errors.lastName && (
                <span className="text-red-500 text-xs">
                  {t(errors.lastName.message as string)}
                </span>
              )}
            </div>
          </div>

          {/* Email */}
          <div>
            <Label>{t('form.labels.email', 'Email')}</Label>
            <Input {...register('email')} />
            {errors.email && (
              <span className="text-red-500 text-xs">
                {t(errors.email.message as string)}
              </span>
            )}
          </div>

          {/* Phone + Address */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('form.labels.phone', 'Phone')} </Label>
              <Input {...register('phone')} />
              {errors.phone && (
                <span className="text-red-500 text-xs">
                  {t(errors.phone.message as string)}
                </span>
              )}
            </div>
            <div>
              <Label>{t('form.labels.address', 'Address')} *</Label>
              <Input {...register('address')} />
              {errors.address && (
                <span className="text-red-500 text-xs">
                  {t(errors.address.message as string)}
                </span>
              )}
            </div>
          </div>

          {/* Document ID + Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('form.labels.doc_id', 'Document ID')} *</Label>
              <Input {...register('documentId')} />
              {errors.documentId && (
                <span className="text-red-500 text-xs">
                  {t(errors.documentId.message as string)}
                </span>
              )}
            </div>
            <div>
              <Label>{t('form.labels.doc_type', 'Document Type')} *</Label>
              <Controller
                control={control}
                name="documentType"
                render={({ field }) => (
                  <Select
                    onValueChange={(val) => field.onChange(val)}
                    value={field.value}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t(
                          'form.placeholders.doc_type',
                          'Select type',
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="passport">
                        {t('form.doc_types.passport', 'Passport')}
                      </SelectItem>
                      <SelectItem value="id_card">
                        {t('form.doc_types.id_card', 'ID Card')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.documentType && (
                <span className="text-red-500 text-xs">
                  {t(errors.documentType.message as string)}
                </span>
              )}
            </div>
          </div>

          {/* Driver’s License (text) */}
          <div>
            <Label>{t('form.labels.driver_license', "Driver's License")}</Label>
            <Input
              {...register('driversLicense')}
              placeholder={t(
                'form.placeholders.driver_license',
                'e.g. ABC123456',
              )}
            />
          </div>

          {/* File Uploads */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {t('form.sections.docs', 'Document Images')}
            </h3>

            <div className="grid grid-cols-1 gap-4">
              <FileUploaderStyled
                label={t('form.uploads.id_card', 'ID Card Image')}
                accept=".jpg,.jpeg,.png,.webp"
                folder="customers/id-cards"
                onUploadSuccess={handleIdCardUpload}
                description={t(
                  'form.uploads.id_card_desc',
                  'Upload a clear photo of the ID card',
                )}
                currentFile={customer?.idCardFile?.url} // preview shows
                disabled={isSubmitting || mutation.isPending}
              />

              <FileUploaderStyled
                label={t(
                  'form.uploads.driver_license',
                  "Driver's License Image",
                )}
                accept=".jpg,.jpeg,.png,.webp"
                folder="customers/drivers-licenses"
                onUploadSuccess={handleDriversLicenseUpload}
                description={t(
                  'form.uploads.driver_license_desc',
                  "Upload a clear photo of the driver's license",
                )}
                currentFile={customer?.driversLicenseFile?.url} // preview shows
                disabled={isSubmitting || mutation.isPending}
              />
            </div>
          </div>

          {/* Save */}
          <div className="text-right pt-2">
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {isSubmitting || mutation.isPending ? (
                <Loader className="animate-spin mr-2" />
              ) : null}
              {t('edit.actions.save', 'Save Changes')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
