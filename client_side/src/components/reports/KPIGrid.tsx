import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type KPIItem = {
  key: string;
  title: string;
  value: string | number;
  textColor?: string;
};

// Update to match backend response exactly
type BackendSnapshot = {
  fleetSize: number;
  periodDays: number;
  rentedDays: number;
  revenueBilled: number;
  revenueCollected: number;
  openAR: number;
  totalMaintenanceCost: number;
  monthlyLeaseTotal: number; // ✅ ADD THIS
  totalRents: number;
  utilization: number;
  adr: number;
  revPar: number;
  netProfit: number;
};

export function KPIGrid({ snapshot }: { snapshot: BackendSnapshot | null }) {
  if (!snapshot) return null;

  const mapping: Record<keyof BackendSnapshot, string> = {
    revenueBilled: 'Revenue (Billed)',
    revenueCollected: 'Revenue (Collected)',
    openAR: 'Open A/R',
    totalRents: 'Total Rents',
    fleetSize: 'Fleet Size',
    utilization: 'Utilization',
    adr: 'ADR',
    revPar: 'RevPAR',
    totalMaintenanceCost: 'Maintenance Costs',
    monthlyLeaseTotal: 'Lease Costs', // ✅ ADD THIS
    netProfit: 'Net Profit',
    periodDays: 'Period Days',
    rentedDays: 'Rented Days',
  };

  const descriptions: Record<keyof BackendSnapshot, string> = {
    revenueBilled:
      'Total revenue invoiced for the selected period (regardless of payment).',
    revenueCollected: 'Cash actually collected during the selected period.',
    openAR: 'Unpaid invoices (Accounts Receivable).',
    totalRents: 'Number of rental contracts in the selected period.',
    fleetSize: 'Total number of vehicles in the fleet.',
    utilization: 'Rented car-days ÷ Available car-days across the period.',
    adr: 'Average revenue per rented day.',
    revPar: 'Revenue per available car-day across the whole fleet.',
    totalMaintenanceCost: 'Total maintenance spend in the period.',
    monthlyLeaseTotal: 'Total lease costs prorated for the selected period.',
    netProfit: 'Collected revenue minus maintenance and lease costs.',
    periodDays: 'Number of calendar days in the selected range.',
    rentedDays: 'Sum of rental days within the period across all cars.',
  };

  const order: Array<keyof BackendSnapshot> = [
    'revenueBilled',
    'revenueCollected',
    'openAR',
    'totalRents',
    'fleetSize',
    'utilization',
    'periodDays',
    'rentedDays',
    'adr',
    'revPar',
    'totalMaintenanceCost',
    'monthlyLeaseTotal',
    'netProfit',
  ];

  const moneyKeys = new Set<keyof BackendSnapshot>([
    'revenueBilled',
    'revenueCollected',
    'openAR',
    'adr',
    'revPar',
    'totalMaintenanceCost',
    'monthlyLeaseTotal',
    'netProfit',
  ]);

  const items: KPIItem[] = order
    .filter((k) => snapshot[k] !== undefined)
    .map((k) => {
      const val = snapshot[k];
      let value: string | number = val;
      let textColor = '';

      if (k === 'utilization' && typeof val === 'number') {
        // Backend returns 0..1, convert to percentage
        value = `${(val * 100).toFixed(1)}%`;
      } else if (moneyKeys.has(k) && typeof val === 'number') {
        value = `${val.toFixed(2)} DHS`;
      } else if (typeof val === 'number') {
        value = val;
      } else if (typeof val !== 'string') {
        value = JSON.stringify(val);
      }

      if (k === 'netProfit' && typeof val === 'number') {
        textColor =
          val >= 0
            ? 'text-green-600 dark:text-green-400'
            : 'text-red-600 dark:text-red-400';
      }

      return {
        key: k,
        title: mapping[k],
        value,
        textColor,
      };
    });

  return (
    <TooltipProvider delayDuration={150}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map((kpi) => (
          <Card
            key={kpi.key}
            className="relative overflow-hidden rounded-xl border shadow-sm border-gray-200 bg-white text-gray-900 bg-[linear-gradient(180deg,rgba(2,6,23,0.03)_0%,rgba(2,6,23,0)_18%)] dark:border-border dark:text-gray-100 dark:shadow-lg dark:bg-gradient-to-b dark:from-gray-950 dark:to-gray-900"
          >
            <CardHeader className="pb-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <CardTitle className="cursor-help text-sm text-gray-700 dark:text-gray-200 flex items-center gap-2">
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
                      {descriptions[kpi.key as keyof BackendSnapshot]}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${kpi.textColor || 'text-gray-900 dark:text-gray-100'}`}
              >
                {kpi.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </TooltipProvider>
  );
}
