// src/hooks/useOrganizationCheck.ts
import { useQuery } from '@tanstack/react-query';
import { getOrganizationByUser } from '@/api/organization';
import { useUser } from '@/contexts/user-context';

export function useOrganizationCheck() {
  const { user } = useUser();

  return useQuery({
    queryKey: ['organization', 'user', user?.id],
    queryFn: getOrganizationByUser,
    enabled: !!user,
    retry: false,
  });
}
