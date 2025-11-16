'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { blacklistCustomer } from '@/api/customers';
import { toast } from '@/components/ui/toast';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { DialogDescription } from '@radix-ui/react-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const schema = z.object({
  reason: z.string().min(3, 'blacklist.errors.reason_min'),
});

type FormFields = z.infer<typeof schema>;

export function BlacklistDialog({
  customerId,
  onSuccess,
}: {
  customerId: string;
  onSuccess?: () => void;
}) {
  const { t } = useTranslation('client');
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: { reason: string }) =>
      blacklistCustomer(customerId, { reason: data.reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'], exact: false });
      setIsOpen(false);
      reset();
      toast({
        type: 'success',
        title: t(
          'blacklist.dialog.toasts.success_title',
          'Customer Blacklisted',
        ),
        description: t(
          'blacklist.dialog.toasts.success_desc',
          'The customer has been successfully blacklisted.',
        ),
      });
      if (onSuccess) onSuccess();
    },
    onError: () => {
      toast({
        type: 'error',
        title: t('blacklist.dialog.toasts.error_title', 'Error'),
        description: t(
          'blacklist.dialog.toasts.error_desc',
          'Failed to blacklist customer.',
        ),
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
    defaultValues: { reason: '' },
  });

  const onSubmit = (data: FormFields) => {
    mutation.mutate({ reason: data.reason });
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
        <Button variant="outline" className="flex items-center gap-2">
          {t('blacklist.dialog.trigger', 'Blacklist')}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[400px] pt-8">
        <DialogTitle className="pb-1">
          {t('blacklist.dialog.title', 'Blacklist Customer')}
        </DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground">
          {t(
            'blacklist.dialog.description',
            'Please provide a reason for blacklisting this customer.',
          )}
        </DialogDescription>
        <Separator className="mb-2" />

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col">
              <Label htmlFor="reason" className="mb-1">
                {t('blacklist.dialog.reason_label', 'Reason')}
              </Label>
              <Input
                id="reason"
                placeholder={t(
                  'blacklist.dialog.reason_placeholder',
                  'e.g. Fraudulent activity',
                )}
                {...register('reason')}
              />
              {errors.reason && (
                <span className="text-red-500 text-xs mt-1">
                  {t(errors.reason.message as string)}
                </span>
              )}
            </div>
          </div>

          <div className="text-right mt-6">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader className="animate-spin mr-2" /> : null}
              {t('blacklist.dialog.confirm', 'Confirm Blacklist')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
