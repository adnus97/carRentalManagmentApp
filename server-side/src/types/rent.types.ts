// src/rents/types/rent.types.ts
export interface Rent {
  id: string;
  rentContractId: string;
  rentNumber: number;
  year: number;
  carId: string;
  orgId: string;
  customerId: string;
  startDate: Date;
  expectedEndDate?: Date;
  isOpenContract: boolean;
  returnedAt?: Date;
  totalPrice?: number;
  deposit: number;
  guarantee: number;
  lateFee?: number;
  totalPaid: number;
  isFullyPaid: boolean;
  status: 'reserved' | 'active' | 'completed' | 'canceled';
  damageReport?: string;
  isDeleted: boolean;
  carImg1Id?: string;
  carImg2Id?: string;
  carImg3Id?: string;
  carImg4Id?: string;
}

export interface RentWithDetails extends Rent {
  carMake?: string;
  carModel?: string;
  pricePerDay?: number;
  customerName?: string;
  customerFirstName?: string;
  customerLastName?: string;
  customerEmail?: string;
  customerPhone?: string;
  carImages?: CarImage[];
  carImagesCount: number;
}

export interface CarImage {
  id: string;
  name: string;
  url: string;
  path: string;
  size?: number;
  order: number;
}
