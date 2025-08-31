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
import { Mail, Phone, IdCard, Calendar, User, CheckCircle } from 'lucide-react';

ModuleRegistry.registerModules([ClientSideRowModelModule]);

export function ClientRentalsGrid({ customerId }: { customerId: string }) {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

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

  // ✅ Query 3: All rentals (for stats only)
  const { data: allData, isLoading: loadingAll } = useQuery({
    queryKey: ['customerRentsAll', customerId],
    queryFn: () => getRentsByCustomer(customerId), // no pagination
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
      valueFormatter: (p) => `${p.value?.toLocaleString()} MAD`,
    },
    {
      headerName: 'Paid',
      field: 'totalPaid',
      flex: 1,
      valueFormatter: (p) => `${p.value?.toLocaleString()} MAD`,
    },
    { headerName: 'Deposit', field: 'deposit', flex: 1 },
    { headerName: 'Guarantee', field: 'guarantee', flex: 1 },
    { headerName: 'Late Fee', field: 'lateFee', flex: 1 },
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
            'bg-purple-200 dark:bg-purple-900 !text-purple-800 dark:!text-purple-300 px-2 py-1 rounded',
          active:
            'bg-green-200 dark:bg-green-900 !text-green-800 dark:!text-green-300 px-2 py-1 rounded',
          completed:
            'bg-blue-200 dark:bg-blue-900 !text-blue-800 dark:!text-blue-300 px-2 py-1 rounded',
          cancelled:
            'bg-red-200 dark:bg-red-900 !text-red-800 dark:!text-red-300 px-2 py-1 rounded',
        };
        return (
          <span
            className={`px-2 py-1 rounded text-xs ${
              colors[status] || 'bg-gray-400'
            }`}
          >
            {status}
          </span>
        );
      },
    },
  ];

  if (isLoading || loadingCustomer || loadingAll)
    return <p>Loading client details...</p>;
  if (isError) return <p className="text-red-500">Failed to load rentals.</p>;

  const rentals = data?.data || [];
  const totalPages = data?.totalPages || 1;

  // ✅ Compute stats from all rentals
  const allRentals = allData?.data || [];
  const totalRentals = allRentals.length;
  const totalSpent = allRentals.reduce(
    (sum: any, r: any) => sum + (r.totalPrice || 0),
    0,
  );
  const avgSpend = totalRentals > 0 ? totalSpent / totalRentals : 0;

  return (
    <div className="space-y-6">
      {/* ✅ Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <p className="text-sm text-muted-foreground">Total Rentals</p>
          <p className="text-xl font-bold">{totalRentals}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-sm text-muted-foreground">Total Spent</p>
          <p className="text-xl font-bold">{totalSpent.toLocaleString()} MAD</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-sm text-muted-foreground">Avg Spend / Rental</p>
          <p className="text-xl font-bold">{avgSpend.toFixed(2)} MAD</p>
        </Card>
      </div>

      {/* ✅ Rentals Grid */}
      <div
        className="ag-theme-alpine-dark rounded-lg shadow-md text-sm"
        style={{ height: 400 }}
      >
        <AgGridReact
          rowHeight={40}
          headerHeight={40}
          rowData={rentals}
          columnDefs={colDefs}
          pagination={false} // manual pagination
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
