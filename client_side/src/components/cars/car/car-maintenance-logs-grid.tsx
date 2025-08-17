'use client';

import CarDataGrid from './car-data-grid';
import { format } from 'date-fns';
import { MaintenanceLogRow } from '@/types/car-tables';
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
import { getCarMaintenanceLogs } from '@/api/cars';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Wrench } from 'lucide-react';

function MaintenanceSummaryCard({ logs }: { logs: MaintenanceLogRow[] }) {
  if (!logs.length) return null;

  const lastLog = logs[0];
  const totalCost = logs.reduce((sum, log) => sum + (log.cost || 0), 0);

  return (
    <Card className="shadow-lg border border-border hover:shadow-xl transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Last Maintenance
        </CardTitle>
        <Wrench className="h-5 w-5 text-orange-500" />
      </CardHeader>
      <CardContent>
        <p className="text-lg font-bold">
          {format(new Date(lastLog.date), 'dd MMM yyyy')}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Total Cost: {totalCost.toLocaleString()} MAD
        </p>
      </CardContent>
    </Card>
  );
}

export default function CarMaintenanceLogsGrid({ carId }: { carId: string }) {
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const { data, isLoading } = useQuery({
    queryKey: ['carMaintenanceLogs', carId, page, pageSize],
    queryFn: () => getCarMaintenanceLogs(carId, page, pageSize),
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
    { headerName: 'Description', field: 'description' },
    { headerName: 'Cost', field: 'cost' },
    {
      headerName: 'Date',
      field: 'date',
      valueFormatter: (p: { value: string }) =>
        format(new Date(p.value), 'dd/MM/yyyy'),
    },
  ];

  if (isLoading) return <p>Loading maintenance logs...</p>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ✅ Summary Card */}
      <div className="lg:col-span-1">
        <MaintenanceSummaryCard logs={data.data} />
      </div>

      {/* ✅ History Grid */}
      <div className="lg:col-span-2">
        <CarDataGrid<MaintenanceLogRow>
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
