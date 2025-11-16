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
import { Plus, Loader, Upload, CheckCircle2, XCircle } from 'lucide-react';
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
import { useTranslation } from 'react-i18next';
import { File as ApiFile } from '@/api/files';
import { api } from '@/api/api';
import { FileUploaderStyled } from './file-uploader-styled';

const schema = z.object({
  firstName: z.string().min(2, 'form.errors.first_required'),
  lastName: z.string().min(2, 'form.errors.last_required'),
  email: z
    .string()
    .email('form.errors.email_invalid')
    .optional()
    .or(z.literal('')),
  phone: z.string().min(6, 'form.errors.phone_required'),
  address: z.string().min(2, 'form.errors.address_required'),
  documentId: z.string().min(2, 'form.errors.doc_id_required'),
  documentType: z.enum(['passport', 'id_card'], {
    required_error: 'form.errors.doc_type_required',
  }),
  driversLicense: z.string().min(2, 'form.errors.driver_license_required'), // separate text number
  idCardId: z.string().optional(),
  driversLicenseId: z.string().optional(),
});

type FormFields = z.infer<typeof schema>;

export function AddClientDialog({ trigger }: { trigger?: React.ReactNode }) {
  const { t } = useTranslation('client');
  const [isOpen, setIsOpen] = useState(false);
  const [idCardFile, setIdCardFile] = useState<ApiFile | null>(null);
  const [driversLicenseFile, setDriversLicenseFile] = useState<ApiFile | null>(
    null,
  );

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setIsOpen(false);
      reset();
      setIdCardFile(null);
      setDriversLicenseFile(null);
      toast({
        type: 'success',
        title: t('form.toasts.success_title', 'Success!'),
        description: t(
          'form.toasts.success_desc',
          'Client has been added successfully.',
        ),
      });
    },
    onError: (error: any) => {
      const errorMessage = Array.isArray(error?.response?.data?.message)
        ? error.response.data.message.join(', ')
        : error?.response?.data?.message ||
          t('form.toasts.add_failed', 'Failed to add client.');

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

  const onSubmit = (data: FormFields) => {
    const payload = {
      ...data,
      idCardId: idCardFile?.id,
      driversLicenseId: driversLicenseFile?.id,
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
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          reset();
          setIdCardFile(null);
          setDriversLicenseFile(null);
        }
      }}
    >
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button variant="default">
            <Plus size={20} /> {t('form.actions.add_client', 'Add Client')}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[520px] pt-8 max-h-[80vh] overflow-y-auto">
        <DialogTitle className="pb-1 hidden sm:block">
          {t('form.title', 'Add a new Client')}
        </DialogTitle>
        <p className="text-sm text-muted-foreground hidden sm:block">
          {t(
            'form.subtitle',
            'Fill out the form below to add a new client to the system.',
          )}
        </p>
        <Separator className="mb-2 hidden sm:block" />

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('form.labels.first', 'First Name')} *</Label>
              <Input
                {...register('firstName')}
                placeholder={t('form.placeholders.first', 'e.g. John')}
              />
              {errors.firstName && (
                <span className="text-red-500 text-xs">
                  {t(errors.firstName.message as string)}
                </span>
              )}
            </div>
            <div>
              <Label>{t('form.labels.last', 'Last Name')} *</Label>
              <Input
                {...register('lastName')}
                placeholder={t('form.placeholders.last', 'e.g. Doe')}
              />
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
            <Input
              {...register('email')}
              placeholder={t(
                'form.placeholders.email',
                'e.g. john@example.com',
              )}
            />
            {errors.email && (
              <span className="text-red-500 text-xs">
                {t(errors.email.message as string)}
              </span>
            )}
          </div>

          {/* Phone + Address */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('form.labels.phone', 'Phone')} *</Label>
              <Input
                {...register('phone')}
                placeholder={t('form.placeholders.phone', 'e.g. 0612345678')}
              />
              {errors.phone && (
                <span className="text-red-500 text-xs">
                  {t(errors.phone.message as string)}
                </span>
              )}
            </div>
            <div>
              <Label>{t('form.labels.address', 'Address')} *</Label>
              <Input
                {...register('address')}
                placeholder={t('form.placeholders.address', 'e.g. 123 Main St')}
              />
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
              <Input
                {...register('documentId')}
                placeholder={t('form.placeholders.doc_id', 'e.g. TA123456')}
              />
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
            {errors.driversLicense && (
              <span className="text-red-500 text-xs">
                {t(errors.driversLicense.message as string)}
              </span>
            )}
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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Save */}
          <div className="text-right pt-2">
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
