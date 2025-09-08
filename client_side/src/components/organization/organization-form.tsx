'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader } from '@/components/loader';
import { toast } from '@/components/ui/toast';

import { createOrganization } from '@/api/organization';
import { UploadComponent } from '@/components/image-uploader';
import { FileUploader } from '@/components/file-uploader';

const schema = z.object({
  name: z
    .string()
    .min(2, 'Organization name must be at least 2 characters')
    .max(100, 'Organization name is too long'),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  website: z
    .string()
    .url('Enter a valid URL (https://...)')
    .optional()
    .or(z.literal('')),
  phone: z.string().max(30).optional().or(z.literal('')),
  address: z.string().max(200).optional().or(z.literal('')),
});

type FormFields = z.infer<typeof schema>;

interface Props {
  className?: string;
}

export function OrganizationForm({ className }: Props) {
  // Upload states (hold only the final URLs we’ll send to the API)
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);

  const [rcUrl, setRcUrl] = useState<string | undefined>(undefined);
  const [statusUrl, setStatusUrl] = useState<string | undefined>(undefined);
  const [decisionUrl, setDecisionUrl] = useState<string | undefined>(undefined);
  const [ceoIdCardUrl, setCeoIdCardUrl] = useState<string | undefined>(
    undefined,
  );

  const [fleetListUrl, setFleetListUrl] = useState<string | undefined>(
    undefined,
  );
  const [modelGUrl, setModelGUrl] = useState<string | undefined>(undefined);

  const [identifiantFiscaleUrl, setIdentifiantFiscaleUrl] = useState<
    string | undefined
  >(undefined);
  const [bilanUrl, setBilanUrl] = useState<string | undefined>(undefined);

  const [isUploading, setIsUploading] = useState(false);

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormFields>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      email: '',
      website: '',
      phone: '',
      address: '',
    },
  });

  const mutation = useMutation({
    mutationFn: createOrganization,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast({
        title: 'Success',
        type: 'success',
        description: 'Organization created successfully!',
      });
      navigate({ to: '/dashboard' });
    },
    onError: (error) => {
      console.error('Create organization failed:', error);
      toast({
        title: 'Error',
        type: 'error',
        description:
          'Failed to create organization. Please verify your inputs and try again.',
      });
    },
  });

  const onUploadProgress = (uploading: boolean) => setIsUploading(uploading);

  const onSubmit = async (values: FormFields) => {
    if (!logoUrl) {
      toast({
        title: 'Logo required',
        type: 'error',
        description: 'Please upload your organization logo.',
      });
      return;
    }

    mutation.mutate({
      name: values.name.trim(),
      image: logoUrl,
      // Optional metadata fields could be saved in your backend if desired
      // email: values.email || undefined,
      // website: values.website || undefined,
      // phone: values.phone || undefined,
      // address: values.address || undefined,

      // Documents
      rc: rcUrl,
      status: statusUrl,
      decision: decisionUrl,
      ceoIdCard: ceoIdCardUrl,

      fleetList: fleetListUrl,
      modelG: modelGUrl,

      identifiantFiscale: identifiantFiscaleUrl,
      bilan: bilanUrl,
    });
  };

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <Card className="bg-gray-2">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create Organization</CardTitle>
          <CardDescription>
            Fill in your details and upload required documents
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* Basic Info */}
          <section className="grid gap-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">
                  Organization Name <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Acme Logistics"
                  {...register('name')}
                />
                {errors.name && (
                  <span className="text-xs text-red-600">
                    {errors.name.message}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Contact Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="contact@acme.com"
                  {...register('email')}
                />
                {errors.email && (
                  <span className="text-xs text-red-600">
                    {errors.email.message}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  placeholder="https://acme.com"
                  {...register('website')}
                />
                {errors.website && (
                  <span className="text-xs text-red-600">
                    {errors.website.message}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  placeholder="+1 555 0100"
                  {...register('phone')}
                />
                {errors.phone && (
                  <span className="text-xs text-red-600">
                    {errors.phone.message}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                placeholder="123 Market St, City, Country"
                {...register('address')}
              />
              {errors.address && (
                <span className="text-xs text-red-600">
                  {errors.address.message}
                </span>
              )}
            </div>
          </section>

          {/* Logo */}
          <section className="grid gap-3">
            <Label>Organization Logo</Label>
            <p className="text-xs text-muted-foreground -mt-2">
              PNG, JPG, or WEBP. Square images look best.
            </p>
            <UploadComponent
              currentImage={logoUrl}
              onUploadProgress={onUploadProgress}
              onUploadSuccess={(img) => setLogoUrl(img.url)}
            />
            {!logoUrl && (
              <span className="text-xs text-amber-700">
                A logo is required to proceed.
              </span>
            )}
          </section>

          {/* Documents */}
          <section>
            <Tabs defaultValue="legal" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="legal">Legal</TabsTrigger>
                <TabsTrigger value="fleet">Fleet</TabsTrigger>
                <TabsTrigger value="financial">Financial</TabsTrigger>
              </TabsList>

              {/* Legal */}
              <TabsContent value="legal" className="space-y-4 pt-4">
                <FileUploader
                  label="RC (Registre de Commerce)"
                  accept=".pdf"
                  folder="organizations/legal"
                  onUploadProgress={onUploadProgress}
                  onUploadSuccess={(f) => setRcUrl(f.url)}
                  required
                  description="Official commercial register document (PDF)."
                />
                <FileUploader
                  label="Status"
                  accept=".pdf"
                  folder="organizations/legal"
                  onUploadProgress={onUploadProgress}
                  onUploadSuccess={(f) => setStatusUrl(f.url)}
                  required
                  description="Company status document (PDF)."
                />
                <FileUploader
                  label="Decision"
                  accept=".pdf"
                  folder="organizations/legal"
                  onUploadProgress={onUploadProgress}
                  onUploadSuccess={(f) => setDecisionUrl(f.url)}
                  required
                  description="Company decision document (PDF)."
                />
                <FileUploader
                  label="CEO ID Card"
                  accept=".jpg,.jpeg,.png,.webp"
                  folder="organizations/identity"
                  onUploadProgress={onUploadProgress}
                  onUploadSuccess={(f) => setCeoIdCardUrl(f.url)}
                  required
                  description="Upload a clear image of the CEO's ID card."
                />
              </TabsContent>

              {/* Fleet */}
              <TabsContent value="fleet" className="space-y-4 pt-4">
                <FileUploader
                  label="Fleet List"
                  accept=".pdf"
                  folder="organizations/fleet"
                  onUploadProgress={onUploadProgress}
                  onUploadSuccess={(f) => setFleetListUrl(f.url)}
                  required
                  description="Complete list of vehicles (PDF)."
                />
                <FileUploader
                  label="Model G"
                  accept=".pdf"
                  folder="organizations/fleet"
                  onUploadProgress={onUploadProgress}
                  onUploadSuccess={(f) => setModelGUrl(f.url)}
                  required
                  description="Model G document (PDF)."
                />
              </TabsContent>

              {/* Financial */}
              <TabsContent value="financial" className="space-y-4 pt-4">
                <FileUploader
                  label="Identifiant Fiscale"
                  accept=".pdf"
                  folder="organizations/financial"
                  onUploadProgress={onUploadProgress}
                  onUploadSuccess={(f) => setIdentifiantFiscaleUrl(f.url)}
                  required
                  description="Tax identification document (PDF)."
                />
                <FileUploader
                  label="Bilan"
                  accept=".pdf"
                  folder="organizations/financial"
                  onUploadProgress={onUploadProgress}
                  onUploadSuccess={(f) => setBilanUrl(f.url)}
                  required
                  description="Financial balance sheet (PDF)."
                />
              </TabsContent>
            </Tabs>
          </section>

          {/* Actions */}
          <section className="flex flex-col gap-3">
            <Button
              onClick={handleSubmit(onSubmit)}
              className="w-full"
              disabled={isUploading || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader />
                  <span>Creating...</span>
                </>
              ) : (
                'Create Organization'
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              By continuing, you confirm that the provided documents are
              accurate and up to date.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
