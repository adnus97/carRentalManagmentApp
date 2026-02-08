'use client';

import { AgGridReact } from 'ag-grid-react';
import {
  ClientSideRowModelModule,
  ColDef,
  ModuleRegistry,
} from 'ag-grid-community';
import { useQuery } from '@tanstack/react-query';
import { getRentsByCustomer, getCustomerById } from '../../api/customers';
import { useState } from 'react';
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
import { useTranslation } from 'react-i18next';

ModuleRegistry.registerModules([ClientSideRowModelModule]);

export function ClientRentalsGrid({ customerId }: { customerId: string }) {
  const { t } = useTranslation('client');

  const [page, setPage] = useState(1);
  const pageSize = 11;

  // ✅ Query 1: Customer info
  const { isLoading: loadingCustomer } = useQuery({
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
      const firstPage = await getRentsByCustomer(customerId, 1, pageSize);
      if (!firstPage?.totalPages || firstPage.totalPages === 1) {
        return firstPage?.data || [];
      }
      const allPages = await Promise.all(
        Array.from({ length: firstPage.totalPages }, (_, i) =>
          getRentsByCustomer(customerId, i + 1, pageSize),
        ),
      );
      return allPages.flatMap((pageData) => pageData?.data || []);
    },
    enabled: !!customerId,
  });

  const colDefs: ColDef[] = [
    {
      headerName: t('client_rentals.car', 'Car'),
      field: 'car',
      flex: 1,
      valueGetter: (params) =>
        `${params.data?.car?.make || ''} ${params.data?.car?.model || ''}`,
    },
    {
      headerName: t('client_rentals.start_date', 'Start Date'),
      field: 'startDate',
      flex: 1,
      valueFormatter: (params) =>
        params.value ? format(new Date(params.value), 'dd/MM/yyyy') : '—',
    },
    {
      headerName: t('client_rentals.end_date', 'End Date'),
      field: 'expectedEndDate',
      flex: 1,
      valueFormatter: (params) =>
        params.value ? format(new Date(params.value), 'dd/MM/yyyy') : '—',
    },
    {
      headerName: t('client_rentals.returned_at', 'Returned At'),
      field: 'returnedAt',
      flex: 1,
      valueFormatter: (params) =>
        params.value ? format(new Date(params.value), 'dd/MM/yyyy') : '—',
    },
    {
      headerName: t('client_rentals.total_price', 'Total Price'),
      field: 'totalPrice',
      flex: 1,
      valueFormatter: (p) => `${(p.value || 0).toLocaleString()} MAD`,
    },
    {
      headerName: t('client_rentals.paid', 'Paid'),
      field: 'totalPaid',
      flex: 1,
      valueFormatter: (p) => `${(p.value || 0).toLocaleString()} MAD`,
    },
    {
      headerName: t('client_rentals.deposit', 'Deposit'),
      field: 'deposit',
      flex: 1,
      valueFormatter: (p) => (p.value || 0).toLocaleString(),
    },
    {
      headerName: t('client_rentals.guarantee', 'Guarantee'),
      field: 'guarantee',
      flex: 1,
      valueFormatter: (p) => (p.value || 0).toLocaleString(),
    },
    {
      headerName: t('client_rentals.remaining', 'Remaining'),
      flex: 1,
      valueGetter: (params) => {
        const totalPrice = Number(params.data?.totalPrice ?? 0);
        const totalPaid = Number(params.data?.totalPaid ?? 0);
        return Math.max(0, totalPrice - totalPaid);
      },
      valueFormatter: (p) => `${(p.value || 0).toLocaleString()} MAD`,
      cellStyle: (params) => {
        const remaining = params.value || 0;
        if (remaining > 0) {
          return { color: '#ef4444', fontWeight: 'bold' }; // Red for unpaid
        }
        return { color: '#22c55e', fontWeight: 'bold' }; // Green for fully paid
      },
    },
    {
      headerName: t('client_rentals.fully_paid', 'Fully Paid'),
      flex: 1,
      valueGetter: (p) => {
        const paid = Number(p.data?.totalPaid ?? 0);
        const price = Number(p.data?.totalPrice ?? 0);
        return price > 0 && paid >= price;
      },
      cellRenderer: (p: any) =>
        p.value ? (
          <span className="text-green-500 font-bold">
            {t('client_rentals.yes', 'Yes')}
          </span>
        ) : (
          <span className="text-red-500">{t('client_rentals.no', 'No')}</span>
        ),
      filter: true,
      sortable: true,
    },
    {
      headerName: t('client_rentals.status', 'Status'),
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
        const labelMap: Record<string, string> = {
          reserved: t('client_rentals.status_reserved', 'reserved'),
          active: t('client_rentals.status_active', 'active'),
          completed: t('client_rentals.status_completed', 'completed'),
          cancelled: t('client_rentals.status_cancelled', 'cancelled'),
        };
        return (
          <span
            className={`px-2 py-1 rounded text-xs ${
              colors[status] || 'bg-gray-400'
            }`}
          >
            {labelMap[status] || status}
          </span>
        );
      },
    },
  ];

  if (isLoading || loadingCustomer || loadingAllRentals) {
    return <p>{t('client_rentals.loading', 'Loading client details...')}</p>;
  }

  if (isError) {
    return (
      <p className="text-red-500">
        {t('client_rentals.load_failed', 'Failed to load rentals.')}
      </p>
    );
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
  const totalPriceSum = allRentals.reduce(
    (sum: number, r: any) => sum + (r?.totalPrice || 0),
    0,
  );
  const totalLeft = Math.max(0, totalPriceSum - totalSpent);
  const avgSpendPerRental = totalRentals > 0 ? totalSpent / totalRentals : 0;

  return (
    <div className="space-y-6">
      {/* ✅ Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Rentals */}
        <Card
          className={[
            'text-center',
            'p-6 border border-border shadow-md rounded-lg',
            'relative overflow-hidden rounded-xl border shadow-sm',
            'border-gray-200 bg-white text-gray-900',
            'bg-[linear-gradient(180deg,rgba(2,6,23,0.03)_0%,rgba(2,6,23,0)_18%)]',
            'dark:border-border dark:text-gray-100 dark:shadow-lg',
            'dark:bg-gradient-to-b dark:from-gray-950 dark:to-gray-900',
          ].join(' ')}
        >
          <div className="pointer-events-none absolute -right-15 -top-15 hidden h-32 w-32 rounded-full bg-red-500/10 blur-3xl dark:block" />
          <div className="pointer-events-none absolute -left-14 -bottom-14 hidden h-36 w-36 rounded-full bg-amber-400/10 blur-3xl dark:block" />
          <p className="text-sm text-muted-foreground">
            {t('client_rentals.stat_total_rentals', 'Total Rentals')}
          </p>
          <p className="text-xl font-bold">{totalRentals}</p>
        </Card>

        {/* Total Spent */}
        <Card
          className={[
            'text-center',
            'p-6 border border-border shadow-md rounded-lg',
            'relative overflow-hidden rounded-xl border shadow-sm',
            'border-gray-200 bg-white text-gray-900',
            'bg-[linear-gradient(180deg,rgba(2,6,23,0.03)_0%,rgba(2,6,23,0)_18%)]',
            'dark:border-border dark:text-gray-100 dark:shadow-lg',
            'dark:bg-gradient-to-b dark:from-gray-950 dark:to-gray-900',
          ].join(' ')}
        >
          <div className="pointer-events-none absolute -right-15 -top-15 hidden h-32 w-32 rounded-full bg-red-500/10 blur-3xl dark:block" />
          <div className="pointer-events-none absolute -left-14 -bottom-14 hidden h-36 w-36 rounded-full bg-amber-400/10 blur-3xl dark:block" />
          <p className="text-sm text-muted-foreground">
            {t('client_rentals.stat_total_spent', 'Total Spent')}
          </p>
          <p className="text-xl font-bold">{totalSpent.toLocaleString()} MAD</p>
        </Card>

        {/* Total Left */}
        <Card
          className={[
            'text-center',
            'p-6 border border-border shadow-md rounded-lg',
            'relative overflow-hidden rounded-xl border shadow-sm',
            'border-gray-200 bg-white text-gray-900',
            'bg-[linear-gradient(180deg,rgba(2,6,23,0.03)_0%,rgba(2,6,23,0)_18%)]',
            'dark:border-border dark:text-gray-100 dark:shadow-lg',
            'dark:bg-gradient-to-b dark:from-gray-950 dark:to-gray-900',
          ].join(' ')}
        >
          <div className="pointer-events-none absolute -right-15 -top-15 hidden h-32 w-32 rounded-full bg-red-500/10 blur-3xl dark:block" />
          <div className="pointer-events-none absolute -left-14 -bottom-14 hidden h-36 w-36 rounded-full bg-amber-400/10 blur-3xl dark:block" />
          <p className="text-sm text-muted-foreground">
            {t('client_rentals.stat_total_left', 'Total Left')}
          </p>
          <p className="text-xl font-bold">{totalLeft.toLocaleString()} MAD</p>
        </Card>

        {/* Avg Spend / Rental */}
        <Card
          className={[
            'text-center',
            'p-6 border border-border shadow-md rounded-lg',
            'relative overflow-hidden rounded-xl border shadow-sm',
            'border-gray-200 bg-white text-gray-900',
            'bg-[linear-gradient(180deg,rgba(2,6,23,0.03)_0%,rgba(2,6,23,0)_18%)]',
            'dark:border-border dark:text-gray-100 dark:shadow-lg',
            'dark:bg-gradient-to-b dark:from-gray-950 dark:to-gray-900',
          ].join(' ')}
        >
          <div className="pointer-events-none absolute -right-15 -top-15 hidden h-32 w-32 rounded-full bg-red-500/10 blur-3xl dark:block" />
          <div className="pointer-events-none absolute -left-14 -bottom-14 hidden h-36 w-36 rounded-full bg-amber-400/10 blur-3xl dark:block" />
          <p className="text-sm text-muted-foreground">
            {t('client_rentals.stat_avg_spend', 'Avg Spend / Rental')}
          </p>
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
              aria-label={t('client_rentals.prev_page', 'Previous page')}
            />
          </PaginationItem>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <PaginationItem key={p}>
              <PaginationLink
                isActive={p === page}
                onClick={() => setPage(p)}
                aria-label={t('client_rentals.goto_page', 'Go to page {{p}}', {
                  p,
                })}
              >
                {p}
              </PaginationLink>
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-disabled={page === totalPages}
              aria-label={t('client_rentals.next_page', 'Next page')}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
