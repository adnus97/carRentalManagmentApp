import { api } from './api';
import { RentStatus } from '@/types/rent-status.type';

export const createRent = async (data: {
  carId: string;
  startDate: Date;
  expectedEndDate?: Date | null;
  returnedAt?: Date | null;
  totalPrice: number;
  deposit: number;
  guarantee: number;
  lateFee?: number;
  isOpenContract: boolean;
  status: RentStatus; // ✅ Use RentStatus instead of string union
  damageReport?: string;
  customerId: string;
  isDeleted?: boolean;
  totalPaid?: number;
  isFullyPaid?: boolean;
}) => {
  let returnedAt = data.returnedAt;

  // If open contract and no returnedAt, set far future date
  if (data.isOpenContract && !returnedAt) {
    returnedAt = new Date('9999-12-31');
  }

  // If expectedEndDate is provided and returnedAt is missing, use it
  if (!returnedAt && data.expectedEndDate) {
    returnedAt = data.expectedEndDate;
  }

  const dataToSend = {
    ...data,
    startDate: data.startDate.toISOString(),
    expectedEndDate: data.expectedEndDate
      ? data.expectedEndDate.toISOString()
      : undefined,
    returnedAt: returnedAt ? returnedAt.toISOString() : undefined,
  };

  const response = await api.post('/rents', dataToSend, {
    headers: { 'Content-Type': 'application/json' },
  });
  return response.data;
};

export const getRents = async (page: number = 1, pageSize: number = 20) => {
  const response = await api.get('/rents', { params: { page, pageSize } });
  return response.data;
};

export const getRentById = async (id: string) => {
  const response = await api.get(`/rents/${id}`);
  return response.data;
};

export const removeRent = async (id: string) => {
  const response = await api.put(
    `/rents/${id}`,
    { isDeleted: true }, // boolean
    { headers: { 'Content-Type': 'application/json' } },
  );
  return response.data;
};

export const updateRent = async (
  id: string,
  updateData: {
    startDate?: Date | string;
    returnedAt?: Date | string;
    lateFee?: number;
    damageReport?: string;
    totalPrice?: number;
    status?: RentStatus; // ✅ Use RentStatus
    totalPaid?: number;
    isFullyPaid?: boolean;
    deposit?: number;
    guarantee?: number;
    isOpenContract?: boolean;
  },
) => {
  // Fetch current rent if only one date is provided
  if (updateData.startDate || updateData.returnedAt) {
    const currentRent = await getRentById(id);
    if (!updateData.startDate) updateData.startDate = currentRent.startDate;
    if (!updateData.returnedAt) updateData.returnedAt = currentRent.returnedAt;
  }

  const dataToSend = {
    ...updateData,
    ...(updateData.startDate instanceof Date && {
      startDate: updateData.startDate.toISOString(),
    }),
    ...(updateData.returnedAt instanceof Date && {
      returnedAt: updateData.returnedAt.toISOString(),
    }),
  };

  // ✅ Remove auto-status logic since backend handles it now
  // The backend will automatically determine the correct status

  const response = await api.put(`/rents/${id}`, dataToSend, {
    headers: { 'Content-Type': 'application/json' },
  });

  return response.data;
};

export const getAllRentsWithCarAndCustomer = async (
  page: number = 1,
  pageSize: number = 5,
) => {
  const response = await api.get('/rents/with-car-and-customer', {
    params: { page, pageSize },
  });
  return response.data;
};
