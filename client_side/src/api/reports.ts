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
  rentedDays: number;
  adr: number;
  revPar: number;
  totalMaintenanceCost: number;
  monthlyLeaseTotal: number; // ✅ ADD THIS
  netProfit: number;
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

// ✅ New type for maintenance data
export type ReportsMaintenance = {
  totalMaintenanceCost: number;
  maintenanceCount: number;
  avgMaintenanceCost: number;
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
  technicalVisit: ReportsInsurance; // ✅ New - reuses same structure as insurance
  maintenance: ReportsMaintenance; // ✅ New
  targets: ReportsTarget[];
};

/* ========== API Calls ========== */
export async function getReportSummary(params: {
  preset?: Preset;
  interval?: Interval;
  carId?: string;
  from?: Date | string;
  to?: Date | string;
}) {
  const q: Record<string, string> = {};

  if (params.preset) q.preset = params.preset;
  if (params.interval) q.interval = params.interval;
  if (params.carId) q.carId = params.carId;

  const norm = (v?: Date | string) =>
    v instanceof Date ? (isNaN(v.getTime()) ? undefined : v.toISOString()) : v;

  const from = norm(params.from);
  const to = norm(params.to);

  if (from) q.from = from;
  if (to) q.to = to;

  const res = await api.get<ReportsResponse>('/reports/summary', { params: q });
  return res.data;
}
