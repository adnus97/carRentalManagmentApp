import React, { Suspense } from 'react';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AddOrganizationForm } from '@/components/organization/organization-form';
import { getOrganizationByUser } from '@/api/organization';
import { useUser } from '@/contexts/user-context';
import { Card } from '@/components/ui/card';

// Change the path here if you want a different URL
export const Route = createFileRoute('/organizationForm')({
  component: OrganizationCreateRoute,
  pendingComponent: () => (
    <div className="container mx-auto px-4 py-16">
      <Card className="p-10 text-center">Loading...</Card>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="container mx-auto px-4 py-16">
      <Card className="p-10 text-center">
        <div className="text-red-500 font-medium">Error</div>
        <div className="text-sm opacity-80 mt-2">{String(error)}</div>
      </Card>
    </div>
  ),
});

function OrganizationCreateRoute() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useUser();

  // 1) Auth guard
  if (!user) {
    throw redirect({
      to: '/login',
      search: { redirect: '/organizationForm' },
    });
  }

  // 2) Check if user already has an organization
  const { data, isLoading } = useQuery({
    queryKey: ['organization', 'user'],
    queryFn: getOrganizationByUser,
    enabled: !!user, // Only after auth
  });

  // 3) If already has an org, redirect to details page
  if (!isLoading && data && data.length > 0) {
    // You can redirect to a specific details route; here we assume /organization shows details
    throw redirect({ to: '/organization' });
  }

  const handleSuccess = async (orgId: string) => {
    // Invalidate caches and go to details
    await queryClient.invalidateQueries({ queryKey: ['organization', 'user'] });
    navigate({ to: '/organization' });
  };

  return (
    <Suspense fallback={<div className="p-6">Loading form…</div>}>
      <div className="container h-full mx-auto px-4 py-8">
        <AddOrganizationForm onSuccess={handleSuccess} />
      </div>
    </Suspense>
  );
}
