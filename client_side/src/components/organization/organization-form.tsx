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
import { FileUploader } from '../file-uploader';

const schema = z.object({
  orgName: z.string().nonempty("Organization's name is required").min(2),
});

type FormFields = z.infer<typeof schema>;

export function OrgForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'div'>) {
  const [name, setName] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const createOrganization = async (formData: FormData) => {
    const response = await api.post('/organization', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  };

  const mutation = useMutation({
    mutationFn: createOrganization,
    onSuccess: () => {
      //queryClient.invalidateQueries(['organizations']);
      alert('Organization created successfully!');
    },
    onError: (error) => {
      console.error('Error:', error);
      alert('Failed to create organization.');
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

  const onSubmit = (data: FormFields) => {
    if (!data.orgName) {
      alert('Organization name is required');
      return;
    }

    const formData = new FormData();
    formData.append('name', data.orgName);
    if (image) {
      formData.append('file', image);
    }

    mutation.mutate(formData);
    navigate({ to: '/dashboard' });
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
                <FileUploader onFileSelect={(file) => setImage(file)} />
              </div>
              <Button type="submit" className="w-full">
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
