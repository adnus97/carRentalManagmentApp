import * as React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

type ReportsInsuranceCar = {
  id: string;
  make: string;
  model: string;
  insuranceExpiryDate: string;
  status?: string; // expected 'expired' | 'critical' | 'warning' | 'info' (but we normalize)
};

type ReportsInsurance = {
  total: number;
  expired: number;
  critical: number;
  warning: number;
  info: number;
  cars: ReportsInsuranceCar[];
};

export function InsuranceCard({
  insurance,
}: {
  insurance: ReportsInsurance | null | undefined;
}) {
  if (!insurance) return null;

  const {
    total = 0,
    expired = 0,
    critical = 0,
    warning = 0,
    info = 0,
  } = insurance;
  const cars = Array.isArray(insurance.cars) ? insurance.cars : [];

  const segments = [
    {
      key: 'expired' as const,
      label: 'Expired',
      value: expired,
      color: 'bg-red-600',
      text: 'text-red-600 dark:text-red-500',
    },
    {
      key: 'critical' as const,
      label: '≤3 days',
      value: critical,
      color: 'bg-red-400',
      text: 'text-red-500 dark:text-red-400',
    },
    {
      key: 'warning' as const,
      label: '≤7 days',
      value: warning,
      color: 'bg-amber-500',
      text: 'text-amber-600 dark:text-amber-500',
    },
    {
      key: 'info' as const,
      label: '≤30 days',
      value: info,
      color: 'bg-amber-300',
      text: 'text-amber-600 dark:text-amber-300',
    },
  ];
  type BucketKey = 'expired' | 'critical' | 'warning' | 'info';
  type SortKey = 'soonest' | 'latest' | 'make';

  const [bucket, setBucket] = React.useState<BucketKey>('expired');
  const [sort, setSort] = React.useState<SortKey>('soonest');
  const mapStatusToBucket = (s?: string): BucketKey | undefined => {
    const x = (s || '').toLowerCase().trim();
    if (x === 'expired') return 'expired';
    if (x === 'critical' || x === '<=3d' || x === '≤3d' || x === '3d')
      return 'critical';
    if (x === 'warning' || x === '<=7d' || x === '≤7d' || x === '7d')
      return 'warning';
    if (
      x === 'info' ||
      x === 'soon' ||
      x === '<=30d' ||
      x === '≤30d' ||
      x === '30d'
    )
      return 'info';
    return undefined;
  };

  const bucketFromExpiry = (dateISO?: string): BucketKey | undefined => {
    if (!dateISO) return undefined;
    const end = new Date(dateISO).getTime();
    const now = Date.now();
    const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'expired';
    if (diffDays <= 3) return 'critical';
    if (diffDays <= 7) return 'warning';
    if (diffDays <= 30) return 'info';
    return undefined;
  };

  const formatExpiry = (dateISO?: string) => {
    if (!dateISO) return '';
    const dt = new Date(dateISO);
    const diffMs = dt.getTime() - Date.now();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return diffDays < 0
      ? `Expired ${Math.abs(diffDays)}d ago`
      : `In ${diffDays}d`;
  };

  // Derive the cars to show based on current bucket and sort
  const visibleCars = React.useMemo(() => {
    const filtered = cars.filter((c) => {
      const mapped = mapStatusToBucket(c.status);
      const byDate = mapped || bucketFromExpiry(c.insuranceExpiryDate);
      return byDate === bucket;
    });

    const sorted = [...filtered];
    if (sort === 'soonest' || sort === 'latest') {
      sorted.sort((a, b) => {
        const da = new Date(a.insuranceExpiryDate).getTime();
        const db = new Date(b.insuranceExpiryDate).getTime();
        return sort === 'soonest' ? da - db : db - da;
      });
    } else if (sort === 'make') {
      sorted.sort(
        (a, b) =>
          (a.make || '').localeCompare(b.make || '') ||
          (a.model || '').localeCompare(b.model || ''),
      );
    }
    return sorted;
  }, [cars, bucket, sort]);

  const nonZeroSegments = segments.filter((s) => s.value > 0);
  const totalExpiring = expired + critical + warning + info;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white text-gray-900 shadow-sm dark:border-border dark:bg-gradient-to-b dark:from-gray-950 dark:to-gray-900 dark:text-gray-100 dark:shadow-lg">
      {/* Decorative glow in dark mode */}
      <div className="pointer-events-none absolute -right-16 -top-16 hidden h-48 w-48 rounded-full bg-red-500/10 blur-3xl dark:block" />
      <div className="pointer-events-none absolute -left-20 -bottom-20 hidden h-56 w-56 rounded-full bg-amber-400/10 blur-3xl dark:block" />

      <div className="p-5">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2l7 4v6c0 5-3.8 9.4-7 10-3.2-.6-7-5-7-10V6l7-4z" />
              </svg>
            </span>
            <h3 className="text-lg font-semibold tracking-wide">
              Insurance Risk
            </h3>
          </div>

          <span
            className={[
              'rounded-md px-2 py-0.5 text-xs font-medium',
              totalExpiring === 0
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                : 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
            ].join(' ')}
            title="Items expiring within 30 days"
          >
            {totalExpiring} / {total}
          </span>
        </div>

        {/* Progress */}
        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Expiring within 30 days</span>
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

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Metric
            label="Expired"
            value={expired}
            colorDot="bg-red-600"
            textColor="text-red-600 dark:text-red-400"
          />
          <Metric
            label="Critical (≤3d)"
            value={critical}
            colorDot="bg-red-400"
            textColor="text-red-500 dark:text-red-300"
          />
          <Metric
            label="Warning (≤7d)"
            value={warning}
            colorDot="bg-amber-500"
            textColor="text-amber-600 dark:text-amber-400"
          />
          <Metric
            label="Soon (≤30d)"
            value={info}
            colorDot="bg-amber-300"
            textColor="text-amber-600 dark:text-amber-300"
          />
        </div>

        {/* Breakdown */}
        {nonZeroSegments.length > 0 ? (
          <div className="mt-4 rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900/60">
            <div className="border-b border-gray-100 px-3 py-2 text-xs uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:text-gray-400">
              Breakdown
            </div>
            <ul className="max-h-40 overflow-auto p-2">
              {segments.map((s) =>
                s.value > 0 ? (
                  <li
                    key={s.key}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800/70"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${s.color}`} />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {s.label}
                      </span>
                    </div>
                    <span className="text-sm text-gray-900 dark:text-gray-200">
                      {s.value}{' '}
                      <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                        ({pct(s.value)}%)
                      </span>
                    </span>
                  </li>
                ) : null,
              )}
            </ul>
          </div>
        ) : (
          <div className="mt-4 rounded-md border border-green-100 bg-green-50 p-3 text-center text-sm text-emerald-700 dark:border-gray-800 dark:bg-gray-900/60 dark:text-emerald-300">
            All good — no policies expiring soon.
          </div>
        )}

        {/* Cars at risk */}
        {/* Cars at risk */}
        {cars.length > 0 ? (
          <div className="mt-4 space-y-3">
            {/* Title + shadcn selects on a single line */}
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Cars at risk
              </h4>

              <div className="flex items-center gap-2">
                {/* Bucket select */}
                <Select
                  value={bucket}
                  onValueChange={(v) => setBucket(v as BucketKey)}
                >
                  <SelectTrigger className="h-8 w-[140px] rounded-md border border-gray-200 bg-white text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="critical">≤3 days</SelectItem>
                    <SelectItem value="warning">≤7 days</SelectItem>
                    <SelectItem value="info">≤30 days</SelectItem>
                  </SelectContent>
                </Select>

                {/* Sort select */}
                <Select
                  value={sort}
                  onValueChange={(v) => setSort(v as SortKey)}
                >
                  <SelectTrigger className="h-8 w-[140px] rounded-md border border-gray-200 bg-white text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectItem value="soonest">Soonest</SelectItem>
                    <SelectItem value="latest">Latest</SelectItem>
                    <SelectItem value="make">Make</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Inline chips with fixed height for a stable card */}
            <div className="rounded-lg border border-gray-200 bg-white p-2 dark:border-gray-800 dark:bg-gray-900/40">
              {/* Keep the height constant to avoid card jumping */}
              <div className="flex max-h-[52px] flex-wrap gap-2 overflow-y-auto">
                {visibleCars.length === 0 ? (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    No cars
                  </span>
                ) : (
                  visibleCars.map((c) => {
                    const name =
                      [c.make, c.model].filter(Boolean).join(' ') || 'Unknown';
                    return (
                      <div
                        key={c.id}
                        className="shrink-0 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
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
        ) : null}
      </div>
    </div>
  );
}

function Metric({
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
    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-900/40">
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${colorDot}`} />
        <span className="text-gray-700 dark:text-gray-300">{label}</span>
      </div>
      <span className={`font-medium ${textColor}`}>{value}</span>
    </div>
  );
}

function BucketList({
  title,
  colorDot,
  cars,
}: {
  title: string;
  colorDot: string;
  cars: ReportsInsuranceCar[];
}) {
  const [open, setOpen] = React.useState(true);

  return (
    <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900/40">
      <button
        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800/60"
        onClick={() => setOpen((o) => !o)}
        type="button"
      >
        <span className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${colorDot}`} />
          <span className="text-gray-800 dark:text-gray-200">{title}</span>
        </span>
        <svg
          className={`h-4 w-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" />
        </svg>
      </button>

      {open && (
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {cars.map((c) => {
            const title =
              [c.make, c.model].filter(Boolean).join(' ') || 'Unknown vehicle';

            // Human-friendly expiry text
            let sub: string | undefined;
            if (c.insuranceExpiryDate) {
              const dt = new Date(c.insuranceExpiryDate);
              const now = new Date();
              const diffMs = dt.getTime() - now.getTime();
              const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
              sub =
                diffDays < 0
                  ? `Expired ${Math.abs(diffDays)}d ago`
                  : `Expires in ${diffDays}d`;
            }

            return (
              <div
                key={c.id}
                className="flex items-center justify-between px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <div className="truncate text-gray-800 dark:text-gray-200">
                    {title}
                  </div>
                  {sub && (
                    <div className="truncate text-xs text-gray-500 dark:text-gray-400">
                      {sub}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
