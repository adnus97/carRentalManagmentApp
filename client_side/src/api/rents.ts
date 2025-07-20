import { api } from './api';

export const createRent = async (data: {
  carId: string;
  userId: string;
  startDate: Date;
  expectedEndDate?: Date;
  returnedAt?: Date;
  totalPrice: number;
  customPrice?: number;
  deposit: number;
  guarantee: number;
  lateFee?: number;
  isOpenContract: boolean;
  status: 'active' | 'completed' | 'canceled';
  damageReport?: string;
  customerId: string;
  isDeleted?: boolean;
}) => {
  const response = await api.post('/rents', data, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return response.data;
};

export const getRents = async (page: number = 1, pageSize: number = 20) => {
  const response = await api.get('/rents', {
    params: { page, pageSize },
  });
  return response.data;
};

export const getRentById = async (id: string) => {
  const response = await api.get(`/rents/${id}`);
  return response.data;
};

export const removeRent = async (id: string) => {
  const response = await api.put(
    `/rents/${id}`,
    {
      isDeleted: 'true',
    },
    {
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );
  return response.data;
};

export const updateRent = async (
  id: string,
  updateData: {
    returnedAt?: Date | string;
    lateFee: number;
    damageReport?: string;
    totalPrice?: number;
  },
) => {
  // Convert Date to ISO string if present and is a Date
  const dataToSend = {
    ...updateData,
    ...(updateData.returnedAt
      ? {
          returnedAt:
            updateData.returnedAt instanceof Date
              ? updateData.returnedAt.toISOString()
              : updateData.returnedAt,
          status: 'completed',
        }
      : {}),
  };

  const response = await api.put(`/rents/${id}`, dataToSend, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return response.data;
};
