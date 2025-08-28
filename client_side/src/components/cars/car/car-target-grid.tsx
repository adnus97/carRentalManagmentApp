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
  PaginationEllipsis,
} from '@/components/ui/pagination';
import { getCarTargets } from '@/api/cars';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AgGridReactProps } from 'ag-grid-react';
import {
  ClientSideRowModelModule,
  ColDef,
  ColGroupDef,
  DomLayoutType,
  GridApi,
  GridOptions,
  GridReadyEvent,
  ModuleRegistry,
  NumberFilterModule,
  PinnedRowModule,
  TextFilterModule,
  ValidationModule,
} from 'ag-grid-community';
import React from 'react';
type CarDataGridProps<T> = AgGridReactProps<T>;

ModuleRegistry.registerModules([
  TextFilterModule,
  PinnedRowModule,
  ClientSideRowModelModule,
  NumberFilterModule,
]);

const currencyFormatter = (params: any) =>
  params.value ? `${params.value.toLocaleString()} DHS` : '';

export default function CarTargetsGrid({
  carId,
  targets,
}: {
  carId: string;
  targets: TargetRow[];
}) {
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const getPageNumbers = () => {
    const pages: number[] = [];
    for (let p = 1; p <= totalPages; p++) {
      if (p === 1 || p === totalPages || (p >= page - 2 && p <= page + 2)) {
        pages.push(p);
      }
    }
    return pages;
  };
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
  const totalPages = data?.totalPages || 1;

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
    {
      headerName: 'Revenue Goal',
      field: 'revenueGoal',
      valueFormatter: currencyFormatter,
    },
    { headerName: 'Actual Rents', field: 'actualRents' },
    {
      headerName: 'Actual Revenue',
      field: 'actualRevenue',
      valueFormatter: currencyFormatter,
    },
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

  const now = new Date();
  const activeTarget = targets.find(
    (t) =>
      new Date(t.startDate) <= now &&
      new Date(t.endDate) >= now &&
      !t.isExpired,
  );

  // ✅ If no active target
  if (!activeTarget) {
    return (
      <Card className="p-8 flex flex-col items-center w-fit place-self-center  text-center rounded-xl shadow-md bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
        <div className="text-6xl mb-3">🎯</div>
        <p className="font-semibold text-lg">No active target</p>
        <p className="text-sm text-muted-foreground">
          Start by adding a new target.
        </p>
      </Card>
    );
  }

  // ✅ If active target exists
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
      {/* Active Target Card */}
      <Card className="p-4 border border-border shadow-md rounded-lg bg-white dark:bg-gray-900">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-base">
            {format(new Date(activeTarget.startDate), 'dd MMM')} -{' '}
            {format(new Date(activeTarget.endDate), 'dd MMM')}
          </h3>
          <Badge variant="success" className="px-2 py-0.5 text-xs">
            Active
          </Badge>
        </div>

        {/* KPI Grid with icons */}
        <div className="grid grid-cols-2 gap-4 text-xs mb-4">
          <div className="flex items-center gap-2">
            <span className="text-base">📅</span>
            <div>
              <p className="text-muted-foreground">Days Remaining</p>
              <p className="font-bold text-sm">{activeTarget.daysRemaining}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base">💰</span>
            <div>
              <p className="text-muted-foreground">Revenue Progress</p>
              <p className="font-bold text-sm">
                {activeTarget.revenueProgress.toFixed(1)}%
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base">📊</span>
            <div>
              <p className="text-muted-foreground">Rents Progress</p>
              <p className="font-bold text-sm">
                {activeTarget.rentProgress.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        {/* Progress Bars */}
        <div className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Revenue</p>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{
                  width: `${Math.min(activeTarget.revenueProgress, 100)}%`,
                }}
              />
            </div>
            <p className="text-xs mt-1">
              {activeTarget.actualRevenue.toLocaleString()} /{' '}
              {activeTarget.revenueGoal.toLocaleString()} MAD
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Rents</p>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full"
                style={{
                  width: `${Math.min(activeTarget.rentProgress, 100)}%`,
                }}
              />
            </div>
            <p className="text-xs mt-1">
              {activeTarget.actualRents} / {activeTarget.targetRents}
            </p>
          </div>
        </div>
      </Card>
      {/* History Grid */}
      <div className="lg:col-span-2 ">
        <h3 className="text-md font-semibold mb-2">Targets History</h3>
        <div className="flex flex-col h-fit">
          <div className="max-h-[200px] overflow-y-auto">
            <CarDataGrid<TargetRow>
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
