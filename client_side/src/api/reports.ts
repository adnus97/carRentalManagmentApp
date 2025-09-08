import { api } from './api';

/* ========== Types ========== */
export type Preset =
  | 'today'
  | 'yesterday'
  | 'last24h'
  | 'last7d'
  | 'last30d'
  | 'last90d'
  | 'thisYear'
  | 'prevMonth'
  | 'prevTrimester'
  | 'prevSemester'
  | 'prevYear';

export type Interval = 'day' | 'week' | 'month';

export type ReportsSnapshot = {
  revenueBilled: number;
  revenueCollected: number;
  openAR: number;
  totalRents: number;
  fleetSize: number;
  utilization: number;
  periodDays: number;
  adr: number;
  revPar: number;
};

export type ReportsTrendPoint = {
  date: string;
  revenue: number;
  rents: number;
};

export type ReportsTopCar = {
  carId: string;
  make: string;
  model: string;
  plateNumber?: string;
  revenue: number;
  rents: number;
};

export type ReportsOverdue = {
  id: string;
  carId: string;
  expectedEndDate: string;
};

export type ReportsInsuranceCar = {
  id: string;
  make: string;
  model: string;
  insuranceExpiryDate: string;
  status?: string;
};
export type ReportsTarget = {
  month: string;
  startDate: string;
  endDate: string;
  targetRevenue: number;
  actualRevenue: number;
  targetRents: number;
  actualRents: number;
};
export type ReportsInsurance = {
  total: number;
  expired: number;
  critical: number;
  warning: number;
  info: number;
  cars: ReportsInsuranceCar[];
};
export type ReportsFilters = {
  from: string; // ISO date
  to: string; // ISO date
  interval: Interval;
  carId: string | null;
};
export type ReportsResponse = {
  filters: ReportsFilters;
  snapshot: ReportsSnapshot;
  trends: ReportsTrendPoint[];
  prevTrends: ReportsTrendPoint[];
  topCars: ReportsTopCar[];
  overdue: ReportsOverdue[];
  insurance: ReportsInsurance;
  targets: ReportsTarget[];
};

/* ========== API Calls ========== */
export async function getReportSummary(params: {
  preset?: Preset;
  interval?: Interval;
  carId?: string;
  from?: Date | string; // ✅ allow custom range
  to?: Date | string;
}) {
  const res = await api.get<ReportsResponse>('/reports/summary', {
    params: {
      ...params,
      // ✅ ensure Dates are converted to ISO strings
      from:
        params.from instanceof Date ? params.from.toISOString() : params.from,
      to: params.to instanceof Date ? params.to.toISOString() : params.to,
    },
  });
  return res.data;
}
