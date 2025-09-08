import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type KPIItem = {
  key: string; // keep the original key so we can pick the right tooltip
  title: string;
  value: string | number;
};

export function KPIGrid({ snapshot }: { snapshot: any }) {
  if (!snapshot) return null;

  const mapping: Record<string, string> = {
    revenueBilled: 'Revenue (Billed)',
    revenueCollected: 'Revenue (Collected)',
    openAR: 'Open A/R',
    totalRents: 'Total Rents',
    fleetSize: 'Fleet Size',
    utilization: 'Utilization',
    adr: 'ADR',
    revPar: 'RevPAR',
    finalRevenue: 'Final Revenue',
    provisionalRevenue: 'Provisional Revenue',
  };

  // Short, practical explanations for titles
  const descriptions: Record<string, string> = {
    revenueBilled:
      'Total revenue invoiced for the selected period (regardless of collection).',
    revenueCollected:
      'Cash actually collected for the selected period (payments received).',
    openAR:
      'Outstanding customer balances not yet collected (Accounts Receivable).',
    totalRents:
      'Number of rental contracts completed/active during the selected period.',
    fleetSize: 'Total number of vehicles in the fleet.',
    utilization:
      'Percentage of fleet days that were rented vs available (Rented days / Available days).',
    adr: 'Average Daily Rate: average revenue per rented day (currency per day).',
    revPar:
      'Revenue per Available Car: average revenue across all available fleet days (includes idle vehicles).',
    finalRevenue:
      'Finalized revenue after adjustments, discounts, or corrections.',
    provisionalRevenue:
      'Provisional revenue before final reconciliation or adjustments.',
  };

  const items: KPIItem[] = Object.entries(snapshot).map(([key, val]) => {
    let value: string | number;
    if (typeof val === 'string' || typeof val === 'number') {
      value = val;
    } else {
      value = JSON.stringify(val);
    }
    if (key === 'revenueBilled' && typeof val === 'number')
      value = `${val.toFixed(2)} DHS`;
    if (key === 'revenueCollected' && typeof val === 'number')
      value = `${val.toFixed(2)} DHS`;
    if (key === 'openAR' && typeof val === 'number')
      value = `${val.toFixed(2)} DHS`;
    if (key === 'utilization' && typeof val === 'number')
      value = `${val.toFixed(1)}%`;
    if (key === 'adr' && typeof val === 'number')
      value = `${val.toFixed(2)} DHS`;
    if (key === 'revPar' && typeof val === 'number')
      value = `${val.toFixed(2)} DHS`;

    return { key, title: mapping[key] ?? key, value };
  });

  return (
    <TooltipProvider delayDuration={150}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map((kpi) => (
          <Card
            key={kpi.title}
            className={[
              'relative overflow-hidden rounded-xl border shadow-sm',
              // Light mode
              'border-gray-200 bg-white text-gray-900',
              'bg-[linear-gradient(180deg,rgba(2,6,23,0.03)_0%,rgba(2,6,23,0)_18%)]',
              // Dark mode (Insurance style)
              'dark:border-border dark:text-gray-100 dark:shadow-lg',
              'dark:bg-gradient-to-b dark:from-gray-950 dark:to-gray-900',
            ].join(' ')}
          >
            {/* Dark-mode glow orbs */}
            <div className="pointer-events-none absolute -right-12 -top-12 hidden h-32 w-32 rounded-full bg-red-500/10 blur-3xl dark:block" />
            <div className="pointer-events-none absolute -left-14 -bottom-14 hidden h-36 w-36 rounded-full bg-amber-400/10 blur-3xl dark:block" />

            <CardHeader className="pb-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <CardTitle className="cursor-help text-sm text-gray-700 dark:text-gray-200">
                    {kpi.title}
                  </CardTitle>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  align="start"
                  className="max-w-[280px]"
                >
                  <div className="text-[13px]">
                    <div className="font-medium">{kpi.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {descriptions[kpi.key] ?? 'Key performance indicator'}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </CardHeader>

            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {typeof kpi.value === 'number' || typeof kpi.value === 'string'
                  ? kpi.value
                  : JSON.stringify(kpi.value)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </TooltipProvider>
  );
}
