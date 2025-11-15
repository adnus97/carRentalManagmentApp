import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Target, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface TargetStatsCardsProps {
  currentRevenue?: number | null;
  targetRevenue?: number | null;
  currentRents?: number | null;
  targetRents?: number | null;
  daysRemaining?: number;
}

export default function TargetStatsCards({
  currentRevenue,
  targetRevenue,
  currentRents,
  targetRents,
  daysRemaining,
}: TargetStatsCardsProps) {
  const { t } = useTranslation('cars');

  const safeCurrentRevenue = currentRevenue ?? 0;
  const safeTargetRevenue = targetRevenue ?? 0;
  const safeCurrentRents = currentRents ?? 0;
  const safeTargetRents = targetRents ?? 0;

  const revenueProgress =
    safeTargetRevenue > 0
      ? ((safeCurrentRevenue / safeTargetRevenue) * 100).toFixed(1)
      : '0';

  const rentsProgress =
    safeTargetRents > 0
      ? ((safeCurrentRents / safeTargetRents) * 100).toFixed(1)
      : '0';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
      {/* Revenue Card */}
      <Card className="shadow-lg border border-border hover:shadow-xl transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t('targets.cards.revenue.title', 'Target Revenue')}
          </CardTitle>
          <TrendingUp className="h-5 w-5 text-green-500" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">
            {safeCurrentRevenue.toLocaleString()} /{' '}
            {safeTargetRevenue.toLocaleString()} {t('currency', 'DHS')}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {t('targets.cards.revenue.progress', {
              defaultValue: '{{pct}}% of target reached',
              pct: revenueProgress,
            })}
          </p>
          <div className="w-full bg-muted rounded-full h-2 mt-3">
            <div
              className="bg-green-500 h-2 rounded-full"
              style={{ width: `${revenueProgress}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Rents Card */}
      <Card className="shadow-lg border border-border hover:shadow-xl transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t('targets.cards.rents.title', 'Target Rents')}
          </CardTitle>
          <Target className="h-5 w-5 text-blue-500" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">
            {safeCurrentRents.toLocaleString()} /{' '}
            {safeTargetRents.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {t('targets.cards.rents.progress', {
              defaultValue: '{{pct}}% of target reached',
              pct: rentsProgress,
            })}
          </p>
          <div className="w-full bg-muted rounded-full h-2 mt-3">
            <div
              className="bg-blue-500 h-2 rounded-full"
              style={{ width: `${rentsProgress}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Days Remaining Card */}
      <Card className="shadow-lg border border-border hover:shadow-xl transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t('targets.cards.days.title', 'Days Remaining')}
          </CardTitle>
          <Calendar className="h-5 w-5 text-orange-500" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">
            {t('targets.cards.days.value', {
              defaultValue: '{{days}} days',
              days: daysRemaining ?? 0,
            })}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {t('targets.cards.days.subtitle', 'until target end date')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
