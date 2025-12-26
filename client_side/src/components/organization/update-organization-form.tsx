'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';
import { Loader } from '@/components/loader';

import { UploadComponent } from '@/components/image-uploader';
import { FileUploader } from '@/components/file-uploader';

import { getFileServeUrl } from '../../api/files';
import {
  Organization,
  updateOrganization,
  UpdateOrganizationDto,
} from '@/api/organization';
import { Building2, Save, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const schema = z.object({
  name: z.string().min(2, 'org.form.errors.name_short'),
  email: z.string().email().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),

  rcNumber: z.string().optional().or(z.literal('')),
  cnssNumber: z.string().optional().or(z.literal('')),
  iceNumber: z.string().optional().or(z.literal('')),
});

type FormFields = z.infer<typeof schema>;

interface Props {
  organization: Organization;
  onCancel?: () => void;
  onSuccess?: () => void;
}

export function UpdateOrganizationForm({
  organization,
  onCancel,
  onSuccess,
}: Props) {
  const { t } = useTranslation('organization');
  const [isUploading, setIsUploading] = useState(false);

  const [logoFileId, setLogoFileId] = useState<string | undefined>();
  const [rcFileId, setRcFileId] = useState<string | undefined>();
  const [statusFileId, setStatusFileId] = useState<string | undefined>();
  const [decisionFileId, setDecisionFileId] = useState<string | undefined>();
  const [ceoIdCardFileId, setCeoIdCardFileId] = useState<string | undefined>();
  const [fleetListFileId, setFleetListFileId] = useState<string | undefined>();
  const [modelGFileId, setModelGFileId] = useState<string | undefined>();
  const [identifiantFiscaleFileId, setIdentifiantFiscaleFileId] = useState<
    string | undefined
  >();
  const [bilanFileId, setBilanFileId] = useState<string | undefined>();

  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormFields>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: organization.name,
      email: organization.email || '',
      website: organization.website || '',
      phone: organization.phone || '',
      address: organization.address || '',

      rcNumber: organization.rcNumber || '',
      cnssNumber: organization.cnssNumber || '',
      iceNumber: organization.iceNumber || '',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: UpdateOrganizationDto) =>
      updateOrganization(organization.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization', 'user'] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast({
        title: t('org.update.saved', 'Saved'),
        type: 'success',
        description: t(
          'org.update.success_desc',
          'Organization updated successfully.',
        ),
      });
      onSuccess?.();
    },
    onError: (err) => {
      console.error(err);
      toast({
        title: t('org.update.error_title', 'Update failed'),
        type: 'error',
        description: t(
          'org.update.error_desc',
          'Please review fields and try again.',
        ),
      });
    },
  });

  const onUploadProgress = (v: boolean) => setIsUploading(v);

  const onSubmit = (values: FormFields) => {
    const payload: UpdateOrganizationDto = {
      name: values.name.trim(),
      email: values.email?.trim() || undefined,
      website: values.website?.trim() || undefined,
      phone: values.phone?.trim() || undefined,
      address: values.address?.trim() || undefined,

      rcNumber: values.rcNumber?.trim() || '',
      cnssNumber: values.cnssNumber?.trim() || '',
      iceNumber: values.iceNumber?.trim() || '',
    };

    if (logoFileId) payload.imageFileId = logoFileId;
    if (rcFileId) payload.rcFileId = rcFileId;
    if (statusFileId) payload.statusFileId = statusFileId;
    if (decisionFileId) payload.decisionFileId = decisionFileId;
    if (ceoIdCardFileId) payload.ceoIdCardFileId = ceoIdCardFileId;
    if (fleetListFileId) payload.fleetListFileId = fleetListFileId;
    if (modelGFileId) payload.modelGFileId = modelGFileId;
    if (identifiantFiscaleFileId)
      payload.identifiantFiscaleFileId = identifiantFiscaleFileId;
    if (bilanFileId) payload.bilanFileId = bilanFileId;

    mutation.mutate(payload);
  };

  const getCurrentFileUrl = (fileId?: string): string | undefined => {
    return fileId ? getFileServeUrl(fileId) : undefined;
  };

  return (
    <div className="mx-auto w-full max-w-6xl">
      {/* Premium header */}
      <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white text-gray-900 shadow-sm dark:border-border dark:bg-gradient-to-b dark:from-gray-950 dark:to-gray-900 dark:text-gray-100 dark:shadow-lg">
        <div className="pointer-events-none absolute -right-16 -top-16 hidden h-48 w-48 rounded-full bg-red-500/10 blur-3xl dark:block" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 hidden h-56 w-56 rounded-full bg-amber-400/10 blur-3xl dark:block" />

        <div className="relative p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 overflow-hidden rounded-xl border bg-white dark:bg-gray-950 flex items-center justify-center">
                {organization.imageFileId ? (
                  <img
                    src={getCurrentFileUrl(organization.imageFileId)}
                    alt={t('org.logo.alt', 'Logo')}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      const parent = target.parentElement;
                      if (parent) {
                        target.style.display = 'none';
                        const fallback = document.createElement('div');
                        fallback.className =
                          'h-8 w-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center text-white text-sm font-bold';
                        fallback.textContent = (organization?.name || '?')
                          .charAt(0)
                          .toUpperCase();
                        parent.appendChild(fallback);
                      }
                    }}
                  />
                ) : (
                  <Building2 className="h-8 w-8 text-gray-500" />
                )}
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-semibold leading-tight">
                  {t('org.update.title', 'Edit Organization')}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {t(
                    'org.update.subtitle',
                    'Update details and legal documents',
                  )}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onCancel}
                className="gap-2"
                disabled={isSubmitting || isUploading}
              >
                <XCircle className="h-4 w-4" />
                {t('clients.actions.cancel', 'Cancel')}
              </Button>
              <Button
                onClick={handleSubmit(onSubmit)}
                className="gap-2"
                disabled={isSubmitting || isUploading}
              >
                {isSubmitting ? (
                  <>
                    <Loader />
                    {t('org.update.saving', 'Saving...')}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {t('org.update.save_changes', 'Save Changes')}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Info + Logo */}
        <div className="col-span-1 space-y-6">
          <Card className="border-gray-200 dark:border-border">
            <CardContent className="p-6 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">
                  {t('org.form.name', 'Organization Name')}{' '}
                  <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder={t('org.form.name_ph', 'Your company name')}
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-xs text-red-500">
                    {t(errors.name.message as string)}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">
                  {t('org.details.website', 'Website')}
                </Label>
                <Input
                  id="website"
                  placeholder={t('org.form.website_ph', 'https://company.com')}
                  {...register('website')}
                />
                {errors.website && (
                  <p className="text-xs text-red-500">
                    {t(errors.website.message as string)}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{t('org.details.phone', 'Phone')}</Label>
                <Input
                  id="phone"
                  placeholder={t('org.form.phone_ph', '+1 555 0100')}
                  {...register('phone')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">
                  {t('org.details.address', 'Address')}
                </Label>
                <Input
                  id="address"
                  placeholder={t(
                    'org.form.address_ph',
                    '123 Market St, City, Country',
                  )}
                  {...register('address')}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rcNumber">{t('org.details.rc', 'RC')}</Label>
                  <Input
                    id="rcNumber"
                    placeholder={t('org.form.rc_ph', 'RC number')}
                    {...register('rcNumber')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cnssNumber">
                    {t('org.details.cnss', 'CNSS')}
                  </Label>
                  <Input
                    id="cnssNumber"
                    placeholder={t('org.form.cnss_ph', 'CNSS number')}
                    {...register('cnssNumber')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="iceNumber">
                    {t('org.details.ice', 'ICE')}
                  </Label>
                  <Input
                    id="iceNumber"
                    placeholder={t('org.form.ice_ph', 'ICE number')}
                    {...register('iceNumber')}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-border">
            <CardContent className="p-6 space-y-3">
              <div>
                <h3 className="font-medium">
                  {t('org.logo.title', 'Organization Logo')}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {t(
                    'org.logo.subtitle',
                    'PNG, JPG, WEBP. Square images look best.',
                  )}
                </p>
              </div>
              <UploadComponent
                currentImage={getCurrentFileUrl(organization.imageFileId)}
                onUploadProgress={onUploadProgress}
                onUploadSuccess={(file) => setLogoFileId(file.id)}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right: Single Legal Documents section with ALL items */}
        <div className="col-span-1 lg:col-span-2">
          <Card className="border-gray-200 dark:border-border">
            <CardContent className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <span className="text-xl">⚖️</span>{' '}
                  {t('org.docs.title', 'Legal Documents')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t(
                    'org.update.docs_subtitle',
                    'All required documents consolidated here.',
                  )}
                </p>
              </div>

              {/* Core legal */}
              <FileUploader
                label={t('org.docs.rc', 'RC (Registre de Commerce)')}
                accept=".pdf"
                folder="organizations/legal"
                currentFile={getCurrentFileUrl(organization.rcFileId)}
                onUploadProgress={onUploadProgress}
                onUploadSuccess={(file) => setRcFileId(file.id)}
                description={t(
                  'org.form.rc_desc',
                  'Official commercial register document (PDF).',
                )}
              />

              <FileUploader
                label={t('org.docs.status', 'Status')}
                accept=".pdf"
                folder="organizations/legal"
                currentFile={getCurrentFileUrl(organization.statusFileId)}
                onUploadProgress={onUploadProgress}
                onUploadSuccess={(file) => setStatusFileId(file.id)}
                description={t(
                  'org.form.status_desc',
                  'Company status document (PDF).',
                )}
              />

              <FileUploader
                label={t('org.docs.decision', 'Decision')}
                accept=".pdf"
                folder="organizations/legal"
                currentFile={getCurrentFileUrl(organization.decisionFileId)}
                onUploadProgress={onUploadProgress}
                onUploadSuccess={(file) => setDecisionFileId(file.id)}
                description={t(
                  'org.form.decision_desc',
                  'Company decision document (PDF).',
                )}
              />

              <FileUploader
                label={t('org.docs.ceo_id', 'CEO ID Card')}
                accept=".jpg,.jpeg,.png,.webp"
                folder="organizations/identity"
                currentFile={getCurrentFileUrl(organization.ceoIdCardFileId)}
                onUploadProgress={onUploadProgress}
                onUploadSuccess={(file) => setCeoIdCardFileId(file.id)}
                description={t(
                  'org.form.ceo_id_desc',
                  "Clear photo/scan of the CEO's ID card.",
                )}
              />

              {/* Fleet items */}
              <FileUploader
                label={t('org.docs.fleet', 'Fleet List')}
                accept=".pdf"
                folder="organizations/fleet"
                currentFile={getCurrentFileUrl(organization.fleetListFileId)}
                onUploadProgress={onUploadProgress}
                onUploadSuccess={(file) => setFleetListFileId(file.id)}
                description={t(
                  'org.form.fleet_desc',
                  'Complete fleet inventory (PDF).',
                )}
              />

              <FileUploader
                label={t('org.docs.model_g', 'Model G')}
                accept=".pdf"
                folder="organizations/fleet"
                currentFile={getCurrentFileUrl(organization.modelGFileId)}
                onUploadProgress={onUploadProgress}
                onUploadSuccess={(file) => setModelGFileId(file.id)}
                description={t(
                  'org.form.model_g_desc',
                  'Model G document (PDF).',
                )}
              />

              {/* Financial items */}
              <FileUploader
                label={t('org.docs.tax_id', 'Identifiant Fiscale')}
                accept=".pdf"
                folder="organizations/financial"
                currentFile={getCurrentFileUrl(
                  organization.identifiantFiscaleFileId,
                )}
                onUploadProgress={onUploadProgress}
                onUploadSuccess={(file) => setIdentifiantFiscaleFileId(file.id)}
                description={t(
                  'org.form.tax_id_desc',
                  'Tax identification document (PDF).',
                )}
              />

              <FileUploader
                label={t('org.docs.bilan', 'Bilan')}
                accept=".pdf"
                folder="organizations/financial"
                currentFile={getCurrentFileUrl(organization.bilanFileId)}
                onUploadProgress={onUploadProgress}
                onUploadSuccess={(file) => setBilanFileId(file.id)}
                description={t(
                  'org.form.bilan_desc',
                  'Financial balance sheet (PDF).',
                )}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sticky footer actions */}
      <div className="sticky bottom-4 mt-6 flex justify-end">
        <div className="rounded-xl border border-gray-200 bg-white/80 backdrop-blur px-2 py-2 shadow-sm dark:border-border dark:bg-gray-900/60">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onCancel}
              className="gap-2"
              disabled={isSubmitting || isUploading}
            >
              <XCircle className="h-4 w-4" />
              {t('clients.actions.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={handleSubmit(onSubmit)}
              className="gap-2"
              disabled={isSubmitting || isUploading}
            >
              {isSubmitting ? (
                <>
                  <Loader />
                  {t('org.update.saving', 'Saving...')}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {t('org.update.save_changes', 'Save Changes')}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
