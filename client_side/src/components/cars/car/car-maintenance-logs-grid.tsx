'use client';

import CarDataGrid from './car-data-grid';
import { format } from 'date-fns';
import { MaintenanceLogRow } from '@/types/car-tables';
import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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

// Charts
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

// ================= Empty State Card (inline) =================
function EmptyStateCard({
  title,
  description,
  ctaText = 'Add Maintenance',
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
      <h3 className="mb-1 text-lg font-semibold ">{title}</h3>
      {description ? <p className="mb-6 text-sm ">{description}</p> : null}
    </Card>
  );
}
// ============================================================

// Unified color palette
const COLORS = {
  inspection: '#34d399', // teal
  oil_change: '#6366f1', // indigo
  other: '#f59e0b', // amber
  tire_rotation: '#9ca3af', // gray
};

// Friendly labels
const TYPE_LABELS: Record<string, string> = {
  inspection: 'Inspection',
  oil_change: 'Oil Change',
  other: 'Other',
  tire_rotation: 'Tire Rotation',
};

// Badge renderer
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
    const label = entry?.name
      ? TYPE_LABELS[String(entry.name).toLowerCase()] || entry.name
      : '';

    return (
      <div
        className="
          rounded-md border shadow-md px-3 py-2 text-xs
          bg-white text-gray-12 border-gray-200
          dark:bg-gray-1 dark:text-white dark:border-gray-700
          space-y-1 min-w-[140px]
        "
      >
        <div className="flex items-center gap-2">
          <span className="font-medium">{label}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Cost:</span>
          <span className="font-semibold">
            {entry.value?.toLocaleString()} MAD
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
    if (!dateValue) return 'N/A';
    try {
      const parsed = new Date(dateValue);
      if (isNaN(parsed.getTime())) return 'Invalid date';
      return format(parsed, 'dd MMM yyyy');
    } catch {
      return 'Invalid date';
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
    inspection: { label: 'Inspection', color: COLORS.inspection },
    oil_change: { label: 'Oil Change', color: COLORS.oil_change },
    other: { label: 'Other', color: COLORS.other },
    tire_rotation: { label: 'Tire Rotation', color: COLORS.tire_rotation },
  };

  return (
    <Card className="shadow-lg border border-border hover:shadow-xl transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Maintenance Summary
        </CardTitle>
        <Wrench className="h-5 w-5 text-orange-500" />
      </CardHeader>
      <CardContent>
        <p className="text-lg font-bold">
          Last: {safeFormatDate(lastLog.createdAt)}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Total Cost: {totalCost.toLocaleString()} MAD
        </p>

        <div className="mt-3 space-y-1 text-sm">
          {Object.entries(breakdown).map(([type, cost]) => (
            <div key={type} className="flex justify-between">
              <span>
                <TypeBadge type={type} />
              </span>
              <span className="font-semibold">{cost.toLocaleString()} MAD</span>
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
                label={({ value }) => `${value?.toLocaleString()} MAD`}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      chartConfig[entry.name as keyof typeof chartConfig]?.color
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
                        <span>{TYPE_LABELS[entry.value] || entry.value}</span>
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

export default function CarMaintenanceLogsGrid({ carId }: { carId: string }) {
  const [page, setPage] = useState(1);
  const pageSize = 7;
  const [filterType, setFilterType] = useState<string>('all');
  const queryClient = useQueryClient();

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

  const totalPages = data?.totalPages || 1;

  const getPageNumbers = () => {
    const pages: number[] = [];
    for (let p = 1; p <= totalPages; p++) {
      if (p === 1 || p === totalPages || (p >= page - 2 && p <= page + 2)) {
        pages.push(p);
      }
    }
    return pages;
  };

  const filteredData =
    filterType === 'all'
      ? data.data
      : data.data.filter((log) => log.type === filterType);

  const isEmpty = !isLoading && (data?.total ?? 0) === 0;

  const columnDefs = [
    {
      headerName: 'Type',
      field: 'type',
      flex: 1,
      cellRenderer: (p: { value: string }) => <TypeBadge type={p.value} />,
    },
    { headerName: 'Description', field: 'description', flex: 2 },
    {
      headerName: 'Cost',
      field: 'cost',
      flex: 1,
      valueFormatter: (p: { value: number }) =>
        p.value ? `${p.value.toLocaleString()} MAD` : '0 MAD',
    },
    {
      headerName: 'Created At',
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
      headerName: 'Actions',
      field: 'actions',
      width: 100,
      pinned: 'right',
      cellRenderer: (p: { data: MaintenanceLogRow }) => (
        <EditMaintenanceDialog log={p.data} carId={p.data.carId} />
      ),
    },
  ];

  const handleAddMaintenance = () => {
    // TODO: open your "Add Maintenance" dialog/sheet here
    // Example: setAddDialogOpen(true)
  };

  if (isLoading)
    return (
      <p>
        <Loader />
        Loading maintenance logs...
      </p>
    );

  return (
    <div className="w-full  mx-auto min-h-[60vh] flex flex-col">
      {/* Title / actions row – keep your top toolbar here if needed */}

      {/* Empty state centered in the main container */}
      {isEmpty ? (
        <div className="flex-1 flex items-center justify-center py-10">
          <EmptyStateCard
            title="No maintenance logs"
            ctaText="No Maintenance history"
            description="Start by adding a new maintenance."
          />
        </div>
      ) : (
        // Content row: summary (left) + grid (right)
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
          <div className="col-span-1 w-full">
            <MaintenanceSummaryCard logs={filteredData} />
          </div>

          <div className="col-span-1 lg:col-span-2 w-full">
            <div className="flex justify-end mb-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="oil_change">Oil Change</SelectItem>
                  <SelectItem value="tire_rotation">Tire Rotation</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
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
                  {getPageNumbers().map((p, idx, arr) => (
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
