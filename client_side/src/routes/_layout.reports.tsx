import * as React from 'react';
import { createFileRoute, redirect } from '@tanstack/react-router';

// Lazy load your ReportsPage for performance
const ReportsPage = React.lazy(
  () => import('../components/reports/reports-page'),
);

export const Route = createFileRoute('/_layout/reports')({
  component: ReportsRouteComponent,

  beforeLoad: ({ context }) => {
    if (!context.auth?.user) {
      throw redirect({ to: '/login' });
    }
  },
  pendingComponent: () => <div className="p-4">Loading reports...</div>,
});

function ReportsRouteComponent() {
  return (
    <React.Suspense fallback={<div className="p-4">Loading reports…</div>}>
      <ReportsPage />
    </React.Suspense>
  );
}
