'use client';

import CarDataGrid from './car-data-grid';
import { format } from 'date-fns';
import { TargetRow } from '@/types/car-tables';
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
import { getCarTargets } from '@/api/cars';
import { Badge } from '@/components/ui/badge';

export default function CarTargetsGrid({ carId }: { carId: string }) {
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const { data, isLoading } = useQuery({
    queryKey: ['carTargets', carId, page, pageSize],
    queryFn: () => getCarTargets(carId, page, pageSize),
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
      headerName: 'Start Date',
      field: 'startDate',
      valueFormatter: (p: { value: string }) =>
        format(new Date(p.value), 'dd/MM/yyyy'),
    },
    {
      headerName: 'End Date',
      field: 'endDate',
      valueFormatter: (p: { value: string }) =>
        format(new Date(p.value), 'dd/MM/yyyy'),
    },
    { headerName: 'Target Rents', field: 'targetRents' },
    { headerName: 'Revenue Goal', field: 'revenueGoal' },
    { headerName: 'Actual Rents', field: 'actualRents' },
    { headerName: 'Actual Revenue', field: 'actualRevenue' },
    {
      headerName: 'Revenue Progress',
      field: 'revenueProgress',
      valueFormatter: (p: { value: number }) => `${p.value.toFixed(1)}%`,
    },
    {
      headerName: 'Rents Progress',
      field: 'rentProgress',
      valueFormatter: (p: { value: number }) => `${p.value.toFixed(1)}%`,
    },
    { headerName: 'Days Remaining', field: 'daysRemaining' },
    {
      headerName: 'Status',
      field: 'isExpired',
      cellRenderer: (p: { value: boolean }) =>
        p.value ? (
          <Badge variant="destructive">Expired</Badge>
        ) : (
          <Badge variant="success">Active</Badge>
        ),
    },
  ];

  if (isLoading) return <p>Loading targets...</p>;

  return (
    <div>
      <CarDataGrid<TargetRow> rowData={data.data} columnDefs={columnDefs} />
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
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                aria-disabled={page === data.totalPages}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
