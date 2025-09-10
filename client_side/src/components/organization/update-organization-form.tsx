'use client';

import { useEffect, useState } from 'react';
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

import { File } from '../../api/files';
import {
  Organization,
  updateOrganization,
  UpdateOrganizationDto,
} from '@/api/organization';
import { Building2, Save, XCircle } from 'lucide-react';

const schema = z.object({
  name: z.string().min(2, 'Organization name is too short'),
  email: z.string().email().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
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
  const [isUploading, setIsUploading] = useState(false);

  // Store file IDs instead of URLs
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
    },
  });

  const mutation = useMutation({
    mutationFn: (data: UpdateOrganizationDto) =>
      updateOrganization(organization.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization', 'user'] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast({
        title: 'Saved',
        type: 'success',
        description: 'Organization updated successfully.',
      });
      onSuccess?.();
    },
    onError: (err) => {
      console.error(err);
      toast({
        title: 'Update failed',
        type: 'error',
        description: 'Please review fields and try again.',
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
    };

    // Only include file IDs if they've been updated
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

  // Helper function to get file URL from file ID
  const getFileUrl = (fileId?: string) => {
    return fileId ? `/api/v1/files/${fileId}/serve` : undefined;
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
                    src={getFileUrl(organization.imageFileId)}
                    alt="Logo"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Building2 className="h-8 w-8 text-gray-9" />
                )}
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-semibold leading-tight">
                  Edit Organization
                </h1>
                <p className="text-sm text-muted-foreground">
                  Update details and legal documents
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
                Cancel
              </Button>
              <Button
                onClick={handleSubmit(onSubmit)}
                className="gap-2"
                disabled={isSubmitting || isUploading}
              >
                {isSubmitting ? (
                  <>
                    <Loader />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
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
                  Organization Name <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Your company name"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-xs text-red-500">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Contact Email</Label>
                <Input
                  id="email"
                  placeholder="contact@company.com"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-xs text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  placeholder="https://company.com"
                  {...register('website')}
                />
                {errors.website && (
                  <p className="text-xs text-red-500">
                    {errors.website.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  placeholder="+1 555 0100"
                  {...register('phone')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  placeholder="123 Market St, City, Country"
                  {...register('address')}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-border">
            <CardContent className="p-6 space-y-3">
              <div>
                <h3 className="font-medium">Organization Logo</h3>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, WEBP. Square images look best.
                </p>
              </div>
              <UploadComponent
                currentImage={getFileUrl(organization.imageFileId)}
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
                  <span className="text-xl">⚖️</span> Legal Documents
                </h3>
                <p className="text-sm text-muted-foreground">
                  All required documents consolidated here.
                </p>
              </div>

              {/* Core legal */}
              <FileUploader
                label="RC (Registre de Commerce)"
                accept=".pdf"
                folder="organizations/legal"
                currentFile={getFileUrl(organization.rcFileId)}
                onUploadProgress={onUploadProgress}
                onUploadSuccess={(file) => setRcFileId(file.id)}
                description="Official commercial register document (PDF)."
              />

              <FileUploader
                label="Status"
                accept=".pdf"
                folder="organizations/legal"
                currentFile={getFileUrl(organization.statusFileId)}
                onUploadProgress={onUploadProgress}
                onUploadSuccess={(file) => setStatusFileId(file.id)}
                description="Company status document (PDF)."
              />

              <FileUploader
                label="Decision"
                accept=".pdf"
                folder="organizations/legal"
                currentFile={getFileUrl(organization.decisionFileId)}
                onUploadProgress={onUploadProgress}
                onUploadSuccess={(file) => setDecisionFileId(file.id)}
                description="Company decision document (PDF)."
              />

              <FileUploader
                label="CEO ID Card"
                accept=".jpg,.jpeg,.png,.webp"
                folder="organizations/identity"
                currentFile={getFileUrl(organization.ceoIdCardFileId)}
                onUploadProgress={onUploadProgress}
                onUploadSuccess={(file) => setCeoIdCardFileId(file.id)}
                description="Clear photo/scan of the CEO's ID card."
              />

              {/* Fleet items */}
              <FileUploader
                label="Fleet List"
                accept=".pdf"
                folder="organizations/fleet"
                currentFile={getFileUrl(organization.fleetListFileId)}
                onUploadProgress={onUploadProgress}
                onUploadSuccess={(file) => setFleetListFileId(file.id)}
                description="Complete fleet inventory (PDF)."
              />

              <FileUploader
                label="Model G"
                accept=".pdf"
                folder="organizations/fleet"
                currentFile={getFileUrl(organization.modelGFileId)}
                onUploadProgress={onUploadProgress}
                onUploadSuccess={(file) => setModelGFileId(file.id)}
                description="Model G document (PDF)."
              />

              {/* Financial items */}
              <FileUploader
                label="Identifiant Fiscale"
                accept=".pdf"
                folder="organizations/financial"
                currentFile={getFileUrl(organization.identifiantFiscaleFileId)}
                onUploadProgress={onUploadProgress}
                onUploadSuccess={(file) => setIdentifiantFiscaleFileId(file.id)}
                description="Tax identification document (PDF)."
              />

              <FileUploader
                label="Bilan"
                accept=".pdf"
                folder="organizations/financial"
                currentFile={getFileUrl(organization.bilanFileId)}
                onUploadProgress={onUploadProgress}
                onUploadSuccess={(file) => setBilanFileId(file.id)}
                description="Financial balance sheet (PDF)."
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
              Cancel
            </Button>
            <Button
              onClick={handleSubmit(onSubmit)}
              className="gap-2"
              disabled={isSubmitting || isUploading}
            >
              {isSubmitting ? (
                <>
                  <Loader />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
