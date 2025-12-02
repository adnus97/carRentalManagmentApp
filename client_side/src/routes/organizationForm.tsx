import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { AddOrganizationForm } from '@/components/organization/organization-form';
import { useUser } from '@/contexts/user-context';
import { Card } from '@/components/ui/card';

export const Route = createFileRoute('/organizationForm')({
  // No beforeLoad needed - _layout handles everything
  component: OrganizationCreateRoute,
  pendingComponent: () => (
    <div className="container mx-auto px-4 py-16">
      <Card className="p-10 text-center">Loading…</Card>
    </div>
  ),
});

function OrganizationCreateRoute() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { refreshUser } = useUser();

  const handleSuccess = async () => {
    console.log('✅ Organization created successfully');

    // Invalidate org cache
    await queryClient.invalidateQueries({ queryKey: ['organization', 'user'] });

    // Refresh user to get latest state
    await refreshUser();

    // Navigate to dashboard with replace to prevent back button issues
    navigate({ to: '/dashboard', replace: true });
  };

  return (
    <div className="container h-full mx-auto px-4 py-8">
      <AddOrganizationForm onSuccess={handleSuccess} />
    </div>
  );
}
