'use client';

import { useRef } from 'react';
import { endOfDay } from 'date-fns';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type Target = {
  startDate: string | Date;
  endDate: string | Date;
  targetRevenue?: number;
  actualRevenue?: number;
  targetRents?: number;
  actualRents?: number;
  make?: string;
  model?: string;
  plateNumber?: string;
};

export function TargetsComparison({ data }: { data: Target[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // If parent passes none (after filtering), show empty state
  if (!Array.isArray(data) || data.length === 0) {
    return <div className="p-2 text-sm">No targets data</div>;
  }

  // Compute status from endDate (Active through end of the endDate day)
  const getStatus = (endDate: string | Date) => {
    const end = endOfDay(new Date(endDate));
    return end < new Date() ? 'expired' : 'active';
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { clientWidth } = scrollRef.current;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -clientWidth : clientWidth,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="relative">
      {/* Scroll Buttons */}
      <button
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 hidden sm:flex text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        onClick={() => scroll('left')}
        aria-label="Scroll left"
      >
        <CaretLeft size={40} />
      </button>
      <button
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        onClick={() => scroll('right')}
        aria-label="Scroll right"
      >
        <CaretRight size={40} />
      </button>

      {/* Scrollable Container */}
      <div ref={scrollRef} className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-6 w-max px-10 sm:px-14">
          {data.map((t, i) => {
            const status = getStatus(t.endDate);
            const isActive = status === 'active';

            const daysRemaining = Math.max(
              0,
              Math.ceil(
                (new Date(t.endDate).getTime() - Date.now()) / 86400000,
              ),
            );

            const revenueProgress =
              t.targetRevenue && t.targetRevenue > 0
                ? ((t.actualRevenue ?? 0) / t.targetRevenue) * 100
                : 0;

            const rentsProgress =
              t.targetRents && t.targetRents > 0
                ? ((t.actualRents ?? 0) / t.targetRents) * 100
                : 0;

            return (
              <Card
                key={i}
                className={[
                  'relative overflow-hidden',
                  'min-w-[360px] max-w-[400px] flex-shrink-0 rounded-2xl border shadow-sm',
                  'border-gray-200 bg-white text-gray-900',
                  'bg-[linear-gradient(180deg,rgba(2,6,23,0.03)_0%,rgba(2,6,23,0)_18%)]',
                  'dark:border-border dark:text-gray-100 dark:shadow-lg',
                  'dark:bg-gradient-to-b dark:from-gray-950 dark:to-gray-900',
                ].join(' ')}
              >
                {/* Decorative glows (dark mode) */}
                <div className="pointer-events-none absolute -right-16 -top-16 hidden h-48 w-48 rounded-full bg-red-500/10 blur-3xl dark:block" />
                <div className="pointer-events-none absolute -left-20 -bottom-20 hidden h-56 w-56 rounded-full bg-amber-400/10 blur-3xl dark:block" />

                {/* Top elapsed bar */}
                {(() => {
                  const startDate = new Date(t.startDate);
                  const endDate = new Date(t.endDate);
                  const start = startDate.getTime();
                  const end = endDate.getTime();
                  const now = Date.now();
                  const total = Math.max(1, end - start);

                  const elapsedRatio = Math.max(
                    0,
                    Math.min(1, (now - start) / total),
                  );
                  const elapsedPct = Math.round(elapsedRatio * 100);
                  const daysTotal = Math.max(1, Math.ceil(total / 86400000));
                  const daysElapsed = Math.max(
                    0,
                    Math.min(daysTotal, Math.ceil((now - start) / 86400000)),
                  );
                  const daysRemainingLocal = Math.max(
                    0,
                    daysTotal - daysElapsed,
                  );

                  return (
                    <TooltipProvider delayDuration={150}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="px-4 pt-3">
                            <div
                              className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)] dark:bg-gray-800"
                              role="progressbar"
                              aria-label="Target period progress"
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-valuenow={elapsedPct}
                            >
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-sky-500 via-emerald-500 to-fuchsia-500 dark:from-sky-400 dark:via-emerald-400 dark:to-fuchsia-400"
                                style={{ width: `${elapsedPct}%` }}
                              />
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[280px]">
                          <div className="text-[13px]">
                            <div className="font-medium">
                              Elapsed {elapsedPct}% of period
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {startDate.toLocaleDateString()} –{' '}
                              {endDate.toLocaleDateString()}
                            </div>
                            <div className="mt-1 text-xs">
                              <span className="font-medium">{daysElapsed}</span>{' '}
                              elapsed •{' '}
                              <span className="font-medium">
                                {daysRemainingLocal}
                              </span>{' '}
                              remaining •{' '}
                              <span className="font-medium">{daysTotal}</span>{' '}
                              total days
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })()}

                {/* Header */}
                <div className="pb-3 px-6 pt-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-300">
                      {new Date(t.startDate).toLocaleDateString()} –{' '}
                      {new Date(t.endDate).toLocaleDateString()}
                    </div>
                    {getStatus(t.endDate) === 'active' ? (
                      <span className="text-[11px] px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-300">
                        Active
                      </span>
                    ) : (
                      <span className="text-[11px] px-2 py-1 rounded-md bg-rose-500/15 text-rose-300">
                        Expired
                      </span>
                    )}
                  </div>
                </div>

                <CardContent className="space-y-5 pt-0">
                  {/* Top stats */}
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-800 dark:border-gray-800 dark:bg-[#121621] dark:text-gray-100">
                      <div className="flex items-center gap-2 text-[12px] text-gray-500 dark:text-gray-400">
                        <span className="h-2 w-2 rounded-full bg-amber-500 dark:bg-amber-400" />
                        Days
                      </div>
                      <div className="mt-1 text-lg font-semibold">
                        {daysRemaining}
                      </div>
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-800 dark:border-gray-800 dark:bg-[#121621] dark:text-gray-100">
                      <div className="flex items-center gap-2 text-[12px] text-gray-500 dark:text-gray-400">
                        <span className="h-2 w-2 rounded-full bg-sky-500 dark:bg-sky-400" />
                        Revenue
                      </div>
                      <div className="mt-1 text-lg font-semibold">
                        {revenueProgress.toFixed(1)}%
                      </div>
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-800 dark:border-gray-800 dark:bg-[#121621] dark:text-gray-100">
                      <div className="flex items-center gap-2 text-[12px] text-gray-500 dark:text-gray-400">
                        <span className="h-2 w-2 rounded-full bg-violet-500 dark:bg-violet-400" />
                        Rents
                      </div>
                      <div className="mt-1 text-lg font-semibold">
                        {rentsProgress.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* Breakdown */}
                  <div className="rounded-xl border border-gray-200 bg-white text-gray-800 dark:border-gray-800 dark:bg-[#0f141b] dark:text-gray-200">
                    <div className="border-b border-gray-200 px-4 py-3 text-[12px] uppercase tracking-wide text-gray-600 dark:border-gray-800 dark:text-gray-400">
                      Breakdown
                    </div>
                    <div className="px-4 py-3 space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-amber-500 dark:bg-amber-400" />
                          <span>Soon (≤30d)</span>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                          {daysRemaining}d
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-sky-500 dark:bg-sky-400" />
                          <span>Revenue</span>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300">
                          {revenueProgress.toFixed(1)}%
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-violet-500 dark:bg-violet-400" />
                          <span>Rents</span>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
                          {rentsProgress.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Revenue */}
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <p className="text-sm text-gray-800 dark:text-gray-200">
                        Revenue
                      </p>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {(t.actualRevenue ?? 0).toLocaleString()} /{' '}
                        {(t.targetRevenue ?? 0).toLocaleString()} MAD
                      </span>
                    </div>
                    <Progress
                      value={revenueProgress}
                      className="h-2 rounded-full bg-gray-200 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)] dark:bg-gray-800
                      [&>div]:bg-emerald-600/90 dark:[&>div]:bg-emerald-500/90"
                    />
                  </div>

                  {/* Rents */}
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <p className="text-sm text-gray-800 dark:text-gray-200">
                        Rents
                      </p>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {t.actualRents ?? 0} / {t.targetRents ?? 0}
                      </span>
                    </div>
                    <Progress
                      value={rentsProgress}
                      className="h-2 rounded-full bg-gray-200 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)] dark:bg-gray-800
                      [&>div]:bg-sky-600/90 dark:[&>div]:bg-sky-500/90"
                    />
                  </div>

                  {/* Footer vehicle chip */}
                  <div className="pt-1">
                    <div className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 dark:border-gray-800 dark:bg-[#121621] dark:text-gray-200">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      {t.make} {t.model}
                      {t.plateNumber ? ` • ${t.plateNumber}` : ''}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
