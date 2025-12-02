'use client';

import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { endOfDay } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTranslation } from 'react-i18next';

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

function useCardsPerView1900() {
  const [ppv, setPpv] = useState(1);
  useLayoutEffect(() => {
    const update = () => setPpv(window.innerWidth >= 1900 ? 2 : 1);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return ppv;
}

function useContainerWidth(ref: React.RefObject<HTMLElement>) {
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const cw = entry.contentRect.width;
      setW(cw);
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

export function TargetsComparison({ data }: { data: Target[] }) {
  const { t } = useTranslation('reports');

  const scrollRef = useRef<HTMLDivElement>(null);
  const cardsPerView = useCardsPerView1900();
  const containerWidth = useContainerWidth(scrollRef);

  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="p-2 text-sm">{t('targets.none', 'No targets data')}</div>
    );
  }

  // Layout constants
  const outerPaddingX = 32; // px, the px-8 (8*4) we use on the scroller
  const gap = 24; // px, gap-6 (6*4)
  const totalGaps = gap * (cardsPerView - 1);

  // Compute card width from real container width
  const cardWidth = useMemo(() => {
    if (!containerWidth) return 360;
    const innerWidth = Math.max(
      0,
      containerWidth - outerPaddingX * 2, // scroller left/right padding
    );
    const raw = (innerWidth - totalGaps) / cardsPerView;
    // clamp so cards never get absurdly narrow/huge
    return Math.max(340, Math.min(raw, 620));
  }, [containerWidth, cardsPerView, totalGaps]);

  const getStatus = (endDate: string | Date) => {
    const end = endOfDay(new Date(endDate));
    return end < new Date() ? 'expired' : 'active';
  };

  const scrollPage = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({
      left: direction === 'left' ? -el.clientWidth : el.clientWidth,
      behavior: 'smooth',
    });
  };

  return (
    <div className="relative">
      {/* Arrows */}
      <button
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 hidden sm:flex items-center justify-center
                   h-10 w-10 rounded-full bg-black/30 hover:bg-black/50 text-white"
        onClick={() => scrollPage('left')}
        aria-label={t('targets.scroll_left', 'Scroll left')}
      >
        <CaretLeft size={22} />
      </button>
      <button
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center
                   h-10 w-10 rounded-full bg-black/30 hover:bg-black/50 text-white"
        onClick={() => scrollPage('right')}
        aria-label={t('targets.scroll_right', 'Scroll right')}
      >
        <CaretRight size={22} />
      </button>

      {/* Track */}
      <div
        ref={scrollRef}
        className="overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory px-8"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        <div className="flex w-max" style={{ gap }}>
          {data.map((tgt, i) => {
            const daysRemaining = Math.max(
              0,
              Math.ceil(
                (new Date(tgt.endDate).getTime() - Date.now()) / 86400000,
              ),
            );
            const revenueProgress =
              tgt.targetRevenue && tgt.targetRevenue > 0
                ? ((tgt.actualRevenue ?? 0) / tgt.targetRevenue) * 100
                : 0;
            const rentsProgress =
              tgt.targetRents && tgt.targetRents > 0
                ? ((tgt.actualRents ?? 0) / tgt.targetRents) * 100
                : 0;

            return (
              <div
                key={i}
                className="snap-start"
                style={{
                  width: cardWidth,
                  minWidth: cardWidth,
                  maxWidth: cardWidth,
                }}
              >
                <Card
                  className={[
                    'relative overflow-hidden',
                    'rounded-2xl border shadow-sm',
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
                    const startDate = new Date(tgt.startDate);
                    const endDate = new Date(tgt.endDate);
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
                                aria-label={t(
                                  'targets.period_progress',
                                  'Target period progress',
                                )}
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
                                {t(
                                  'targets.elapsed_of_period',
                                  'Elapsed {{pct}}% of period',
                                  { pct: elapsedPct },
                                )}
                              </div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                {startDate.toLocaleDateString()} –{' '}
                                {endDate.toLocaleDateString()}
                              </div>
                              <div className="mt-1 text-xs">
                                <span className="font-medium">
                                  {daysElapsed}
                                </span>{' '}
                                {t('targets.elapsed', 'elapsed')} •{' '}
                                <span className="font-medium">
                                  {daysRemainingLocal}
                                </span>{' '}
                                {t('targets.remaining', 'remaining')} •{' '}
                                <span className="font-medium">{daysTotal}</span>{' '}
                                {t('targets.total_days', 'total days')}
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
                        {new Date(tgt.startDate).toLocaleDateString()} –{' '}
                        {new Date(tgt.endDate).toLocaleDateString()}
                      </div>
                      {getStatus(tgt.endDate) === 'active' ? (
                        <span className="text-[11px] px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-300">
                          {t('targets.active', 'Active')}
                        </span>
                      ) : (
                        <span className="text-[11px] px-2 py-1 rounded-md bg-rose-500/15 text-rose-300">
                          {t('targets.expired', 'Expired')}
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
                          {t('targets.days', 'Days')}
                        </div>
                        <div className="mt-1 text-lg font-semibold">
                          {daysRemaining}
                        </div>
                      </div>

                      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-800 dark:border-gray-800 dark:bg-[#121621] dark:text-gray-100">
                        <div className="flex items-center gap-2 text-[12px] text-gray-500 dark:text-gray-400">
                          <span className="h-2 w-2 rounded-full bg-sky-500 dark:bg-sky-400" />
                          {t('chart.revenue', 'Revenue')}
                        </div>
                        <div className="mt-1 text-lg font-semibold">
                          {revenueProgress.toFixed(1)}%
                        </div>
                      </div>

                      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-800 dark:border-gray-800 dark:bg-[#121621] dark:text-gray-100">
                        <div className="flex items-center gap-2 text-[12px] text-gray-500 dark:text-gray-400">
                          <span className="h-2 w-2 rounded-full bg-violet-500 dark:bg-violet-400" />
                          {t('chart.rents', 'Rents')}
                        </div>
                        <div className="mt-1 text-lg font-semibold">
                          {rentsProgress.toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    {/* Breakdown */}
                    <div className="rounded-xl border border-gray-200 bg-white text-gray-800 dark:border-gray-800 dark:bg-[#0f141b] dark:text-gray-200">
                      <div className="border-b border-gray-200 px-4 py-3 text-[12px] uppercase tracking-wide text-gray-600 dark:border-gray-800 dark:text-gray-400">
                        {t('targets.breakdown', 'Breakdown')}
                      </div>
                      <div className="px-4 py-3 space-y-3 text-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-amber-500 dark:bg-amber-400" />
                            <span>{t('targets.soon', 'Soon (≤30d)')}</span>
                          </div>
                          <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                            {daysRemaining}d
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-sky-500 dark:bg-sky-400" />
                            <span>{t('chart.revenue', 'Revenue')}</span>
                          </div>
                          <span className="text-xs px-2 py-0.5 rounded bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300">
                            {revenueProgress.toFixed(1)}%
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-violet-500 dark:bg-violet-400" />
                            <span>{t('chart.rents', 'Rents')}</span>
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
                          {t('chart.revenue', 'Revenue')}
                        </p>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {(tgt.actualRevenue ?? 0).toLocaleString()} /{' '}
                          {(tgt.targetRevenue ?? 0).toLocaleString()}{' '}
                          {t('currency', 'MAD')}
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
                          {t('chart.rents', 'Rents')}
                        </p>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {tgt.actualRents ?? 0} / {tgt.targetRents ?? 0}
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
                        {tgt.make} {tgt.model}
                        {tgt.plateNumber ? ` • ${tgt.plateNumber}` : ''}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
