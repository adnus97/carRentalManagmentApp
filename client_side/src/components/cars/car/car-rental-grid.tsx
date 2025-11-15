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
import { useTranslation } from 'react-i18next';

// ================= Empty State Card (inline) =================
function EmptyStateCard({
  title,
  description,
  ctaText,
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
      {onCta && ctaText ? (
        <Button variant="default" onClick={onCta} className="mt-2">
          {ctaText}
        </Button>
      ) : null}
    </Card>
  );
}
// ============================================================

// ✅ Safe number helper
function safeNumber(value: number | null | undefined): number {
  return typeof value === 'number' && !isNaN(value) ? value : 0;
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
  const { t, i18n } = useTranslation('cars');
  const lang = i18n.language || 'en';

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

  if (isLoading) return <p>{t('rental.loading', 'Loading rentals...')}</p>;

  const totalPages = data?.totalPages || 1;
  const isEmpty = (data?.total ?? 0) === 0;

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

  const currency = t('currency', 'DHS');
  const currencyFormatter = (params: any) =>
    params.value || params.value === 0
      ? `${new Intl.NumberFormat(lang).format(params.value)} ${currency}`
      : '';

  const columnDefs = [
    {
      headerName: t('rental.grid.start_date', 'Start Date'),
      field: 'startDate',
      valueFormatter: (p: { value: string }) => {
        if (!p.value) return '';
        const parsed = parseISO(p.value);
        return isValid(parsed) ? format(parsed, 'dd/MM/yyyy') : '';
      },
      flex: 1,
    },
    {
      headerName: t('rental.grid.end_date', 'End Date'),
      field: 'endDate',
      valueFormatter: (p: { value: string | null }) => {
        if (!p.value) return t('rental.ongoing', 'Ongoing');
        const parsed = parseISO(p.value);
        return isValid(parsed)
          ? format(parsed, 'dd/MM/yyyy')
          : t('rental.invalid_date', 'Invalid');
      },
      flex: 1,
    },
    {
      headerName: t('rental.grid.revenue', 'Revenue'),
      field: 'totalPrice',
      valueFormatter: currencyFormatter,
      flex: 1,
    },
    {
      headerName: t('rental.grid.status', 'Status'),
      field: 'status',
      flex: 1,
      valueFormatter: (p: any) =>
        p?.value
          ? t(`rental.status.${p.value}`, {
              defaultValue: p.value.charAt(0).toUpperCase() + p.value.slice(1),
            })
          : '',
    },
  ];

  // Optional: open your create-rental dialog
  const handleCreateRental = () => {
    // TODO: setCreateRentalOpen(true)
  };

  // ===== EMPTY STATE =====
  if (isEmpty) {
    return (
      <div className="w-full max-w-[1200px] mx-auto min-h-[60vh] flex items-center justify-center py-10">
        <EmptyStateCard
          title={t('rental.empty.title', 'No rentals found')}
          description={t(
            'rental.empty.subtitle',
            "This car doesn't have any rental history yet.",
          )}
          ctaText={t('rental.empty.cta', 'Create Rental')}
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
                {t('rental.summary.current', 'Current Rent')}:{' '}
                {format(parseISO(currentRent.startDate), 'dd MMM')} -{' '}
                {currentRent.endDate
                  ? format(parseISO(currentRent.endDate), 'dd MMM')
                  : t('rental.ongoing', 'Ongoing')}
              </h3>
              <Badge variant="warning" className="px-2 py-0.5 text-xs">
                🚗 {t('rental.status.active', 'Active')}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs mb-4">
              <div>
                <p className="text-muted-foreground">
                  {t('rental.summary.total_price', 'Total Price')}
                </p>
                <p className="font-bold text-sm">
                  {new Intl.NumberFormat(lang).format(
                    currentRent.isOpenContract
                      ? safeNumber(currentRent.totalPaid)
                      : safeNumber(currentRent.totalPrice),
                  )}{' '}
                  {currency}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">
                  {t('rental.summary.total_paid', 'Total Paid')}
                </p>
                <p className="font-bold text-sm">
                  {new Intl.NumberFormat(lang).format(
                    safeNumber(currentRent.totalPaid),
                  )}{' '}
                  {currency}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">
                  {t('rental.grid.status', 'Status')}
                </p>
                <p className="font-bold text-sm">
                  {t(`rental.status.${currentRent.status}`, {
                    defaultValue:
                      currentRent.status.charAt(0).toUpperCase() +
                      currentRent.status.slice(1),
                  })}
                </p>
              </div>
            </div>

            {/* ✅ Progress Bar */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                {t('rental.payment_progress.title', 'Payment Progress')}
              </p>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{
                    width: `${
                      Math.min(
                        (safeNumber(currentRent.totalPaid) /
                          Math.max(safeNumber(currentRent.totalPrice), 1)) *
                          100,
                        100,
                      ) || 0
                    }%`,
                  }}
                />
              </div>
              <p className="text-xs mt-1">
                {new Intl.NumberFormat(lang).format(
                  safeNumber(currentRent.totalPaid),
                )}{' '}
                /{' '}
                {new Intl.NumberFormat(lang).format(
                  safeNumber(currentRent.totalPrice),
                )}{' '}
                {currency}
              </p>
            </div>
          </>
        ) : (
          <>
            <h3 className="font-semibold text-base mb-2">
              {t('rental.summary.title', 'Rental Summary')}
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs mb-4">
              <div>
                <p className="text-muted-foreground">
                  {t('rental.summary.total_revenue', 'Total Revenue')}
                </p>
                <p className="font-bold text-sm">
                  {new Intl.NumberFormat(lang).format(
                    safeNumber(financialStats.totalRevenue),
                  )}{' '}
                  {currency}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">
                  {t('rental.summary.total_rentals', 'Total Rentals')}
                </p>
                <p className="font-bold text-sm">{financialStats.totalRents}</p>
              </div>
              <div>
                <p className="text-muted-foreground">
                  {t('rental.summary.avg_price', 'Avg Rent Price')}
                </p>
                <p className="font-bold text-sm">
                  {new Intl.NumberFormat(lang).format(
                    safeNumber(financialStats.avgRentPrice),
                  )}{' '}
                  {currency}
                </p>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* ✅ History Grid */}
      <div className="lg:col-span-2">
        <h3 className="text-md font-semibold mb-2">
          {t('rental.history_title', 'Rentals History')}
        </h3>
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
