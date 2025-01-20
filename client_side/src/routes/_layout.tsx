import { AppLayout } from '@/layouts/appLayout';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_layout')({
  component: AppLayout,
});
