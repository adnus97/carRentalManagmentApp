// src/routes/admin/_layout/dashboard.tsx
import { createFileRoute, redirect } from '@tanstack/react-router';
import { AdminDashboard } from '../components/admin/admin-dshboard';

export const Route = createFileRoute('/_layout/admin/dashboard')({
  beforeLoad: ({ context }) => {
    // Extra security: ensure only super admins can access
    if (context.auth.user?.role !== 'super_admin') {
      throw redirect({ to: '/' });
    }
  },
  component: AdminDashboard,
});
