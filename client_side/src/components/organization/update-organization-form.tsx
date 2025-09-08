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

import { Organization, updateOrganization } from '@/api/organization';
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

  // New uploads override existing URLs if provided
  const [logoUrl, setLogoUrl] = useState<string | undefined>();

  const [rcUrl, setRcUrl] = useState<string | undefined>();
  const [statusUrl, setStatusUrl] = useState<string | undefined>();
  const [decisionUrl, setDecisionUrl] = useState<string | undefined>();
  const [ceoIdUrl, setCeoIdUrl] = useState<string | undefined>();

  const [fleetListUrl, setFleetListUrl] = useState<string | undefined>();
  const [modelGUrl, setModelGUrl] = useState<string | undefined>();

  const [idfUrl, setIdfUrl] = useState<string | undefined>();
  const [bilanUrl, setBilanUrl] = useState<string | undefined>();

  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormFields>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: organization.name,
      email: '',
      website: '',
      phone: '',
      address: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: Partial<Organization>) =>
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
    const payload: Partial<Organization> = {
      name: values.name.trim(),
      image: logoUrl ?? organization.image,

      // All items live under "Legal Documents"
      rc: rcUrl ?? organization.rc,
      status: statusUrl ?? organization.status,
      decision: decisionUrl ?? organization.decision,
      ceoIdCard: ceoIdUrl ?? organization.ceoIdCard,

      fleetList: fleetListUrl ?? organization.fleetList,
      modelG: modelGUrl ?? organization.modelG,

      identifiantFiscale: idfUrl ?? organization.identifiantFiscale,
      bilan: bilanUrl ?? organization.bilan,
    };

    mutation.mutate(payload);
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
                {organization.image ? (
                  <img
                    src={organization.image}
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
                currentImage={organization.image}
                onUploadProgress={onUploadProgress}
                onUploadSuccess={(img) => setLogoUrl(img.url)}
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
                currentFile={organization.rc}
                onUploadProgress={onUploadProgress}
                onUploadSuccess={(f) => setRcUrl(f.url)}
                description="Official commercial register document (PDF)."
              />
              <FileUploader
                label="Status"
                accept=".pdf"
                folder="organizations/legal"
                currentFile={organization.status}
                onUploadProgress={onUploadProgress}
                onUploadSuccess={(f) => setStatusUrl(f.url)}
                description="Company status document (PDF)."
              />
              <FileUploader
                label="Decision"
                accept=".pdf"
                folder="organizations/legal"
                currentFile={organization.decision}
                onUploadProgress={onUploadProgress}
                onUploadSuccess={(f) => setDecisionUrl(f.url)}
                description="Company decision document (PDF)."
              />
              <FileUploader
                label="CEO ID Card"
                accept=".jpg,.jpeg,.png,.webp"
                folder="organizations/identity"
                currentFile={organization.ceoIdCard}
                onUploadProgress={onUploadProgress}
                onUploadSuccess={(f) => setCeoIdUrl(f.url)}
                description="Clear photo/scan of the CEO's ID card."
              />

              {/* Fleet items (still in Legal section by your request) */}
              <FileUploader
                label="Fleet List"
                accept=".pdf"
                folder="organizations/fleet"
                currentFile={organization.fleetList}
                onUploadProgress={onUploadProgress}
                onUploadSuccess={(f) => setFleetListUrl(f.url)}
                description="Complete fleet inventory (PDF)."
              />
              <FileUploader
                label="Model G"
                accept=".pdf"
                folder="organizations/fleet"
                currentFile={organization.modelG}
                onUploadProgress={onUploadProgress}
                onUploadSuccess={(f) => setModelGUrl(f.url)}
                description="Model G document (PDF)."
              />

              {/* Financial items (still in Legal section by your request) */}
              <FileUploader
                label="Identifiant Fiscale"
                accept=".pdf"
                folder="organizations/financial"
                currentFile={organization.identifiantFiscale}
                onUploadProgress={onUploadProgress}
                onUploadSuccess={(f) => setIdfUrl(f.url)}
                description="Tax identification document (PDF)."
              />
              <FileUploader
                label="Bilan"
                accept=".pdf"
                folder="organizations/financial"
                currentFile={organization.bilan}
                onUploadProgress={onUploadProgress}
                onUploadSuccess={(f) => setBilanUrl(f.url)}
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
