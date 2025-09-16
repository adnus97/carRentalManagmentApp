// components/auth/ForgotPasswordModal.tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { Loader } from '@/components/loader';
import { X } from 'lucide-react';

const emailSchema = z.object({
  email: z.string().email('Invalid email address'),
});

type EmailFormFields = z.infer<typeof emailSchema>;

interface ForgotPasswordModalProps {
  onClose: () => void;
}

export function ForgotPasswordModal({ onClose }: ForgotPasswordModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<EmailFormFields>({
    resolver: zodResolver(emailSchema),
  });

  const email = watch('email');

  const onSubmit = async (data: EmailFormFields) => {
    setIsSubmitting(true);
    try {
      await authClient.forgetPassword({
        email: data.email,
        redirectTo: '/reset-password',
      });

      setEmailSent(true);
      toast({
        type: 'success',
        title: 'Reset Email Sent',
        description: 'Check your email for password reset instructions',
      });
    } catch (error: any) {
      toast({
        type: 'error',
        title: 'Error',
        description: error?.message || 'Failed to send reset email',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              {emailSent ? 'Check Your Email' : 'Reset Password'}
            </DialogTitle>
          </div>
          <DialogDescription>
            {emailSent
              ? `We've sent password reset instructions to ${email}`
              : "Enter your email address and we'll send you a reset link"}
          </DialogDescription>
        </DialogHeader>

        {!emailSent ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                className={errors.email ? 'border-red-600' : ''}
                {...register('email')}
              />
              {errors.email && (
                <span className="text-red-600 text-sm">
                  {errors.email.message}
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? (
                  <>
                    <Loader />
                    <span>Sending...</span>
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p className="text-sm text-muted-foreground">
                If an account with that email exists, you'll receive reset
                instructions shortly.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEmailSent(false)}
                className="flex-1"
              >
                Try Different Email
              </Button>
              <Button type="button" onClick={onClose} className="flex-1">
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
