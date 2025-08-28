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

// ✅ Import Recharts wrapper
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { PieChart, Pie, Cell } from 'recharts';
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

// ✅ Unified color palette
const COLORS = {
  inspection: '#34d399', // teal
  oil_change: '#6366f1', // indigo
  other: '#f59e0b', // amber
  tire_rotation: '#9ca3af', // gray
};

// ✅ Badge renderer
function TypeBadge({ type }: { type: string }) {
  switch (type) {
    case 'inspection':
      return <Badge className="bg-[#34d399] text-white">🔍 Inspection</Badge>;
    case 'oil_change':
      return <Badge className="bg-[#6366f1] text-white">🛢 Oil Change</Badge>;
    case 'other':
      return <Badge className="bg-[#f59e0b] text-white">❓ Other</Badge>;
    case 'tire_rotation':
      return (
        <Badge className="bg-[#9ca3af] text-white">🔄 Tire Rotation</Badge>
      );
    default:
      return <Badge variant="secondary">{type}</Badge>;
  }
}

// ✅ Summary card with Pie Chart
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
                label
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
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend
                content={<ChartLegendContent />}
                className="text-[10px] space-x-2"
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

  // ✅ Pagination numbers with ellipsis (like CarTargetsGrid)
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
  ];

  if (isLoading) return <p>Loading maintenance logs...</p>;

  return (
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
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  aria-disabled={page === totalPages}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </div>
  );
}
