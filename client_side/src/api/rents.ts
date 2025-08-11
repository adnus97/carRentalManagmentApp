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
  status: RentStatus;
  damageReport?: string | null; // ✅ Allow null
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
    `/rents/${id}/soft-delete`, // ✅

    { headers: { 'Content-Type': 'application/json' } },
  );
  return response.data;
};

export const updateRent = async (
  id: string,
  updateData: Record<string, any>,
  currentStatus?: RentStatus,
  isOpenContract?: boolean,
) => {
  // Allowed fields per status (must match backend rules)
  const allowedFieldsByStatus: Record<RentStatus, string[]> = {
    reserved: [
      'carId',
      'customerId',
      'startDate',
      'expectedEndDate',
      'returnedAt',
      'isOpenContract',
      'totalPrice',
      'deposit',
      'guarantee',
      'lateFee',
      'totalPaid',
      'isFullyPaid',
      'status', // ✅ Keep status for cancel functionality
      'damageReport',
    ],
    active: [
      'totalPrice',
      'lateFee',
      'totalPaid',
      'isFullyPaid',
      'damageReport',
      'status', // ✅ Keep status for cancel functionality
      ...(isOpenContract ? ['returnedAt'] : []),
    ],
    completed: ['totalPaid', 'isFullyPaid', 'damageReport', 'lateFee'],
    canceled: ['status'], // ✅ Allow status change to reactivate
  };

  // Filter updateData to only allowed fields
  const allowedFields = currentStatus
    ? allowedFieldsByStatus[currentStatus]
    : Object.keys(updateData);

  const filteredData: Record<string, any> = {};

  for (const key of allowedFields) {
    const value = updateData[key];
    if (value !== undefined) {
      if (key === 'damageReport') {
        filteredData[key] = value === '' ? null : value;
      } else {
        filteredData[key] = value;
      }
    }
  }

  // Handle date formatting
  if (filteredData.startDate instanceof Date) {
    filteredData.startDate = filteredData.startDate.toISOString();
  }
  if (filteredData.returnedAt instanceof Date) {
    filteredData.returnedAt = filteredData.returnedAt.toISOString();
  }

  const response = await api.put(`/rents/${id}`, filteredData, {
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
