// src/types/rent.type.ts
import { RentStatus } from './rent-status.type';

export interface Rent {
  id: string;
  rentContractId: string; // 🆕 New field - formatted like "001/2025"
  rentNumber: number; // 🆕 New field - sequential number part
  year: number; // 🆕 New field - year part
  carId: string;
  customerId: string;
  orgId: string;
  startDate: Date | string;
  expectedEndDate?: Date | string;
  returnedAt?: Date | string;
  totalPrice: number;
  deposit: number;
  guarantee: number;
  lateFee: number;
  totalPaid: number;
  isFullyPaid: boolean;
  status: RentStatus;
  damageReport?: string;
  isOpenContract: boolean;
  isDeleted: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface RentWithDetails extends Rent {
  // Related data from joins
  carModel: string;
  carMake: string;
  pricePerDay: number;
  customerName: string;
  customerEmail: string;
}

export interface CreateRentData {
  carId: string;
  customerId: string;
  startDate: Date;
  expectedEndDate?: Date | null;
  returnedAt?: Date | null;
  totalPrice: number;
  deposit: number;
  guarantee: number;
  lateFee?: number;
  isOpenContract: boolean;
  status: RentStatus;
  damageReport?: string | null;
  totalPaid?: number;
  isFullyPaid?: boolean;
}

export interface UpdateRentData {
  returnedAt?: Date | null;
  lateFee?: number;
  deposit?: number;
  guarantee?: number;
  damageReport?: string | null;
  totalPrice?: number;
  totalPaid?: number;
  isFullyPaid?: boolean;
  status?: RentStatus;
}
