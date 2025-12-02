import { createFileRoute, redirect } from '@tanstack/react-router';
import { OrganizationDetails } from '@/components/organization/organization-details';
import { getOrganizationByUser } from '@/api/organization';

export const Route = createFileRoute('/_layout/organization')({
  beforeLoad: async () => {
    // Check if user has organization
    try {
      const organizations = await getOrganizationByUser();
      if (!organizations || organizations.length === 0) {
        throw redirect({ to: '/organizationForm' });
      }
    } catch (error) {
      throw redirect({ to: '/organizationForm' });
    }
  },
  component: OrganizationDetails,
});
