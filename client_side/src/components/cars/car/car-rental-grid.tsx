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
  PaginationEllipsis,
} from '@/components/ui/pagination';
import { getCarRentals } from '@/api/cars';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import React from 'react';

// ================= Empty State Card (inline) =================
function EmptyStateCard({
  title,
  description,
  ctaText = 'Create Rental',
  onCta,
}: {
  title: string;
  description?: string;
  ctaText?: string;
  onCta?: () => void;
}) {
  return (
    <Card className="p-8 flex flex-col items-center w-fit place-self-center text-center rounded-xl shadow-md bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-200/70 dark:bg-slate-800/70">
        <span className="inline-flex h-8 w-8 items-center justify-center text-pink-400">
          📄
        </span>
      </div>
      <h3 className="mb-1 text-lg font-semibold">{title}</h3>
      {description ? <p className="mb-6 text-sm">{description}</p> : null}
    </Card>
  );
}
// ============================================================

// ✅ Safe number helper
function safeNumber(value: number | null | undefined): number {
  return typeof value === 'number' && !isNaN(value) ? value : 0;
}
const currencyFormatter = (params: any) =>
  params.value ? `${params.value.toLocaleString()} DHS` : '';

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

  if (isLoading) return <p>Loading rentals...</p>;

  const totalPages = data?.totalPages || 1;
  const isEmpty = (data?.total ?? 0) === 0; // <-- key empty-state flag

  // ✅ Find current active rent
  const currentRent = data.data.find(
    (r) =>
      r.status === 'active' &&
      (!r.returnedAt || new Date(r.returnedAt) > new Date()),
  );

  // ✅ Pagination logic
  const getPageNumbers = () => {
    const pages: number[] = [];
    for (let p = 1; p <= totalPages; p++) {
      if (p === 1 || p === totalPages || (p >= page - 2 && p <= page + 2)) {
        pages.push(p);
      }
    }
    return pages;
  };

  const columnDefs = [
    {
      headerName: 'Start Date',
      field: 'startDate',
      valueFormatter: (p: { value: string }) => {
        if (!p.value) return '';
        const parsed = parseISO(p.value);
        return isValid(parsed) ? format(parsed, 'dd/MM/yyyy') : '';
      },
      flex: 1,
    },
    {
      headerName: 'End Date',
      field: 'endDate',
      valueFormatter: (p: { value: string | null }) => {
        if (!p.value) return 'Ongoing';
        const parsed = parseISO(p.value);
        return isValid(parsed) ? format(parsed, 'dd/MM/yyyy') : 'Invalid';
      },
      flex: 1,
    },
    {
      headerName: 'Revenue',
      field: 'totalPrice',
      valueFormatter: currencyFormatter,
      flex: 1,
    },
    { headerName: 'Status', field: 'status', flex: 1 },
  ];

  // Optional: open your create-rental dialog
  const handleCreateRental = () => {
    // TODO: setCreateRentalOpen(true)
  };

  // ===== EMPTY STATE: show only the card and hide everything else =====
  if (isEmpty) {
    return (
      <div className="w-full max-w-[1200px] mx-auto min-h-[60vh] flex items-center justify-center py-10">
        <EmptyStateCard
          title="No rentals found"
          description="This car doesn't have any rental history yet."
          ctaText="Create Rental"
          onCta={handleCreateRental}
        />
      </div>
    );
  }

  // ===== NON-EMPTY: summary + grid + pagination =====
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
      {/* ✅ Summary Card */}
      <Card
        className={[
          'p-4 border border-border shadow-md rounded-lg',
          'relative overflow-hidden rounded-xl border shadow-sm',
          'border-gray-200 bg-white text-gray-900',
          'bg-[linear-gradient(180deg,rgba(2,6,23,0.03)_0%,rgba(2,6,23,0)_18%)]',
          'dark:border-border dark:text-gray-100 dark:shadow-lg',
          'dark:bg-gradient-to-b dark:from-gray-950 dark:to-gray-900',
        ].join(' ')}
      >
        {/* Dark-mode glow orbs */}
        <div className="pointer-events-none absolute -right-15 -top-15 hidden h-32 w-32 rounded-full bg-red-500/10 blur-3xl dark:block" />
        <div className="pointer-events-none absolute -left-14 -bottom-14 hidden h-36 w-36 rounded-full bg-amber-400/10 blur-3xl dark:block" />
        {currentRent ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-base">
                Current Rent:{' '}
                {format(parseISO(currentRent.startDate), 'dd MMM')} -{' '}
                {currentRent.endDate
                  ? format(parseISO(currentRent.endDate), 'dd MMM')
                  : 'Ongoing'}
              </h3>
              <Badge variant="warning" className="px-2 py-0.5 text-xs">
                🚗 Active
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs mb-4">
              <div>
                <p className="text-muted-foreground">Total Price</p>
                <p className="font-bold text-sm">
                  {currentRent.isOpenContract
                    ? safeNumber(currentRent.totalPaid).toLocaleString()
                    : safeNumber(currentRent.totalPrice).toLocaleString()}
                  MAD
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Paid</p>
                <p className="font-bold text-sm">
                  {safeNumber(currentRent.totalPaid).toLocaleString()} MAD
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <p className="font-bold text-sm">{currentRent.status}</p>
              </div>
            </div>

            {/* ✅ Progress Bar */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Payment Progress
              </p>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{
                    width: `${
                      Math.min(
                        (safeNumber(currentRent.totalPaid) /
                          safeNumber(currentRent.totalPrice)) *
                          100,
                        100,
                      ) || 0
                    }%`,
                  }}
                />
              </div>
              <p className="text-xs mt-1">
                {safeNumber(currentRent.totalPaid).toLocaleString()} /{' '}
                {safeNumber(currentRent.totalPrice).toLocaleString()} MAD
              </p>
            </div>
          </>
        ) : (
          <>
            <h3 className="font-semibold text-base mb-2">Rental Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-xs mb-4">
              <div>
                <p className="text-muted-foreground">Total Revenue</p>
                <p className="font-bold text-sm">
                  {safeNumber(financialStats.totalRevenue).toLocaleString()} MAD
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Rentals</p>
                <p className="font-bold text-sm">{financialStats.totalRents}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Avg Rent Price</p>
                <p className="font-bold text-sm">
                  {safeNumber(financialStats.avgRentPrice).toLocaleString()} MAD
                </p>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* ✅ History Grid */}
      <div className="lg:col-span-2">
        <h3 className="text-md font-semibold mb-2">Rentals History</h3>
        <div className="flex flex-col h-full">
          <div className="flex-1 max-h-[300px] overflow-hidden">
            <CarDataGrid<RentalRow>
              rowData={data.data}
              columnDefs={columnDefs}
              autoHeight={true}
            />
          </div>

          {totalPages >= 1 && (
            <Pagination className="mt-4">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    aria-disabled={page === 1}
                  />
                </PaginationItem>
                {getPageNumbers().map((p, idx, arr) => (
                  <React.Fragment key={p}>
                    {idx > 0 && p - arr[idx - 1] > 1 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}
                    <PaginationItem>
                      <PaginationLink
                        isActive={p === page}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  </React.Fragment>
                ))}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    aria-disabled={page === totalPages}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      </div>
    </div>
  );
}
