export interface TargetRow {
  id: string;
  startDate: string;
  endDate: string;
  targetRents: number;
  revenueGoal: number;
  actualRents: number;
  actualRevenue: number;
  daysRemaining: number;
  revenueProgress: number; // %
  rentProgress: number; //
  isExpired: boolean;
}

export interface MaintenanceLogRow {
  id: string;
  carId: string;
  orgId: string;
  type: 'general' | 'oil_change' | 'tire_rotation' | 'inspection' | 'other'; // ✅ add type
  description: string;
  cost?: number;
  mileage?: number;
  createdAt: string; // ✅ add createdAt
  updatedAt: string; // ✅ add updatedAt
}

export interface OilChangeRow {
  id: string;
  changedAt: string;
  mileage: number;
  notes?: string | undefined;
}
export interface RentalRow {
  endDate: any;
  id: string;
  startDate: string;
  expectedEndDate: string;
  returnedAt: string | null;
  totalPrice: number;
  totalPaid: number;
  status: string;
  customerName: string;
  isOpenContract: boolean;
}
