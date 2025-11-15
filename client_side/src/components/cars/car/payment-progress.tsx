'use client';

import { RentalRow } from '@/types/car-tables';
import { useTranslation } from 'react-i18next';

export default function PaymentProgress({ rent }: { rent: RentalRow }) {
  const { t } = useTranslation('cars');

  const totalPrice = rent.totalPrice ?? 0;
  const totalPaid = rent.totalPaid ?? 0;
  const progress =
    totalPrice > 0 ? Math.min((totalPaid / totalPrice) * 100, 100) : 0;

  return (
    <div className="mt-3">
      <p className="text-xs text-muted-foreground mb-1">
        {t('rental.payment_progress.title', 'Payment Progress')}
      </p>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className="bg-green-500 h-2 rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs mt-1">
        {totalPaid.toLocaleString()} / {totalPrice.toLocaleString()}{' '}
        {t('currency', 'DHS')}
      </p>
    </div>
  );
}
