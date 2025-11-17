'use client';

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
} from '@/components/ui/chart';
import { format, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';

type TrendPoint = { date: string; revenue: number; rents: number };

type RevenueChartProps = {
  trends: TrendPoint[];
  prevTrends?: TrendPoint[];
  interval: 'day' | 'week' | 'month';
};

export function RevenueChart({
  trends,
  prevTrends = [],
  interval,
}: RevenueChartProps) {
  const { t } = useTranslation('reports');

  const chartConfig: ChartConfig = {
    revenue: {
      label: t('chart.revenue', 'Revenue'),
      color: 'var(--accent-6)',
    },
    rents: {
      label: t('chart.rents', 'Rents'),
      color: 'var(--gray-8)',
    },
  };

  const safeData = trends || [];

  const formatDate = (date: string) => {
    if (interval === 'month') {
      const [y, m] = date.split('-');
      return `${new Date(Number(y), Number(m) - 1).toLocaleString('en-US', {
        month: 'short',
        year: '2-digit',
      })}`;
    }
    if (interval === 'week' || interval === 'day') {
      try {
        const d = parseISO(date);
        return interval === 'week'
          ? `W${format(d, 'w')} ${format(d, 'MMM')}`
          : format(d, 'MMM d');
      } catch {
        return date;
      }
    }
    return date;
  };

  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto h-[300px] w-full"
    >
      <AreaChart data={safeData}>
        <defs>
          <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor={chartConfig.revenue.color}
              stopOpacity={0.8}
            />
            <stop
              offset="95%"
              stopColor={chartConfig.revenue.color}
              stopOpacity={0.1}
            />
          </linearGradient>
          <linearGradient id="fillRents" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor={chartConfig.rents.color}
              stopOpacity={0.8}
            />
            <stop
              offset="95%"
              stopColor={chartConfig.rents.color}
              stopOpacity={0.1}
            />
          </linearGradient>
        </defs>

        {/* ✅ Horizontal grid lines only */}
        <CartesianGrid
          vertical={false}
          stroke="var(--gray-10)"
          strokeOpacity={0.2}
        />

        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={32}
          tick={{ fill: 'var(--gray-10)', fontSize: 12 }}
          tickFormatter={(value: string) => formatDate(value)}
        />

        {/* ✅ Revenue axis (left) */}
        <YAxis
          orientation="left"
          stroke={chartConfig.revenue.color}
          domain={[0, 'auto']}
          tickCount={6}
          tick={{ fill: 'var(--gray-10)', fontSize: 12 }}
          tickFormatter={(val: number) =>
            val >= 1_000_000
              ? `${(val / 1_000_000).toFixed(1)}M`
              : val >= 1_000
                ? `${(val / 1_000).toFixed(1)}K`
                : `${val}`
          }
          label={{
            value: t('chart.axis_revenue', 'Revenue (DHS)'),
            angle: -90,
            position: 'insideLeft',
            fill: 'var(--muted-foreground)',
            fontSize: 12,
          }}
        />

        {/* ✅ Rents axis (right) */}
        <YAxis
          yAxisId="right"
          orientation="right"
          stroke={chartConfig.rents.color}
          domain={[0, 'auto']}
          tickCount={6}
          tick={{ fill: 'var(--gray-10)', fontSize: 12 }}
          tickFormatter={(val: any) => val}
          label={{
            value: t('chart.axis_rents', 'Rents'),
            angle: 90,
            position: 'insideRight',
            fill: 'var(--muted-foreground)',
            fontSize: 12,
          }}
        />

        {/* ✅ Tooltip */}
        <ChartTooltip
          cursor={false}
          content={(props) => {
            const { active, payload, label } = props as any;
            if (!active || !payload?.length) return null;
            const row = payload[0].payload as TrendPoint;
            const prev = prevTrends.find((d) => d.date === row.date);

            const labelStr =
              typeof label === 'string' ? label : (label?.toString() ?? '');

            return (
              <div className="rounded-md border bg-white dark:bg-neutral-900 p-3 shadow-md text-sm">
                <div className="mb-2 font-medium">{formatDate(labelStr)}</div>
                <div className="flex justify-between items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: chartConfig.revenue.color }}
                  />
                  <span className="flex-1">
                    {t('chart.revenue', 'Revenue')}
                  </span>
                  <span>
                    {new Intl.NumberFormat('en-US').format(row.revenue)} DHS
                  </span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: chartConfig.rents.color }}
                  />
                  <span className="flex-1">{t('chart.rents', 'Rents')}</span>
                  <span>{row.rents}</span>
                </div>
              </div>
            );
          }}
        />

        {/* ✅ Revenue series bound to left axis */}
        <Area
          dataKey="revenue"
          type="monotone"
          fill="url(#fillRevenue)"
          stroke={chartConfig.revenue.color}
          strokeWidth={2}
          name={t('chart.revenue', 'Revenue')}
          dot={false}
          activeDot={{ r: 4 }}
        />

        {/* ✅ Rents series bound to right axis */}
        <Area
          yAxisId="right"
          dataKey="rents"
          type="monotone"
          fill="url(#fillRents)"
          stroke={chartConfig.rents.color}
          strokeWidth={2}
          name={t('chart.rents', 'Rents')}
          dot={false}
          activeDot={{ r: 4 }}
        />

        <ChartLegend
          content={
            <ChartLegendContent payload={undefined} verticalAlign={undefined} />
          }
        />
      </AreaChart>
    </ChartContainer>
  );
}
