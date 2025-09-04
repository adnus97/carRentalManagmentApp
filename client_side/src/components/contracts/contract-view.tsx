'use client';

import { useQuery } from '@tanstack/react-query';
import { getRentContractHTML } from '@/api/rents';
import { Loader } from '@/components/loader';

interface ContractViewProps {
  rentId: string;
}

export function ContractView({ rentId }: ContractViewProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['contract', rentId],
    queryFn: () => getRentContractHTML(rentId),
    enabled: !!rentId,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader className="animate-spin h-10 w-10 text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-red-600 font-semibold">
          ❌ Erreur lors du chargement du contrat
        </p>
      </div>
    );
  }

  // ✅ Just render backend HTML directly
  return <div dangerouslySetInnerHTML={{ __html: data?.html || '' }} />;
}
