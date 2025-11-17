'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTranslation } from 'react-i18next';

// Update to match backend response exactly
type BackendSnapshot = {
  fleetSize: number;
  periodDays: number;
  rentedDays: number;
  revenueBilled: number;
  revenueCollected: number;
  openAR: number;
  totalMaintenanceCost: number;
  monthlyLeaseTotal: number; // ✅
  totalRents: number;
  utilization: number; // 0..1
  adr: number;
  revPar: number;
  netProfit: number;
};

type KPIItem = {
  key: keyof BackendSnapshot;
  title: string;
  value: string;
  textColor?: string;
};

export function KPIGrid({ snapshot }: { snapshot: BackendSnapshot | null }) {
  const { t, i18n } = useTranslation('reports');
  if (!snapshot) return null;

  // Number formatters
  // Force US-style separators for money: 13,200.50
  const nf2 = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  // Integers (days, counts) can still use locale if you prefer; to force US too, set to 'en-US'
  const nf0 = new Intl.NumberFormat(i18n.language || 'en', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  // Keys -> titles (reports.json)
  const titleKey: Record<keyof BackendSnapshot, string> = {
    revenueBilled: 'kpi.revenue_billed',
    revenueCollected: 'kpi.revenue_collected',
    openAR: 'kpi.open_ar',
    totalRents: 'kpi.total_rents',
    fleetSize: 'kpi.fleet_size',
    utilization: 'kpi.utilization',
    adr: 'kpi.adr',
    revPar: 'kpi.revpar',
    totalMaintenanceCost: 'kpi.maintenance_costs',
    monthlyLeaseTotal: 'kpi.lease_costs',
    netProfit: 'kpi.net_profit',
    periodDays: 'kpi.period_days',
    rentedDays: 'kpi.rented_days',
  };

  // Keys -> descriptions (reports.json)
  const descKey: Record<keyof BackendSnapshot, string> = {
    revenueBilled: 'kpi_desc.revenue_billed',
    revenueCollected: 'kpi_desc.revenue_collected',
    openAR: 'kpi_desc.open_ar',
    totalRents: 'kpi_desc.total_rents',
    fleetSize: 'kpi_desc.fleet_size',
    utilization: 'kpi_desc.utilization',
    adr: 'kpi_desc.adr',
    revPar: 'kpi_desc.revpar',
    totalMaintenanceCost: 'kpi_desc.maintenance_costs',
    monthlyLeaseTotal: 'kpi_desc.lease_costs',
    netProfit: 'kpi_desc.net_profit',
    periodDays: 'kpi_desc.period_days',
    rentedDays: 'kpi_desc.rented_days',
  };

  // Order of the cards
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
      const raw = snapshot[k];
      let value = '';
      let textColor = '';

      if (k === 'utilization' && typeof raw === 'number') {
        value = `${(raw * 100).toFixed(1)}%`;
      } else if (moneyKeys.has(k) && typeof raw === 'number') {
        // Force 13,200.50 style
        value = `${nf2.format(raw)} DHS`;
      } else if (typeof raw === 'number') {
        // plain integers (days, counts)
        value = nf0.format(raw);
      } else {
        value = String(raw ?? '');
      }

      if (k === 'netProfit' && typeof raw === 'number') {
        textColor =
          raw >= 0
            ? 'text-green-600 dark:text-green-400'
            : 'text-red-600 dark:text-red-400';
      }

      return {
        key: k,
        title: t(titleKey[k]),
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
            className="relative overflow-hidden rounded-xl border shadow-sm
                       border-gray-200 bg-white text-gray-900
                       bg-[linear-gradient(180deg,rgba(2,6,23,0.03)_0%,rgba(2,6,23,0)_18%)]
                       dark:border-border dark:text-gray-100 dark:shadow-lg
                       dark:bg-gradient-to-b dark:from-gray-950 dark:to-gray-900"
          >
            <CardHeader className="pb-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <CardTitle className="cursor-help text-xs sm:text-sm text-gray-700 dark:text-gray-200 flex items-center gap-2">
                    {kpi.title}
                  </CardTitle>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  align="start"
                  className="max-w-[320px]"
                >
                  <div className="text-[13px]">
                    <div className="font-medium">{kpi.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {t(descKey[kpi.key])}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </CardHeader>

            <CardContent>
              <div
                className={`text-xl sm:text-2xl font-bold leading-tight tracking-tight
                            ${kpi.textColor || 'text-gray-900 dark:text-gray-100'}`}
                style={{
                  wordBreak: 'break-word',
                }}
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
