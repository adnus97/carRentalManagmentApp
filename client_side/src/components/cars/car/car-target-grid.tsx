'use client';

import React, { useMemo, useState } from 'react';
import CarDataGrid from './car-data-grid';
import { format } from 'date-fns';
import { TargetRow } from '@/types/car-tables';
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
import { getCarTargets, getActiveTargetCard } from '@/api/cars';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AgGridReactProps } from 'ag-grid-react';
import {
  ClientSideRowModelModule,
  ModuleRegistry,
  NumberFilterModule,
  PinnedRowModule,
  TextFilterModule,
} from 'ag-grid-community';

type CarDataGridProps<T> = AgGridReactProps<T>;

ModuleRegistry.registerModules([
  TextFilterModule,
  PinnedRowModule,
  ClientSideRowModelModule,
  NumberFilterModule,
]);

const currencyFormatter = (p: any) =>
  p?.value || p?.value === 0 ? `${Number(p.value).toLocaleString()} DHS` : '';

export default function CarTargetsGrid({
  carId,
  targets, // kept for compatibility
}: {
  carId: string;
  targets: TargetRow[];
}) {
  const [page, setPage] = useState(1);
  const pageSize = 5;

  // IMPORTANT: Hooks must always be called unconditionally and in the same order
  const historyQuery = useQuery({
    queryKey: ['carTargets.v-merge', carId, page, pageSize],
    queryFn: () => getCarTargets(carId, page, pageSize),
    placeholderData: (prev) => prev,
    initialData: { data: [], page: 1, pageSize, total: 0, totalPages: 1 },
  });

  const cardQuery = useQuery({
    queryKey: ['activeTargetCard', carId],
    queryFn: () => getActiveTargetCard(carId),
  });

  const isLoading = historyQuery.isLoading || cardQuery.isLoading;
  const history = historyQuery.data;
  const activeCard = cardQuery.data;

  const totalPages = history?.totalPages || 1;

  // Merge the active card row so grid matches the card values exactly
  const mergedRows: TargetRow[] = useMemo(() => {
    const rows: TargetRow[] = [...(history?.data ?? [])];

    if (!activeCard) return rows;

    const cardRow: TargetRow = {
      id: activeCard.id,
      startDate: activeCard.startDate,
      endDate: activeCard.endDate,
      targetRents: activeCard.targetRents,
      revenueGoal: activeCard.revenueGoal,
      actualRents: activeCard.actualRents,
      actualRevenue: activeCard.actualRevenue,
      revenueProgress: activeCard.revenueProgress,
      rentProgress: activeCard.rentProgress,
      daysRemaining: activeCard.daysRemaining,
      isExpired: activeCard.isExpired,
    };

    const overlaps = (aS: string, aE: string, bS: string, bE: string) => {
      const as = new Date(aS).getTime();
      const ae = new Date(aE).getTime();
      const bs = new Date(bS).getTime();
      const be = new Date(bE).getTime();
      return as <= be && ae >= bs;
    };

    const idx = rows.findIndex((r) =>
      overlaps(
        r.startDate,
        r.endDate,
        activeCard.startDate,
        activeCard.endDate,
      ),
    );

    if (idx >= 0) {
      rows.splice(idx, 1, cardRow);
    } else {
      rows.unshift(cardRow);
    }

    return rows;
  }, [history?.data, activeCard]);

  const columnDefs = [
    { headerName: 'Actual Rents', field: 'actualRents' },
    {
      headerName: 'Actual Revenue',
      field: 'actualRevenue',
      valueFormatter: currencyFormatter,
    },
    {
      headerName: 'Revenue Progress',
      field: 'revenueProgress',
      valueFormatter: (p: { value: number }) =>
        `${Number(p.value ?? 0).toFixed(1)}%`,
    },
    {
      headerName: 'Rents Progress',
      field: 'rentProgress',
      valueFormatter: (p: { value: number }) =>
        `${Number(p.value ?? 0).toFixed(1)}%`,
    },
    { headerName: 'Days Remaining', field: 'daysRemaining' },
  ];

  if (isLoading) return <p>Loading targets...</p>;

  // No active target behavior (restored)
  if (!activeCard) {
    return (
      <Card className="p-8 flex flex-col items-center w-fit place-self-center text-center rounded-xl shadow-md bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
        <div className="text-6xl mb-3">🎯</div>
        <p className="font-semibold text-lg">No active target</p>
        <p className="text-sm text-muted-foreground">
          Start by adding a new target.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
      {/* Active Target Card (same endpoint as merged row) */}
      <Card
        className={[
          'p-4 border border-border shadow-md rounded-lg',
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
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-base">
            {format(new Date(activeCard.startDate), 'dd MMM')} -{' '}
            {format(new Date(activeCard.endDate), 'dd MMM')}
          </h3>
          <Badge
            variant={activeCard.isExpired ? 'destructive' : 'success'}
            className="px-2 py-0.5 text-xs"
          >
            {activeCard.isExpired ? 'Expired' : 'Active'}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs mb-4">
          <div className="flex items-center gap-2">
            <span className="text-base">📅</span>
            <div>
              <p className="text-muted-foreground">Days Remaining</p>
              <p className="font-bold text-sm">{activeCard.daysRemaining}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base">💰</span>
            <div>
              <p className="text-muted-foreground">Revenue Progress</p>
              <p className="font-bold text-sm">
                {activeCard.revenueProgress.toFixed(1)}%
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base">📊</span>
            <div>
              <p className="text-muted-foreground">Rents Progress</p>
              <p className="font-bold text-sm">
                {activeCard.rentProgress.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Revenue</p>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{
                  width: `${Math.min(activeCard.revenueProgress, 100)}%`,
                }}
              />
            </div>
            <p className="text-xs mt-1">
              {Number(activeCard.actualRevenue).toLocaleString()} /{' '}
              {Number(activeCard.revenueGoal).toLocaleString()} MAD
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Rents</p>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full"
                style={{ width: `${Math.min(activeCard.rentProgress, 100)}%` }}
              />
            </div>
            <p className="text-xs mt-1">
              {activeCard.actualRents} / {activeCard.targetRents}
            </p>
          </div>
        </div>
      </Card>

      {/* Right: Targets History (active row merged) */}
      <div className="lg:col-span-2 ">
        <h3 className="text-md font-semibold mb-2">Targets History</h3>
        <div className="flex flex-col h-fit">
          <div className="max-h-[200px] overflow-y-auto">
            <CarDataGrid<TargetRow>
              rowData={mergedRows}
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
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(
                    (p) =>
                      p === 1 ||
                      p === totalPages ||
                      (p >= page - 2 && p <= page + 2),
                  )
                  .map((p, idx, arr) => (
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
