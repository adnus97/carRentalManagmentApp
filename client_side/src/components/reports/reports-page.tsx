'use client';

import { useQuery } from '@tanstack/react-query';
import { getReportSummary } from '@/api/reports';
import { getCars } from '@/api/cars';
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { KPIGrid } from './KPIGrid';
import { TopCarsTable } from './TopCarsTable';
import { OverdueTable } from './OverdueTable';
import { InsuranceCard } from './InsuranceCard';
import { TargetsComparison } from './TargetsComparison';
import { RefreshCcw, Download, BarChart3, Car } from 'lucide-react';
import type { Preset } from '@/api/reports';
import { RevenueChart } from './RevenueChart';
import { DatePickerDemo } from '../date-picker';
import { resolvePreset } from '@/utils/resolvePreset';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Value } from '@radix-ui/react-select';

// Toggle component
function ModeToggle({
  mode,
  onChange,
}: {
  mode: 'preset' | 'custom';
  onChange: (m: 'preset' | 'custom') => void;
}) {
  return (
    <Select
      value={mode}
      onValueChange={(v) => onChange(v as 'preset' | 'custom')}
    >
      <SelectTrigger className="w-[160px]">
        <Value placeholder="Select mode" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="preset">Preset Filters</SelectItem>
        <SelectItem value="custom">Custom Range</SelectItem>
      </SelectContent>
    </Select>
  );
}

export default function ReportsPage() {
  const [mode, setMode] = useState<'preset' | 'custom'>('preset');
  const [preset, setPreset] = useState<Preset>('last30d');
  const [from, setFrom] = useState<Date | undefined>();
  const [to, setTo] = useState<Date | undefined>();
  const [carId, setCarId] = useState<'all' | string>('all');

  // Cars for filter
  const carsQ = useQuery({
    queryKey: ['cars:org'],
    queryFn: () => getCars(1, 500),
  });

  // Auto-update from/to when preset changes
  useEffect(() => {
    if (mode === 'preset' && preset) {
      const { from, to } = resolvePreset(preset);
      setFrom(from);
      setTo(to);
    }
  }, [preset, mode]);

  // Reports data
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['reports:summary', from, to, carId],
    queryFn: () =>
      getReportSummary({
        from,
        to,
        ...(carId !== 'all' ? { carId } : {}),
      }),
    enabled: !!from && !!to, // only run when dates are set
    placeholderData: (prev) => prev,
  });

  return (
    <div className="w-full mx-auto px-3 sm:px-4 lg:px-6 space-y-8 pt-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-accent-6/15 p-2">
            <BarChart3 className="h-6 w-6 text-accent-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight">Reports</h1>
            <p className="text-sm text-muted-foreground">
              Fleet performance, revenue, risk, and trends
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="z-30 bg-background/80 backdrop-blur border rounded-lg p-3 flex flex-wrap gap-3 shadow-sm items-center">
        {/* Mode Toggle */}
        <ModeToggle mode={mode} onChange={setMode} />

        {/* Preset Filter */}
        {mode === 'preset' && (
          <Select value={preset} onValueChange={(v) => setPreset(v as Preset)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="last7d">Last 7 days</SelectItem>
              <SelectItem value="last30d">Last 30 days</SelectItem>
              <SelectItem value="last90d">Last 90 days</SelectItem>
              <SelectItem value="thisYear">This Year</SelectItem>
              <SelectItem value="prevMonth">Previous Month</SelectItem>
              <SelectItem value="prevTrimester">Previous Trimester</SelectItem>
              <SelectItem value="prevSemester">Previous Semester</SelectItem>
              <SelectItem value="prevYear">Previous Year</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Custom Date Range */}
        {mode === 'custom' && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">From:</span>
              <DatePickerDemo
                value={from}
                onChange={setFrom}
                placeholder="Start date"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">To:</span>
              <DatePickerDemo
                value={to}
                onChange={setTo}
                placeholder="End date"
              />
            </div>
          </>
        )}

        {/* Car Filter */}
        <Select value={carId} onValueChange={(v) => setCarId(v)}>
          <SelectTrigger className="w-[240px]">
            <div className="flex items-center gap-2 overflow-hidden">
              <Car className="h-4 w-4 opacity-70 shrink-0" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="truncate whitespace-nowrap overflow-hidden max-w-[180px]">
                    {carsQ.data?.data.find((c: any) => c.id === carId)
                      ? `${carsQ.data?.data.find((c: any) => c.id === carId)?.plateNumber ?? ''} • ${
                          carsQ.data?.data.find((c: any) => c.id === carId)
                            ?.make
                        } ${carsQ.data?.data.find((c: any) => c.id === carId)?.model} ${
                          carsQ.data?.data.find((c: any) => c.id === carId)
                            ?.year
                        }`
                      : 'All Cars'}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {carsQ.data?.data.find((c: any) => c.id === carId)
                    ? `${carsQ.data?.data.find((c: any) => c.id === carId)?.plateNumber ?? ''} • ${
                        carsQ.data?.data.find((c: any) => c.id === carId)?.make
                      } ${carsQ.data?.data.find((c: any) => c.id === carId)?.model} ${
                        carsQ.data?.data.find((c: any) => c.id === carId)?.year
                      }`
                    : 'All Cars'}
                </TooltipContent>
              </Tooltip>
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cars</SelectItem>
            {(carsQ.data?.data || []).map((c: any) => (
              <SelectItem key={c.id} value={c.id}>
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 opacity-70 shrink-0" />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="truncate whitespace-nowrap overflow-hidden max-w-[200px]">
                        {c.plateNumber ? `${c.plateNumber} • ` : ''}
                        {c.make} {c.model} {c.year}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      {c.plateNumber ? `${c.plateNumber} • ` : ''}
                      {c.make} {c.model} {c.year}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <KPIGrid snapshot={data?.snapshot} />

      {/* Revenue Chart */}
      <Card className="shadow-lg rounded-xl">
        <CardHeader className="pb-3 border-b">
          <CardTitle>Revenue & Rents Over Time</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <RevenueChart
            trends={data?.trends || []}
            prevTrends={data?.prevTrends || []}
            interval={data?.filters.interval || 'day'}
          />
        </CardContent>
      </Card>

      {/* Targets + Insurance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-lg rounded-xl">
          <CardHeader className="pb-3 border-b">
            <CardTitle>Targets vs Actuals</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <TargetsComparison data={data?.targets || []} />
          </CardContent>
        </Card>
        <Card className="shadow-lg rounded-xl">
          <CardHeader className="pb-3 border-b">
            <CardTitle>Insurance Risk</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <InsuranceCard insurance={data?.insurance} />
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard + Overdue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-lg rounded-xl">
          <CardHeader className="pb-3 border-b">
            <CardTitle>Top Cars by Revenue</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <TopCarsTable cars={data?.topCars || []} />
          </CardContent>
        </Card>

        <Card className="shadow-lg rounded-xl">
          <CardHeader className="pb-3 border-b">
            <CardTitle>Overdue Rentals</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <OverdueTable overdue={data?.overdue || []} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
