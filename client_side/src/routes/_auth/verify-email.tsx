import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { EmailVerificationPage } from '../../components/Auth/email-verification-page';

const searchSchema = z.object({
  token: z.string().optional(),
  callbackURL: z.string().optional(),
});

export const Route = createFileRoute('/_auth/verify-email')({
  validateSearch: (search) => searchSchema.parse(search),
  component: EmailVerificationPage,
});
