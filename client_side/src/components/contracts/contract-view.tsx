'use client';

import { useQuery } from '@tanstack/react-query';
import { getRentContractHTML } from '@/api/rents';
import { Loader } from '@/components/loader';
import { useTranslation } from 'react-i18next';

interface ContractViewProps {
  rentId: string;
}

export function ContractView({ rentId }: ContractViewProps) {
  const { t } = useTranslation('rent');

  const { data, isLoading, error } = useQuery({
    queryKey: ['contract', rentId],
    queryFn: () => getRentContractHTML(rentId),
    enabled: !!rentId,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="flex flex-col items-center gap-2">
          <Loader className="animate-spin h-10 w-10 text-primary" />
          <p className="text-sm text-muted-foreground">
            {t('contract.status.loading', 'Loading…')}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-red-600 font-semibold">
          ❌ {t('contract.errors.load_failed_desc', 'Failed to load contract')}
        </p>
      </div>
    );
  }

  // Render backend HTML directly
  return <div dangerouslySetInnerHTML={{ __html: data?.html || '' }} />;
}
