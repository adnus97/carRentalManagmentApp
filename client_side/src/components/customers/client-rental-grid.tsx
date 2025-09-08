'use client';

import { AgGridReact } from 'ag-grid-react';
import {
  ClientSideRowModelModule,
  ColDef,
  ModuleRegistry,
} from 'ag-grid-community';
import { useQuery } from '@tanstack/react-query';
import { getRentsByCustomer, getCustomerById } from '../../api/customers';
import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from '@/components/ui/pagination';
import { Card } from '@/components/ui/card';

ModuleRegistry.registerModules([ClientSideRowModelModule]);

export function ClientRentalsGrid({ customerId }: { customerId: string }) {
  const [page, setPage] = useState(1);
  const pageSize = 11;

  // ✅ Query 1: Customer info
  const { data: customer, isLoading: loadingCustomer } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => getCustomerById(customerId),
  });

  // ✅ Query 2: Paginated rentals for the grid
  const { data, isLoading, isError } = useQuery({
    queryKey: ['customerRents', customerId, page, pageSize],
    queryFn: () => getRentsByCustomer(customerId, page, pageSize),
    placeholderData: (prev) => prev,
  });

  // ✅ Query 3: Get ALL rentals with a much simpler approach
  const { data: allRentalsData, isLoading: loadingAllRentals } = useQuery({
    queryKey: ['customerRentsAll', customerId],
    queryFn: async () => {
      // First, get the first page to know total pages
      const firstPage = await getRentsByCustomer(customerId, 1, pageSize);
      if (!firstPage?.totalPages || firstPage.totalPages === 1) {
        return firstPage?.data || [];
      }

      // If there are multiple pages, fetch them all
      const allPages = await Promise.all(
        Array.from({ length: firstPage.totalPages }, (_, i) =>
          getRentsByCustomer(customerId, i + 1, pageSize),
        ),
      );

      // Combine all results
      return allPages.flatMap((pageData) => pageData?.data || []);
    },
    enabled: !!customerId, // Only run when we have a customerId
  });

  const colDefs: ColDef[] = [
    {
      headerName: 'Car',
      field: 'car',
      flex: 1,
      valueGetter: (params) =>
        `${params.data?.car?.make || ''} ${params.data?.car?.model || ''}`,
    },
    {
      headerName: 'Start Date',
      field: 'startDate',
      flex: 1,
      valueFormatter: (params) =>
        params.value ? format(new Date(params.value), 'dd/MM/yyyy') : '—',
    },
    {
      headerName: 'End Date',
      field: 'expectedEndDate',
      flex: 1,
      valueFormatter: (params) =>
        params.value ? format(new Date(params.value), 'dd/MM/yyyy') : '—',
    },
    {
      headerName: 'Returned At',
      field: 'returnedAt',
      flex: 1,
      valueFormatter: (params) =>
        params.value ? format(new Date(params.value), 'dd/MM/yyyy') : '—',
    },
    {
      headerName: 'Total Price',
      field: 'totalPrice',
      flex: 1,
      valueFormatter: (p) => `${(p.value || 0).toLocaleString()} MAD`,
    },
    {
      headerName: 'Paid',
      field: 'totalPaid',
      flex: 1,
      valueFormatter: (p) => `${(p.value || 0).toLocaleString()} MAD`,
    },
    {
      headerName: 'Deposit',
      field: 'deposit',
      flex: 1,
      valueFormatter: (p) => (p.value || 0).toLocaleString(),
    },
    {
      headerName: 'Guarantee',
      field: 'guarantee',
      flex: 1,
      valueFormatter: (p) => (p.value || 0).toLocaleString(),
    },
    {
      headerName: 'Late Fee',
      field: 'lateFee',
      flex: 1,
      valueFormatter: (p) => (p.value || 0).toLocaleString(),
    },
    {
      headerName: 'Fully Paid',
      field: 'isFullyPaid',
      flex: 1,
      cellRenderer: (p: any) =>
        p.value ? (
          <span className="text-green-500 font-bold">Yes</span>
        ) : (
          <span className="text-red-500">No</span>
        ),
    },
    {
      headerName: 'Status',
      field: 'status',
      flex: 1,
      cellRenderer: (params: any) => {
        const status = params.value;
        const colors: Record<string, string> = {
          reserved:
            'bg-purple-200 dark:bg-purple-900 !text-purple-800 dark:!text-purple-300',
          active:
            'bg-green-200 dark:bg-green-900 !text-green-800 dark:!text-green-300',
          completed:
            'bg-blue-200 dark:bg-blue-900 !text-blue-800 dark:!text-blue-300',
          cancelled:
            'bg-red-200 dark:bg-red-900 !text-red-800 dark:!text-red-300',
        };
        return (
          <span
            className={`px-2 py-1 rounded text-xs ${colors[status] || 'bg-gray-400'}`}
          >
            {status}
          </span>
        );
      },
    },
  ];

  if (isLoading || loadingCustomer || loadingAllRentals) {
    return <p>Loading client details...</p>;
  }

  if (isError) {
    return <p className="text-red-500">Failed to load rentals.</p>;
  }

  // ✅ Safe data access with fallbacks
  const rentals = data?.data || [];
  const totalPages = data?.totalPages || 1;
  const allRentals = allRentalsData || [];

  // ✅ Calculate stats from ALL rentals
  const totalRentals = allRentals.length;
  const totalSpent = allRentals.reduce(
    (sum: number, r: any) => sum + (r?.totalPaid || 0),
    0,
  );
  const avgSpendPerRental = totalRentals > 0 ? totalSpent / totalRentals : 0;

  // ✅ Debug output
  console.log('Stats calculation:', {
    totalRentals,
    totalSpent,
    avgSpendPerRental,
    totalPages,
    currentPageRentals: rentals.length,
    allRentalsLength: allRentals.length,
  });

  return (
    <div className="space-y-6">
      {/* ✅ Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card
          className={[
            'text-center',
            'p-6 border border-border shadow-md rounded-lg',
            'relative overflow-hidden rounded-xl border shadow-sm',
            // Light mode
            'border-gray-200 bg-white text-gray-900',
            'bg-[linear-gradient(180deg,rgba(2,6,23,0.03)_0%,rgba(2,6,23,0)_18%)]',
            // Dark mode (Insurance style)
            'dark:border-border dark:text-gray-100 dark:shadow-lg',
            'dark:bg-gradient-to-b dark:from-gray-950 dark:to-gray-900',
          ].join(' ')}
        >
          {/* Dark-mode glow orbs */}
          <div className="pointer-events-none absolute -right-15 -top-15 hidden h-32 w-32 rounded-full bg-red-500/10 blur-3xl dark:block" />
          <div className="pointer-events-none absolute -left-14 -bottom-14 hidden h-36 w-36 rounded-full bg-amber-400/10 blur-3xl dark:block" />
          <p className="text-sm text-muted-foreground">Total Rentals</p>
          <p className="text-xl font-bold">{totalRentals}</p>
        </Card>
        <Card
          className={[
            'text-center',
            'p-6 border border-border shadow-md rounded-lg',
            'relative overflow-hidden rounded-xl border shadow-sm',
            // Light mode
            'border-gray-200 bg-white text-gray-900',
            'bg-[linear-gradient(180deg,rgba(2,6,23,0.03)_0%,rgba(2,6,23,0)_18%)]',
            // Dark mode (Insurance style)
            'dark:border-border dark:text-gray-100 dark:shadow-lg',
            'dark:bg-gradient-to-b dark:from-gray-950 dark:to-gray-900',
          ].join(' ')}
        >
          {/* Dark-mode glow orbs */}
          <div className="pointer-events-none absolute -right-15 -top-15 hidden h-32 w-32 rounded-full bg-red-500/10 blur-3xl dark:block" />
          <div className="pointer-events-none absolute -left-14 -bottom-14 hidden h-36 w-36 rounded-full bg-amber-400/10 blur-3xl dark:block" />
          <p className="text-sm text-muted-foreground">Total Spent</p>
          <p className="text-xl font-bold">{totalSpent.toLocaleString()} MAD</p>
        </Card>
        <Card
          className={[
            'text-center',
            'p-6 border border-border shadow-md rounded-lg',
            'relative overflow-hidden rounded-xl border shadow-sm',
            // Light mode
            'border-gray-200 bg-white text-gray-900',
            'bg-[linear-gradient(180deg,rgba(2,6,23,0.03)_0%,rgba(2,6,23,0)_18%)]',
            // Dark mode (Insurance style)
            'dark:border-border dark:text-gray-100 dark:shadow-lg',
            'dark:bg-gradient-to-b dark:from-gray-950 dark:to-gray-900',
          ].join(' ')}
        >
          {/* Dark-mode glow orbs */}
          <div className="pointer-events-none absolute -right-15 -top-15 hidden h-32 w-32 rounded-full bg-red-500/10 blur-3xl dark:block" />
          <div className="pointer-events-none absolute -left-14 -bottom-14 hidden h-36 w-36 rounded-full bg-amber-400/10 blur-3xl dark:block" />
          <p className="text-sm text-muted-foreground">Avg Spend / Rental</p>
          <p className="text-xl font-bold">
            {avgSpendPerRental.toFixed(2)} MAD
          </p>
        </Card>
      </div>

      {/* ✅ Rentals Grid */}
      <div
        className="ag-theme-alpine-dark rounded-lg shadow-md text-sm"
        style={{ height: 500 }}
      >
        <AgGridReact
          rowHeight={40}
          headerHeight={40}
          rowData={rentals}
          columnDefs={colDefs}
          pagination={false}
        />
      </div>

      {/* ✅ Pagination Controls */}
      <Pagination className="mt-4">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-disabled={page === 1}
            />
          </PaginationItem>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <PaginationItem key={p}>
              <PaginationLink isActive={p === page} onClick={() => setPage(p)}>
                {p}
              </PaginationLink>
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-disabled={page === totalPages}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
