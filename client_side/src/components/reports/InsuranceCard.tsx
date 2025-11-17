import * as React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useTranslation } from 'react-i18next';

type ReportsInsuranceCar = {
  id: string;
  make: string;
  model: string;
  insuranceExpiryDate: string;
  status?: string;
};

type ReportsInsurance = {
  total: number;
  expired: number;
  critical: number;
  warning: number;
  info: number;
  cars: ReportsInsuranceCar[];
};

const EMPTY_DATA: ReportsInsurance = {
  total: 0,
  expired: 0,
  critical: 0,
  warning: 0,
  info: 0,
  cars: [],
};

export function InsuranceCard({
  insurance,
  technicalVisit,
  showTechnicalVisit,
}: {
  insurance: ReportsInsurance | null | undefined;
  technicalVisit: ReportsInsurance | null | undefined;
  showTechnicalVisit: boolean;
}) {
  const { t } = useTranslation('reports');

  const [bucket, setBucket] = React.useState<
    'expired' | 'critical' | 'warning' | 'info'
  >('expired');
  const [sort, setSort] = React.useState<'soonest' | 'latest' | 'make'>(
    'soonest',
  );

  const insuranceData = insurance || EMPTY_DATA;
  const technicalVisitData = technicalVisit || EMPTY_DATA;
  const currentData = showTechnicalVisit ? technicalVisitData : insuranceData;

  const dateLabel = showTechnicalVisit
    ? t('labels.technical_visit', 'technical visit')
    : t('labels.insurance', 'insurance');

  const {
    total = 0,
    expired = 0,
    critical = 0,
    warning = 0,
    info = 0,
    cars = [],
  } = currentData;

  const segments = [
    {
      key: 'expired' as const,
      label: t('segments.expired', 'Expired'),
      value: expired,
      color: 'bg-red-600',
      text: 'text-red-600 dark:text-red-500',
    },
    {
      key: 'critical' as const,
      label: t('segments.le3', '≤3 days'),
      value: critical,
      color: 'bg-red-400',
      text: 'text-red-500 dark:text-red-400',
    },
    {
      key: 'warning' as const,
      label: t('segments.le7', '≤7 days'),
      value: warning,
      color: 'bg-amber-500',
      text: 'text-amber-600 dark:text-amber-500',
    },
    {
      key: 'info' as const,
      label: t('segments.le30', '≤30 days'),
      value: info,
      color: 'bg-amber-300',
      text: 'text-amber-600 dark:text-amber-300',
    },
  ];

  const mapStatusToBucket = React.useCallback((s?: string) => {
    const x = (s || '').toLowerCase().trim();
    if (x === 'expired') return 'expired' as const;
    if (x === 'critical' || x === '<=3d' || x === '≤3d' || x === '3d')
      return 'critical' as const;
    if (x === 'warning' || x === '<=7d' || x === '≤7d' || x === '7d')
      return 'warning' as const;
    if (
      x === 'info' ||
      x === 'soon' ||
      x === '<=30d' ||
      x === '≤30d' ||
      x === '30d'
    )
      return 'info' as const;
    return undefined;
  }, []);

  const bucketFromExpiry = React.useCallback((dateISO?: string) => {
    if (!dateISO) return undefined;
    const end = new Date(dateISO).getTime();
    const now = Date.now();
    const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'expired' as const;
    if (diffDays <= 3) return 'critical' as const;
    if (diffDays <= 7) return 'warning' as const;
    if (diffDays <= 30) return 'info' as const;
    return undefined;
  }, []);

  const formatExpiry = React.useCallback(
    (dateISO?: string) => {
      if (!dateISO) return '';
      const dt = new Date(dateISO);
      const diffMs = dt.getTime() - Date.now();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return diffDays < 0
        ? t('format.expired_ago', 'Expired {{d}}d ago', {
            d: Math.abs(diffDays),
          })
        : t('format.in_days', 'In {{d}}d', { d: diffDays });
    },
    [t],
  );

  const visibleCars = React.useMemo(() => {
    if (!Array.isArray(cars)) return [];

    const filtered = cars.filter((c) => {
      const mapped = mapStatusToBucket(c?.status);
      const byDate = mapped || bucketFromExpiry(c?.insuranceExpiryDate);
      return byDate === bucket;
    });

    const sorted = [...filtered];
    if (sort === 'soonest' || sort === 'latest') {
      sorted.sort((a, b) => {
        const da = new Date(a?.insuranceExpiryDate || 0).getTime();
        const db = new Date(b?.insuranceExpiryDate || 0).getTime();
        return sort === 'soonest' ? da - db : db - da;
      });
    } else if (sort === 'make') {
      sorted.sort(
        (a, b) =>
          (a?.make || '').localeCompare(b?.make || '') ||
          (a?.model || '').localeCompare(b?.model || ''),
      );
    }
    return sorted;
  }, [cars, bucket, sort, mapStatusToBucket, bucketFromExpiry]);

  const nonZeroSegments = React.useMemo(
    () => segments.filter((s) => s.value > 0),
    [segments],
  );

  const totalExpiring = expired + critical + warning + info;
  const pct = React.useCallback(
    (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0),
    [total],
  );

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="flex items-center justify-between">
        <span
          className={[
            'rounded-md px-3 py-1.5 text-sm font-medium',
            totalExpiring === 0
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
              : 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
          ].join(' ')}
        >
          {totalExpiring} / {total}{' '}
          {t('summary.expiring_within_30', 'expiring within 30 days')}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {t('summary.expiring_within_30', 'Expiring within 30 days')}
          </span>
          <span>{pct(totalExpiring)}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div className="flex h-full">
            {segments.map((s) => {
              const width = total > 0 ? (s.value / total) * 100 : 0;
              if (width <= 0) return null;
              return (
                <div
                  key={s.key}
                  className={`${s.color} h-full`}
                  style={{ width: `${width}%` }}
                  title={`${s.label}: ${s.value} (${pct(s.value)}%)`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        {segments.map((segment) => (
          <Metric
            key={segment.key}
            label={segment.label}
            value={segment.value}
            colorDot={segment.color}
            textColor={segment.text}
          />
        ))}
      </div>

      {/* Breakdown */}
      {nonZeroSegments.length > 0 ? (
        <div className="rounded-lg border bg-card p-3">
          <div className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t('breakdown.title', 'Breakdown')}
          </div>
          <ul>
            {nonZeroSegments.map((s) => (
              <li
                key={s.key}
                className="flex items-center justify-between rounded-md p-2 hover:bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${s.color}`} />
                  <span className="text-sm">{s.label}</span>
                </div>
                <span className="text-sm font-medium">
                  {s.value}{' '}
                  <span className="text-xs text-muted-foreground">
                    ({pct(s.value)}%)
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-center text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
          {t('empty.all_good', 'All good — no {{label}} expiring soon.', {
            label: dateLabel,
          })}
        </div>
      )}

      {/* Cars at Risk */}
      {total > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold">
              {t('cars.at_risk', 'Cars at risk')}
            </h4>

            <div className="flex items-center gap-2">
              <Select
                value={bucket}
                onValueChange={(v) => setBucket(v as typeof bucket)}
              >
                <SelectTrigger className="h-8 w-fit">
                  <SelectValue placeholder={t('filters.bucket', 'Category')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expired">
                    {t('segments.expired', 'Expired')}
                  </SelectItem>
                  <SelectItem value="critical">
                    {t('segments.le3', '≤3 days')}
                  </SelectItem>
                  <SelectItem value="warning">
                    {t('segments.le7', '≤7 days')}
                  </SelectItem>
                  <SelectItem value="info">
                    {t('segments.le30', '≤30 days')}
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={sort}
                onValueChange={(v) => setSort(v as typeof sort)}
              >
                <SelectTrigger className="h-8 w-fit">
                  <SelectValue placeholder={t('filters.sort', 'Sort by')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="soonest">
                    {t('filters.soonest', 'Soonest')}
                  </SelectItem>
                  <SelectItem value="latest">
                    {t('filters.latest', 'Latest')}
                  </SelectItem>
                  <SelectItem value="make">
                    {t('filters.make', 'Make')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-3">
            <div className="flex max-h-[80px] flex-wrap gap-2 overflow-y-auto">
              {visibleCars.length === 0 ? (
                <span className="text-sm text-muted-foreground">
                  {t('cars.none_in_category', 'No cars in this category')}
                </span>
              ) : (
                visibleCars.map((c) => {
                  if (!c) return null;
                  const name =
                    [c.make, c.model].filter(Boolean).join(' ') ||
                    t('cars.unknown', 'Unknown');
                  return (
                    <div
                      key={c.id || Math.random()}
                      className="shrink-0 rounded-md border bg-muted/50 px-2 py-1 text-xs"
                      title={`${name} • ${formatExpiry(c.insuranceExpiryDate)}`}
                    >
                      {name}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const Metric = React.memo(function Metric({
  label,
  value,
  colorDot,
  textColor,
}: {
  label: string;
  value: number;
  colorDot: string;
  textColor: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-card p-3">
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${colorDot}`} />
        <span className="text-sm">{label}</span>
      </div>
      <span className={`font-medium ${textColor}`}>{value}</span>
    </div>
  );
});
