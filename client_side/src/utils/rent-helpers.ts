import { CarDetails } from '@/api/cars';
import { RentalRow } from '@/types/car-tables';

export function getRentByIdFromCarDetails(
  carDetails: CarDetails,
  rentId: string,
): RentalRow | null {
  return carDetails.rentalHistory.find((r) => r.id === rentId) ?? null;
}

export function getRentTotalPaidFromCarDetails(
  carDetails: CarDetails,
  rentId: string,
): number {
  const rent = getRentByIdFromCarDetails(carDetails, rentId);
  return rent?.totalPaid ?? 0;
}

export function getTotalRevenueFromCarDetails(carDetails: CarDetails): number {
  return carDetails.financialStats.totalRevenue ?? 0;
}

// ✅ New: calculate payment progress %
export function getRentPaymentProgress(rent: RentalRow | null): number {
  if (!rent) return 0;
  const totalPrice = rent.totalPrice ?? 0;
  const totalPaid = rent.totalPaid ?? 0;
  return totalPrice > 0 ? Math.min((totalPaid / totalPrice) * 100, 100) : 0;
}
