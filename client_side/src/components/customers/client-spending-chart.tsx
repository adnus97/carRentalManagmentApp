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
} from '@/components/ui/chart';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ✅ Chart config
const chartConfig = {
  spending: {
    label: 'Spending (MAD)',
    color: 'var(--accent-6)',
  },
  rentals: {
    label: 'Rentals',
    color: 'var(--gray-8)',
  },
} satisfies ChartConfig;

type RentalHistoryItem = {
  startDate: string; // ISO date
  totalPaid: number;
};

export function ClientSpendingChart({
  rentalHistory,
}: {
  rentalHistory: RentalHistoryItem[];
}) {
  const [timeRange, setTimeRange] = React.useState<'7d' | '30d' | '90d'>('90d');
  const [visibleSeries, setVisibleSeries] = React.useState<
    'both' | 'spending' | 'rentals'
  >('both');

  // ✅ Step 1: Build daily chart data
  const chartData = React.useMemo(() => {
    if (!rentalHistory) return [];

    const grouped: Record<string, { spending: number; rentals: number }> = {};

    rentalHistory.forEach((rental, i) => {
      console.log('Rental item', i, rental); // 👈 log raw rental
      const date = new Date(rental.startDate).toISOString().split('T')[0];
      if (!grouped[date]) {
        grouped[date] = { spending: 0, rentals: 0 };
      }
      console.log('Before add:', grouped[date]);
      grouped[date].spending += rental.totalPaid ?? 0; // 👈 fallback
      grouped[date].rentals += 1;
      console.log('After add:', grouped[date]);
    });

    const result = Object.entries(grouped)
      .map(([date, values]) => ({
        date,
        spending: values.spending,
        rentals: values.rentals,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    console.log('Final chartData:', result);
    return result;
  }, [rentalHistory]);

  // ✅ Step 2: Filter + aggregate + fill missing
  const filteredData = React.useMemo(() => {
    const referenceDate = new Date();
    let daysToSubtract = 90;
    if (timeRange === '30d') daysToSubtract = 30;
    if (timeRange === '7d') daysToSubtract = 7;

    const startDate = new Date(referenceDate);
    startDate.setDate(startDate.getDate() - daysToSubtract);

    // Filter by range
    const filtered = chartData.filter(
      (item) => new Date(item.date) >= startDate,
    );

    // ✅ If 90d → aggregate by month
    if (timeRange === '90d') {
      const monthly: Record<string, { spending: number; rentals: number }> = {};
      filtered.forEach((item) => {
        const d = new Date(item.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
          2,
          '0',
        )}`;
        if (!monthly[key]) {
          monthly[key] = { spending: 0, rentals: 0 };
        }
        monthly[key].spending += item.spending;
        monthly[key].rentals += item.rentals;
      });

      // ✅ Fill missing months
      const months: string[] = [];
      const startMonth = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        1,
      );
      const endMonth = new Date(
        referenceDate.getFullYear(),
        referenceDate.getMonth(),
        1,
      );

      for (
        let d = new Date(startMonth);
        d <= endMonth;
        d.setMonth(d.getMonth() + 1)
      ) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
          2,
          '0',
        )}`;
        months.push(key);
      }

      return months.map((month) => ({
        date: month + '-01', // ✅ valid date
        spending: monthly[month]?.spending || 0,
        rentals: monthly[month]?.rentals || 0,
      }));
    }
    console.log('Filtered data for', timeRange, filteredData);
    // ✅ For 7d / 30d → fill missing days
    const allDates: string[] = [];
    for (
      let d = new Date(startDate);
      d <= referenceDate;
      d.setDate(d.getDate() + 1)
    ) {
      allDates.push(d.toISOString().split('T')[0]);
    }

    return allDates.map((date) => {
      const found = filtered.find((f) => f.date === date);
      return {
        date,
        spending: found?.spending || 0,
        rentals: found?.rentals || 0,
      };
    });
  }, [chartData, timeRange]);

  return (
    <Card className="pt-0 h-full">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b py-5">
        <div className="grid flex-1 gap-1">
          <CardTitle>Client Spending Over Time</CardTitle>
          <CardDescription>
            Showing spending and rentals for the selected period
          </CardDescription>
        </div>
        <div className="flex gap-2">
          {/* Time Range Selector */}
          <Select
            value={timeRange}
            onValueChange={(v) => setTimeRange(v as any)}
          >
            <SelectTrigger className="hidden w-[140px] rounded-lg sm:flex">
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
            <SelectTrigger className="hidden w-[120px] rounded-lg sm:flex">
              <SelectValue placeholder="Both" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="both">Both</SelectItem>
              <SelectItem value="spending">Spending</SelectItem>
              <SelectItem value="rentals">Rentals</SelectItem>
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
              {/* Gradient for Spending */}
              <linearGradient id="fillSpending" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={chartConfig.spending.color}
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor={chartConfig.spending.color}
                  stopOpacity={0.05}
                />
              </linearGradient>
              {/* Gradient for Rentals */}
              <linearGradient id="fillRentals" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={chartConfig.rentals.color}
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor={chartConfig.rentals.color}
                  stopOpacity={0.05}
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
                const d = new Date(value);
                return timeRange === '90d'
                  ? d.toLocaleDateString('en-US', {
                      month: 'short',
                      year: '2-digit',
                    })
                  : d.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    });
              }}
            />

            {/* Y Axes */}
            <YAxis
              yAxisId="left"
              orientation="left"
              stroke={chartConfig.spending.color}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke={chartConfig.rentals.color}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            />

            {/* Tooltip */}
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  className="space-y-1 text-[13px]"
                  labelFormatter={(value) => {
                    const d = new Date(value);
                    return timeRange === '90d'
                      ? d.toLocaleDateString('en-US', {
                          month: 'long',
                          year: 'numeric',
                        })
                      : d.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        });
                  }}
                  formatter={(value, name, props) => {
                    const key = props.dataKey as keyof typeof chartConfig;
                    const config = chartConfig[key];
                    const formattedValue =
                      key === 'spending'
                        ? `${new Intl.NumberFormat('en-US').format(
                            value as number,
                          )} MAD`
                        : new Intl.NumberFormat('en-US').format(
                            value as number,
                          );

                    return [
                      <div className="flex w-44 justify-between items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: config.color }}
                        />
                        <span className="flex-1 font-medium capitalize">
                          {config.label}
                        </span>
                        <span>{formattedValue}</span>
                      </div>,
                    ];
                  }}
                  indicator="dot"
                />
              }
            />

            {/* Series */}
            {(visibleSeries === 'both' || visibleSeries === 'spending') && (
              <Area
                yAxisId="left"
                dataKey="spending"
                type="monotone"
                fill="url(#fillSpending)"
                stroke={chartConfig.spending.color}
                strokeWidth={2}
                activeDot={{ r: 4 }}
              />
            )}
            {(visibleSeries === 'both' || visibleSeries === 'rentals') && (
              <Area
                yAxisId="right"
                dataKey="rentals"
                type="monotone"
                fill="url(#fillRentals)"
                stroke={chartConfig.rentals.color}
                strokeWidth={2}
                activeDot={{ r: 4 }}
              />
            )}

            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
