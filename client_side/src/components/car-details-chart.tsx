'use client';

import * as React from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from './ui/chart';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ✅ Chart config using theme variables
const chartConfig = {
  revenue: {
    label: 'Revenue',
    color: 'var(--accent-6)',
  },
  rents: {
    label: 'Rents',
    color: 'var(--gray-8)',
  },
} satisfies ChartConfig;

type RentalHistoryItem = {
  startDate: string; // ISO date
  endDate: string; // ISO date
  totalPrice: number;
};

export function ChartAreaInteractive({
  rentalHistory,
}: {
  rentalHistory: RentalHistoryItem[];
}) {
  const [timeRange, setTimeRange] = React.useState<'7d' | '30d' | '90d'>('90d');
  const [visibleSeries, setVisibleSeries] = React.useState<
    'both' | 'revenue' | 'rents'
  >('both');

  // Transform rentalHistory into chart data
  const chartData = React.useMemo(() => {
    if (!rentalHistory) return [];

    const grouped: Record<string, { revenue: number; rents: number }> = {};

    rentalHistory.forEach((rental) => {
      const date = new Date(rental.startDate).toISOString().split('T')[0];
      if (!grouped[date]) {
        grouped[date] = { revenue: 0, rents: 0 };
      }
      grouped[date].revenue += rental.totalPrice || 0;
      grouped[date].rents += 1;
    });

    return Object.entries(grouped).map(([date, values]) => ({
      date,
      revenue: values.revenue,
      rents: values.rents,
    }));
  }, [rentalHistory]);

  // Filter + aggregate
  const filteredData = React.useMemo(() => {
    const referenceDate = new Date();
    let daysToSubtract = 90;
    if (timeRange === '30d') daysToSubtract = 30;
    if (timeRange === '7d') daysToSubtract = 7;

    const startDate = new Date(referenceDate);
    startDate.setDate(startDate.getDate() - daysToSubtract);

    const filtered = chartData.filter(
      (item) => new Date(item.date) >= startDate,
    );

    // Fill missing days
    const allDates: string[] = [];
    for (
      let d = new Date(startDate);
      d <= referenceDate;
      d.setDate(d.getDate() + 1)
    ) {
      allDates.push(d.toISOString().split('T')[0]);
    }

    const filled = allDates.map((date) => {
      const found = filtered.find((f) => f.date === date);
      return {
        date,
        revenue: found?.revenue || 0,
        rents: found?.rents || 0,
      };
    });

    // Aggregate by month if 90d
    if (timeRange === '90d') {
      const monthly: Record<string, { revenue: number; rents: number }> = {};
      filled.forEach((item) => {
        const d = new Date(item.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
          2,
          '0',
        )}`;
        if (!monthly[key]) {
          monthly[key] = { revenue: 0, rents: 0 };
        }
        monthly[key].revenue += item.revenue;
        monthly[key].rents += item.rents;
      });

      return Object.entries(monthly).map(([month, values]) => ({
        date: month,
        revenue: values.revenue,
        rents: values.rents,
      }));
    }

    return filled;
  }, [chartData, timeRange]);

  return (
    <Card className="pt-0 h-full">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b py-5">
        <div className="grid flex-1 gap-1">
          <CardTitle>Revenue & Rents Over Time</CardTitle>
          <CardDescription>
            Showing revenue and rents for the selected period
          </CardDescription>
        </div>
        <div className="flex gap-2">
          {/* Time Range Selector */}
          <Select
            value={timeRange}
            onValueChange={(v) => setTimeRange(v as any)}
          >
            <SelectTrigger
              className="hidden w-[140px] rounded-lg sm:flex"
              aria-label="Select a value"
            >
              <SelectValue placeholder="Last 3 months" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d">Last 3 months</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
            </SelectContent>
          </Select>

          {/* Series Toggle */}
          <Select
            value={visibleSeries}
            onValueChange={(v) => setVisibleSeries(v as any)}
          >
            <SelectTrigger
              className="hidden w-[120px] rounded-lg sm:flex"
              aria-label="Select series"
            >
              <SelectValue placeholder="Both" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="both">Both</SelectItem>
              <SelectItem value="revenue">Revenue</SelectItem>
              <SelectItem value="rents">Rents</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
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

            <CartesianGrid vertical={false} strokeOpacity={0.2} />

            {/* X Axis */}
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
              tickFormatter={(value) => {
                const date = new Date(value);
                if (timeRange === '90d') {
                  return date.toLocaleDateString('en-US', {
                    month: 'short',
                    year: '2-digit',
                  });
                }
                return date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                });
              }}
            />

            {/* Y Axes */}
            <YAxis
              yAxisId="left"
              orientation="left"
              stroke={chartConfig.revenue.color}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            />
            <YAxis
              label={() => {
                return <div>Hello</div>;
              }}
              yAxisId="right"
              orientation="right"
              stroke={chartConfig.rents.color}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            />

            {/* ✅ Tooltip with type-safe mapping + DHS + growth */}
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  className="space-y-1 text-[13px]"
                  style={{ color: 'var(---muted-foreground)' }}
                  labelFormatter={(value) => {
                    const date = new Date(value);
                    if (timeRange === '90d') {
                      return date.toLocaleDateString('en-US', {
                        month: 'long',
                        year: 'numeric',
                      });
                    }
                    return date.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    });
                  }}
                  formatter={(value, name, props) => {
                    const key = props.dataKey as keyof typeof chartConfig;
                    const config = chartConfig[key];

                    // Format value
                    const formattedValue =
                      key === 'revenue'
                        ? `${new Intl.NumberFormat('en-US').format(value as number)} DHS`
                        : new Intl.NumberFormat('en-US').format(
                            value as number,
                          );

                    // Calculate growth vs previous point
                    const index = props?.payload?.index ?? -1;
                    let growth: string | null = null;
                    if (index > 0 && filteredData[index - 1]) {
                      const prev = filteredData[index - 1][key] as number;
                      const curr = value as number;
                      if (prev > 0) {
                        const pct = ((curr - prev) / prev) * 100;
                        growth = `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
                      }
                    }

                    return [
                      <div className="flex w-44 justify-between items-center gap-2">
                        {/* Colored dot */}
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: config.color }}
                        />
                        <span className="flex-1 font-medium capitalize">
                          {config.label}
                        </span>
                        <span>{formattedValue}</span>
                        {growth && (
                          <span
                            className={`ml-2 text-xs ${
                              growth.startsWith('+')
                                ? 'text-green-500'
                                : 'text-red-500'
                            }`}
                          >
                            {growth}
                          </span>
                        )}
                      </div>,
                    ]; // ✅
                  }}
                  indicator="dot"
                />
              }
            />

            {/* Series */}
            {(visibleSeries === 'both' || visibleSeries === 'revenue') && (
              <Area
                yAxisId="left"
                dataKey="revenue"
                type="monotone"
                fill="url(#fillRevenue)"
                stroke={chartConfig.revenue.color}
                strokeWidth={2}
              />
            )}
            {(visibleSeries === 'both' || visibleSeries === 'rents') && (
              <Area
                yAxisId="right"
                dataKey="rents"
                type="monotone"
                fill="url(#fillRents)"
                stroke={chartConfig.rents.color}
                strokeWidth={2}
              />
            )}

            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
