'use client';

import { useQuery } from '@tanstack/react-query';
import { getReportSummary } from '@/api/reports';
import { getCars } from '@/api/cars';
import { useState, useEffect, useMemo } from 'react';
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
import {
  RefreshCcw,
  Download,
  BarChart3,
  Car,
  AlertCircle,
} from 'lucide-react';
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
import { Switch } from '../ui/switch';
import { Calendar } from '@phosphor-icons/react';
import { endOfDay } from 'date-fns';
import { useTranslation } from 'react-i18next';

// Toggle component
function ModeToggle({
  mode,
  onChange,
}: {
  mode: 'preset' | 'custom';
  onChange: (m: 'preset' | 'custom') => void;
}) {
  const { t } = useTranslation('reports');
  return (
    <Select
      value={mode}
      onValueChange={(v) => onChange(v as 'preset' | 'custom')}
    >
      <SelectTrigger className="w-[160px]">
        <Value placeholder={t('reports.mode_placeholder', 'Select mode')} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="preset">
          {t('reports.mode_preset', 'Preset Filters')}
        </SelectItem>
        <SelectItem value="custom">
          {t('reports.mode_custom', 'Custom Range')}
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

export default function ReportsPage() {
  const { t } = useTranslation('reports');

  const [mode, setMode] = useState<'preset' | 'custom'>('preset');
  const [preset, setPreset] = useState<Preset>('last30d');
  const [from, setFrom] = useState<Date | undefined>();
  const [to, setTo] = useState<Date | undefined>();
  const [carId, setCarId] = useState<'all' | string>('all');

  const [showTechnicalVisit, setShowTechnicalVisit] = useState(false);
  // NEW: include expired targets toggle
  const [includeExpiredTargets, setIncludeExpiredTargets] = useState(false);

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

  const dateError = useMemo(() => {
    if (mode === 'custom' && from && to) {
      if (to <= from)
        return t(
          'reports.err_end_after_start',
          'End date must be after start date',
        );
      const daysDiff = Math.ceil(
        (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysDiff > 365)
        return t('reports.err_max_range', 'Date range cannot exceed 365 days');
    }
    return null;
  }, [mode, from, to, t]);

  // Reports data
  const { data, isLoading, refetch } = useQuery({
    queryKey: [
      'reports:summary',
      from?.toISOString(),
      to?.toISOString(),
      carId,
      mode,
    ],
    queryFn: () =>
      getReportSummary({
        from,
        to,
        ...(carId !== 'all' ? { carId } : {}),
      }),
    enabled: !!from && !!to && !dateError,
    placeholderData: (prev) => prev,
  });

  const riskTitle = showTechnicalVisit
    ? t('reports.technical_inspection_risk', 'Technical Inspection Risk')
    : t('reports.insurance_risk', 'Insurance Risk');

  // Helper to compute target status (Active through end of endDate)
  const isTargetActive = (endDate: string | Date) =>
    endOfDay(new Date(endDate)) >= new Date();

  // Filter targets based on includeExpiredTargets toggle
  const visibleTargets = useMemo(() => {
    const targets = data?.targets || [];
    if (includeExpiredTargets) return targets;
    // default: show only active targets
    return targets.filter((t: any) => isTargetActive(t.endDate));
  }, [data?.targets, includeExpiredTargets]);

  return (
    <div className="w-full mx-auto px-3 sm:px-4 lg:px-6 space-y-8 pt-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-accent-6/15 p-2">
            <BarChart3 className="h-6 w-6 text-accent-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight">
              {t('reports.title', 'Reports')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t(
                'reports.subtitle',
                'Fleet performance, revenue, risk, and trends',
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            {t('reports.refresh', 'Refresh')}
          </Button>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            {t('reports.export_csv', 'Export CSV')}
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
              <SelectValue
                placeholder={t('reports.select_period', 'Select period')}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">
                {t('reports.preset_today', 'Today')}
              </SelectItem>
              <SelectItem value="yesterday">
                {t('reports.preset_yesterday', 'Yesterday')}
              </SelectItem>
              <SelectItem value="last7d">
                {t('reports.preset_last7', 'Last 7 days')}
              </SelectItem>
              <SelectItem value="last30d">
                {t('reports.preset_last30', 'Last 30 days')}
              </SelectItem>
              <SelectItem value="last90d">
                {t('reports.preset_last90', 'Last 90 days')}
              </SelectItem>
              <SelectItem value="thisYear">
                {t('reports.preset_this_year', 'This Year')}
              </SelectItem>
              <SelectItem value="prevMonth">
                {t('reports.preset_prev_month', 'Previous Month')}
              </SelectItem>
              <SelectItem value="prevTrimester">
                {t('reports.preset_prev_trimester', 'Previous Trimester')}
              </SelectItem>
              <SelectItem value="prevSemester">
                {t('reports.preset_prev_semester', 'Previous Semester')}
              </SelectItem>
              <SelectItem value="prevYear">
                {t('reports.preset_prev_year', 'Previous Year')}
              </SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Custom Date Range */}
        {mode === 'custom' && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {t('reports.from', 'From:')}
              </span>
              <DatePickerDemo
                value={from}
                onChange={setFrom}
                placeholder={t('reports.start_date', 'Start date')}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {t('reports.to', 'To:')}
              </span>
              <DatePickerDemo
                value={to}
                onChange={setTo}
                placeholder={t('reports.end_date', 'End date')}
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
                      ? `${
                          carsQ.data?.data.find((c: any) => c.id === carId)
                            ?.plateNumber ?? ''
                        } • ${
                          carsQ.data?.data.find((c: any) => c.id === carId)
                            ?.make
                        } ${
                          carsQ.data?.data.find((c: any) => c.id === carId)
                            ?.model
                        } ${
                          carsQ.data?.data.find((c: any) => c.id === carId)
                            ?.year
                        }`
                      : t('reports.all_cars', 'All Cars')}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {carsQ.data?.data.find((c: any) => c.id === carId)
                    ? `${
                        carsQ.data?.data.find((c: any) => c.id === carId)
                          ?.plateNumber ?? ''
                      } ${
                        carsQ.data?.data.find((c: any) => c.id === carId)?.make
                      } ${
                        carsQ.data?.data.find((c: any) => c.id === carId)?.model
                      } ${
                        carsQ.data?.data.find((c: any) => c.id === carId)?.year
                      }`
                    : t('reports.all_cars', 'All Cars')}
                </TooltipContent>
              </Tooltip>
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t('reports.all_cars', 'All Cars')}
            </SelectItem>
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

        {/* Date Error Display */}
        {dateError && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/50 dark:text-red-400 px-3 py-2 rounded-md">
            <AlertCircle className="h-4 w-4" />
            {dateError}
          </div>
        )}

        {/* Date Range Display */}
        {from && to && !dateError && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
            <Calendar className="h-4 w-4" />
            {from.toLocaleDateString()} → {to.toLocaleDateString()}
            <span className="text-xs">
              (
              {Math.ceil(
                (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24),
              )}{' '}
              {t('reports.days', 'days')})
            </span>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <RefreshCcw className="h-6 w-6 animate-spin mr-2" />
          <span>{t('reports.loading', 'Loading reports...')}</span>
        </div>
      )}

      {/* Error State */}
      {dateError && (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <AlertCircle className="h-6 w-6 mr-2" />
          <span>
            {t(
              'reports.fix_date_range',
              'Please fix the date range to view reports',
            )}
          </span>
        </div>
      )}

      {/* Content */}
      {!dateError && data?.snapshot && (
        <>
          <KPIGrid snapshot={data.snapshot} />

          <Card className="shadow-lg rounded-xl">
            <CardHeader className="pb-3 border-b">
              <CardTitle>
                {t(
                  'reports.revenue_rents_over_time',
                  'Revenue & Rents Over Time',
                )}
              </CardTitle>
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
                <CardTitle className="flex items-center justify-between">
                  <span>
                    {t('reports.targets_vs_actuals', 'Targets vs Actuals')}
                  </span>
                  {/* NEW: Include Expired Targets Toggle */}
                  <div className="flex items-center gap-2">
                    <Switch
                      id="targets-include-expired"
                      checked={includeExpiredTargets}
                      onCheckedChange={setIncludeExpiredTargets}
                    />
                    <label
                      htmlFor="targets-include-expired"
                      className="text-sm font-normal text-muted-foreground cursor-pointer select-none"
                    >
                      {t('reports.include_expired', 'Include expired')}
                    </label>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <TargetsComparison data={visibleTargets} />
              </CardContent>
            </Card>

            <Card className="shadow-lg rounded-xl">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3">
                    <span>{riskTitle}</span>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="technical-visit-toggle"
                        checked={showTechnicalVisit}
                        onCheckedChange={setShowTechnicalVisit}
                      />
                      <label
                        htmlFor="technical-visit-toggle"
                        className="text-sm font-normal text-muted-foreground cursor-pointer select-none"
                      >
                        {t(
                          'reports.insurance_and_technical',
                          '(Insurance & Technical inspection)',
                        )}
                      </label>
                    </div>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <InsuranceCard
                  insurance={data?.insurance}
                  technicalVisit={data?.technicalVisit}
                  showTechnicalVisit={showTechnicalVisit}
                />
              </CardContent>
            </Card>
          </div>

          {/* Leaderboard + Overdue */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-lg rounded-xl">
              <CardHeader className="pb-3 border-b">
                <CardTitle>
                  {t('reports.top_cars_by_revenue', 'Top Cars by Revenue')}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <TopCarsTable cars={data?.topCars || []} />
              </CardContent>
            </Card>

            <Card className="shadow-lg rounded-xl">
              <CardHeader className="pb-3 border-b">
                <CardTitle>{t('overdue.title', 'Overdue Rentals')}</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <OverdueTable overdue={data?.overdue || []} />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
