'use client';

import CarDataGrid from './car-data-grid';
import { format, parseISO, isValid } from 'date-fns';
import { OilChangeRow } from '@/types/car-tables';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from '@/components/ui/pagination';
import { getCarOilChanges } from '@/api/cars';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

import { GasPump } from '@phosphor-icons/react';

function OilChangeSummaryCard({ oilChanges }: { oilChanges: OilChangeRow[] }) {
  if (!oilChanges.length) return null;

  const lastChange = oilChanges[0];

  return (
    <Card className="shadow-lg border border-border hover:shadow-xl transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Last Oil Change
        </CardTitle>
        <GasPump size={40} className="text-blue-500" />
      </CardHeader>
      <CardContent>
        <p className="text-lg font-bold">
          {format(new Date(lastChange.changedAt), 'dd MMM yyyy')}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Mileage: {lastChange.mileage.toLocaleString()} km
        </p>
      </CardContent>
    </Card>
  );
}

export default function CarOilChangesGrid({ carId }: { carId: string }) {
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const { data, isLoading } = useQuery({
    queryKey: ['carOilChanges', carId, page, pageSize],
    queryFn: () => getCarOilChanges(carId, page, pageSize),
    placeholderData: (prev) => prev,
    initialData: {
      data: [],
      page: 1,
      pageSize,
      total: 0,
      totalPages: 1,
    },
  });

  const columnDefs = [
    {
      headerName: 'Date',
      field: 'changedAt',
      valueFormatter: (p: { value: string }) => {
        if (!p.value) return '';
        const parsed = parseISO(p.value);
        return isValid(parsed) ? format(parsed, 'dd/MM/yyyy') : '';
      },
    },
    { headerName: 'Mileage', field: 'mileage' },
    { headerName: 'Notes', field: 'notes' },
  ];

  if (isLoading) return <p>Loading oil changes...</p>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ✅ Summary Card */}
      <div className="lg:col-span-1">
        <OilChangeSummaryCard oilChanges={data.data} />
      </div>

      {/* ✅ History Grid */}
      <div className="lg:col-span-2">
        <CarDataGrid<OilChangeRow>
          rowData={data.data}
          columnDefs={columnDefs}
        />
        {data.totalPages > 1 && (
          <Pagination className="mt-4">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-disabled={page === 1}
                />
              </PaginationItem>
              {Array.from({ length: data.totalPages }, (_, i) => i + 1).map(
                (p) => (
                  <PaginationItem key={p}>
                    <PaginationLink
                      isActive={p === page}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                ),
              )}
              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    setPage((p) => Math.min(data.totalPages, p + 1))
                  }
                  aria-disabled={page === data.totalPages}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </div>
  );
}
