export interface TargetRow {
  id: string;
  startDate: string;
  endDate: string;
  targetRents: number;
  revenueGoal: number;
  actualRents: number;
  actualRevenue: number;
}

export interface MaintenanceLogRow {
  id: string;
  description: string;
  cost: number;
  date: string;
}

export interface OilChangeRow {
  id: string;
  changedAt: string;
  mileage: number;
  notes?: string | undefined;
}
export interface RentalRow {
  id: string;
  startDate: string;
  expectedEndDate: string;
  returnedAt: string | null;
  totalPrice: number;
  totalPaid: number;
  status: string;
  customerName: string;
}
