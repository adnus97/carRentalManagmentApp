import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { ResetPasswordPage } from '../../components/Auth/reset-password-page';

const searchSchema = z.object({
  token: z.string().optional(),
});

export const Route = createFileRoute('/_auth/reset-password')({
  validateSearch: (search) => searchSchema.parse(search),
  component: ResetPasswordPage,
});
