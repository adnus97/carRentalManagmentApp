'use client';

import CarDataGrid from './car-data-grid';
import { format } from 'date-fns';
import { MaintenanceLogRow } from '@/types/car-tables';
import { useState, useMemo } from 'react';
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
import { getCarMaintenanceLogs } from '@/api/cars';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import {
  ChartContainer,
  ChartTooltip,
  ChartLegend,
} from '@/components/ui/chart';
import { PieChart, Pie, Cell, TooltipProps } from 'recharts';
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EditMaintenanceDialog } from './edit-maintenance-dialog';
import { Loader } from '@/components/loader';
import { useTranslation } from 'react-i18next';

// ================= Empty State Card =================
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
          🛠️
        </span>
      </div>
      <h3 className="mb-1 text-lg font-semibold">{title}</h3>
      {description ? <p className="mb-6 text-sm">{description}</p> : null}
      {ctaText && onCta ? (
        <Button onClick={onCta} className="mt-2">
          {ctaText}
        </Button>
      ) : null}
    </Card>
  );
}
// =====================================================

// Colors
const COLORS = {
  inspection: '#34d399',
  oil_change: '#6366f1',
  other: '#f59e0b',
  tire_rotation: '#9ca3af',
} as const;

export default function CarMaintenanceLogsGrid({ carId }: { carId: string }) {
  const { t, i18n } = useTranslation('cars');
  const lang = i18n.language || 'en';
  const currency = t('currency', 'DHS');

  // Localized type labels
  const TYPE_LABELS: Record<string, string> = {
    inspection: t('maintenance.types.inspection', 'Inspection'),
    oil_change: t('maintenance.types.oil_change', 'Oil Change'),
    other: t('maintenance.types.other', 'Other'),
    tire_rotation: t('maintenance.types.tire_rotation', 'Tire Rotation'),
  };

  // Badge
  function TypeBadge({ type }: { type: string }) {
    const label = TYPE_LABELS[type] || type;
    switch (type) {
      case 'inspection':
        return <Badge className="bg-[#34d399] text-white">🔍 {label}</Badge>;
      case 'oil_change':
        return <Badge className="bg-[#6366f1] text-white">🛢 {label}</Badge>;
      case 'other':
        return <Badge className="bg-[#f59e0b] text-white">❓ {label}</Badge>;
      case 'tire_rotation':
        return <Badge className="bg-[#9ca3af] text-white">🔄 {label}</Badge>;
      default:
        return <Badge variant="secondary">{label}</Badge>;
    }
  }

  // Custom Pie Tooltip
  function CustomPieTooltip({ active, payload }: TooltipProps<number, string>) {
    if (active && payload && payload.length) {
      const entry = payload[0];
      const rawName = entry?.name ? String(entry.name).toLowerCase() : '';
      const label = TYPE_LABELS[rawName] || entry?.name || '';

      return (
        <div className="rounded-md border shadow-md px-3 py-2 text-xs bg-white text-gray-12 border-gray-200 dark:bg-gray-1 dark:text-white dark:border-gray-700 space-y-1 min-w-[140px]">
          <div className="flex items-center gap-2">
            <span className="font-medium">{label}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>{t('maintenance.fields.cost', 'Cost')}:</span>
            <span className="font-semibold">
              {new Intl.NumberFormat(lang).format(entry.value ?? 0)} {currency}
            </span>
          </div>
        </div>
      );
    }
    return null;
  }

  // Summary card with Pie Chart
  function MaintenanceSummaryCard({ logs }: { logs: MaintenanceLogRow[] }) {
    if (!logs.length) return null;

    const lastLog = logs[0];
    const totalCost = logs.reduce((sum, log) => sum + (log.cost || 0), 0);

    const safeFormatDate = (dateValue: any) => {
      if (!dateValue)
        return t('common.na', { ns: 'common', defaultValue: 'N/A' });
      try {
        const parsed = new Date(dateValue);
        if (isNaN(parsed.getTime()))
          return t('car_details.invalid_date', 'Invalid date');
        return format(parsed, 'dd MMM yyyy');
      } catch {
        return t('car_details.invalid_date', 'Invalid date');
      }
    };

    const breakdown = useMemo(() => {
      const map: Record<string, number> = {};
      logs.forEach((log) => {
        const type = log.type || 'other';
        map[type] = (map[type] || 0) + (log.cost || 0);
      });
      return map;
    }, [logs]);

    const chartData = Object.entries(breakdown).map(([type, cost]) => ({
      name: type,
      value: cost,
    }));

    const chartConfig = {
      inspection: { label: TYPE_LABELS.inspection, color: COLORS.inspection },
      oil_change: { label: TYPE_LABELS.oil_change, color: COLORS.oil_change },
      other: { label: TYPE_LABELS.other, color: COLORS.other },
      tire_rotation: {
        label: TYPE_LABELS.tire_rotation,
        color: COLORS.tire_rotation,
      },
    };

    return (
      <Card className="shadow-lg border border-border hover:shadow-xl transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t('maintenance.summary.title', 'Maintenance Summary')}
          </CardTitle>
          <Wrench className="h-5 w-5 text-orange-500" />
        </CardHeader>
        <CardContent>
          <p className="text-lg font-bold">
            {t('maintenance.summary.last', 'Last')}:{' '}
            {safeFormatDate(lastLog.createdAt)}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {t('maintenance.summary.total_cost', 'Total Cost')}:{' '}
            {new Intl.NumberFormat(lang).format(totalCost)} {currency}
          </p>

          <div className="mt-3 space-y-1 text-sm">
            {Object.entries(breakdown).map(([type, cost]) => (
              <div key={type} className="flex justify-between">
                <span>
                  <TypeBadge type={type} />
                </span>
                <span className="font-semibold">
                  {new Intl.NumberFormat(lang).format(cost)} {currency}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 w-full flex justify-center">
            <ChartContainer config={chartConfig} className="h-64 w-full">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ value }) =>
                    `${new Intl.NumberFormat(lang).format(Number(value) || 0)} ${currency}`
                  }
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        chartConfig[entry.name as keyof typeof chartConfig]
                          ?.color
                      }
                    />
                  ))}
                </Pie>
                <ChartTooltip content={<CustomPieTooltip />} />
                <ChartLegend
                  content={({ payload }) => (
                    <ul className="flex flex-wrap justify-center gap-3 text-xs mt-2 !text-[10px]">
                      {payload?.map((entry, index) => (
                        <li
                          key={`legend-${index}`}
                          className="flex items-center gap-1"
                        >
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: entry.color }}
                          />
                          <span>
                            {TYPE_LABELS[String(entry.value).toLowerCase()] ||
                              entry.value}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                />
              </PieChart>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Pagination and filter state for the GRID (table)
  const [page, setPage] = useState(1);
  const pageSize = 7;
  const [filterType, setFilterType] = useState<string>('all');

  // Paginated query for the table
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

  // SECOND query: get ALL rows for the chart (large pageSize)
  const { data: allDataRes } = useQuery({
    queryKey: ['carMaintenanceLogs_all', carId],
    queryFn: () => getCarMaintenanceLogs(carId, 1, 10000),
    staleTime: 5 * 60 * 1000,
  });
  const allLogs: MaintenanceLogRow[] = allDataRes?.data ?? [];

  const totalPages = data?.totalPages || 1;

  // Full dataset filtered by type (for the CHART)
  const fullFiltered =
    filterType === 'all'
      ? allLogs
      : allLogs.filter((log) => log.type === filterType);

  // Paginated dataset filtered by type (for the GRID)
  const filteredData =
    filterType === 'all'
      ? data.data
      : data.data.filter((log) => log.type === filterType);

  const isEmpty = !isLoading && (data?.total ?? 0) === 0;

  const columnDefs = [
    {
      headerName: t('maintenance.grid.type', 'Type'),
      field: 'type',
      flex: 1,
      cellRenderer: (p: { value: string }) => <TypeBadge type={p.value} />,
    },
    {
      headerName: t('maintenance.grid.description', 'Description'),
      field: 'description',
      flex: 2,
    },
    {
      headerName: t('maintenance.grid.cost', 'Cost'),
      field: 'cost',
      flex: 1,
      valueFormatter: (p: { value: number }) =>
        p.value || p.value === 0
          ? `${new Intl.NumberFormat(lang).format(p.value)} ${currency}`
          : `0 ${currency}`,
    },
    {
      headerName: t('maintenance.grid.created_at', 'Created At'),
      field: 'createdAt',
      width: 160,
      cellRenderer: (params: { value: string }) => {
        if (!params.value) return null;
        const parsed = new Date(params.value);
        const shortDate = format(parsed, 'dd/MM/yyyy');
        const fullDate = format(parsed, 'dd/MM/yyyy HH:mm:ss');

        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help underline decoration-dotted">
                  {shortDate}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">{fullDate}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      headerName: t('maintenance.grid.actions', 'Actions'),
      field: 'actions',
      width: 100,
      pinned: 'right',
      cellRenderer: (p: { data: MaintenanceLogRow }) => (
        <EditMaintenanceDialog log={p.data} carId={p.data.carId} />
      ),
    },
  ];

  if (isLoading)
    return (
      <p>
        <Loader /> {t('maintenance.loading', 'Loading maintenance logs...')}
      </p>
    );

  return (
    <div className="w-full mx-auto min-h-[60vh] flex flex-col">
      {isEmpty ? (
        <div className="flex-1 flex items-center justify-center py-10">
          <EmptyStateCard
            title={t('maintenance.empty.title', 'No maintenance logs')}
            ctaText={t('maintenance.empty.cta', 'No Maintenance history')}
            description={t(
              'maintenance.empty.subtitle',
              'Start by adding a new maintenance.',
            )}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
          <div className="col-span-1 w-full">
            {/* Chart always built from the FULL dataset (optionally filtered by type) */}
            <MaintenanceSummaryCard logs={fullFiltered} />
          </div>

          <div className="col-span-1 lg:col-span-2 w-full">
            <div className="flex justify-end mb-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue
                    placeholder={t(
                      'maintenance.filter.placeholder',
                      'Filter by type',
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t('maintenance.filter.all', 'All')}
                  </SelectItem>
                  <SelectItem value="oil_change">
                    {t('maintenance.types.oil_change', 'Oil Change')}
                  </SelectItem>
                  <SelectItem value="tire_rotation">
                    {t('maintenance.types.tire_rotation', 'Tire Rotation')}
                  </SelectItem>
                  <SelectItem value="inspection">
                    {t('maintenance.types.inspection', 'Inspection')}
                  </SelectItem>
                  <SelectItem value="other">
                    {t('maintenance.types.other', 'Other')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <CarDataGrid<MaintenanceLogRow>
              rowData={filteredData}
              columnDefs={columnDefs}
              autoHeight
            />

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
                      <span key={p}>
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
                      </span>
                    ))}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      aria-disabled={page === totalPages}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
