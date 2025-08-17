'use client';

import CarDataGrid from './car-data-grid';
import { format, parseISO, isValid } from 'date-fns';
import { RentalRow } from '@/types/car-tables';
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
import { getCarRentals } from '@/api/cars';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';

function RentalsSummaryCard({
  financialStats,
}: {
  financialStats: {
    totalRevenue: number;
    totalRents: number;
    avgRentPrice: number;
  };
}) {
  return (
    <Card className="shadow-lg border border-border hover:shadow-xl transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Rental Summary
        </CardTitle>
        <DollarSign className="h-5 w-5 text-green-500" />
      </CardHeader>
      <CardContent>
        <p>Total Revenue: {financialStats.totalRevenue.toLocaleString()} MAD</p>
        <p>Total Rentals: {financialStats.totalRents}</p>
        <p>
          Avg Rent Price:{' '}
          {Number(financialStats.avgRentPrice).toFixed(2).toLocaleString()} MAD
        </p>
      </CardContent>
    </Card>
  );
}

export default function CarRentalsGrid({
  carId,
  financialStats,
}: {
  carId: string;
  financialStats: {
    totalRevenue: number;
    totalRents: number;
    avgRentPrice: number;
  };
}) {
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const { data, isLoading } = useQuery({
    queryKey: ['carRentals', carId, page, pageSize],
    queryFn: () => getCarRentals(carId, page, pageSize),
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
      valueFormatter: (p: { value: string }) => {
        if (!p.value) return '';
        const parsed = parseISO(p.value);
        return isValid(parsed) ? format(parsed, 'dd/MM/yyyy') : '';
      },
    },
    {
      headerName: 'End Date',
      field: 'endDate',
      valueFormatter: (p: { value: string }) => {
        if (!p.value) return '';
        const parsed = parseISO(p.value);
        return isValid(parsed) ? format(parsed, 'dd/MM/yyyy') : '';
      },
    },
    { headerName: 'Revenue', field: 'totalPrice' },
    { headerName: 'Status', field: 'status' },
  ];

  if (isLoading) return <p>Loading rentals...</p>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ✅ Summary Card */}
      <div className="lg:col-span-1">
        <RentalsSummaryCard financialStats={financialStats} />
      </div>

      {/* ✅ History Grid */}
      <div className="lg:col-span-2">
        <CarDataGrid<RentalRow> rowData={data.data} columnDefs={columnDefs} />
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
