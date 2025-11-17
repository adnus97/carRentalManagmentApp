'use client';

import { useTranslation } from 'react-i18next';

export function OverdueTable({ overdue }: { overdue: any[] }) {
  const { t } = useTranslation('reports');

  if (!overdue.length)
    return <div>{t('overdue.none', 'No overdue rentals')}</div>;

  return (
    <div className="border rounded-md">
      <div className="p-2 font-bold">
        {t('overdue.title', 'Overdue Rentals')}
      </div>
      {overdue.map((r) => (
        <div key={r.id} className="flex justify-between p-2 border-t text-sm">
          <span>
            {t('overdue.contract', 'Contract')} #{r.id}
          </span>
          <span>
            {r.expectedEndDate
              ? new Date(r.expectedEndDate).toLocaleDateString()
              : t('overdue.na', 'N/A')}
          </span>
        </div>
      ))}
    </div>
  );
}
