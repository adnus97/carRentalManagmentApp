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
import { Link, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader } from '@/components/loader';
import { toast } from '@/hooks/use-toast';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../../api/api';
import { createOrganization } from '../../api/organization';
import { IKContext } from 'imagekitio-react';
import { UploadComponent } from '../image-uploader';

const schema = z.object({
  orgName: z.string().nonempty("Organization's name is required").min(2),
});

type FormFields = z.infer<typeof schema>;
// Define the ImageKit response type
interface ImageUploadResponse {
  fileId: string;
  filePath: string;
  fileType: string;
  height: number;
  name: string;
  size: number;
  thumbnailUrl: string;
  url: string;
  width: number;
}

export function OrgForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'div'>) {
  const [uploadedImage, setUploadedImage] =
    useState<ImageUploadResponse | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);

  const mutation = useMutation({
    mutationFn: createOrganization,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast({
        title: 'Success',
        description: 'Organization created successfully!',
      });
      navigate({ to: '/dashboard' });
    },
    onError: (error) => {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'Failed to create organization.',
        variant: 'destructive',
      });
    },
  });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormFields>({
    resolver: zodResolver(schema),
  });

  const handleImageUpload = (imageData: ImageUploadResponse) => {
    setUploadedImage(imageData);
    toast({
      title: 'Image uploaded',
      description: 'Logo uploaded successfully!',
    });
  };
  const onSubmit = (data: FormFields) => {
    if (!data.orgName) {
      alert('Organization name is required');
      return;
    }
    mutation.mutate({
      name: data.orgName,
      image: uploadedImage?.url,
    });
  };

  const handleUploadProgress = (uploading: boolean) => {
    console.log('Parent Component - Uploading Status:', uploading);
    setIsUploading(uploading);
  };
  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Organization</CardTitle>
          <CardDescription>Create your organization</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-6">
              <div className="flex flex-col gap-4">
                <Label htmlFor="orgName" className="text-justify">
                  Organization Name
                </Label>
                <Input
                  id="orgName"
                  type="text"
                  placeholder="Your Organization Name..."
                  {...register('orgName')}
                />
                {errors.orgName && (
                  <span className="text-red-600 text-xs">
                    {errors.orgName.message}
                  </span>
                )}
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="orgImg">Organization Logo</Label>
                </div>
                <UploadComponent
                  onUploadSuccess={handleImageUpload}
                  onUploadProgress={handleUploadProgress}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isUploading}>
                {isSubmitting ? (
                  <>
                    <Loader />
                    <span>Please wait...</span>
                  </>
                ) : (
                  'Create Organization'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
