import { api } from './api';
export const createRent = async (data: {
  carId: string;
  userId: string;
  startDate: Date;
  expectedEndDate?: Date | null;
  returnedAt?: Date | null;
  totalPrice: number;
  deposit: number;
  guarantee: number;
  lateFee?: number;
  isOpenContract: boolean;
  status: 'active' | 'completed' | 'canceled';
  damageReport?: string;
  customerId: string;
  isDeleted?: boolean;
  totalPaid?: number;
  isFullyPaid?: boolean;
}) => {
  // Convert dates to ISO strings if present
  const dataToSend = {
    ...data,
    startDate:
      data.startDate instanceof Date
        ? data.startDate.toISOString()
        : data.startDate,
    expectedEndDate:
      data.expectedEndDate instanceof Date
        ? data.expectedEndDate.toISOString()
        : (data.expectedEndDate ?? undefined),
    returnedAt:
      data.returnedAt instanceof Date
        ? data.returnedAt.toISOString()
        : (data.returnedAt ?? undefined),
  };

  const response = await api.post('/rents', dataToSend, {
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
    status?: 'active' | 'completed' | 'canceled';
    totalPaid?: number;
    isFullyPaid?: boolean;
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
        }
      : {}),
  };

  // If status is not provided, set it based on returnedAt
  if (!dataToSend.status && dataToSend.returnedAt) {
    const returnedAtDate =
      dataToSend.returnedAt instanceof Date
        ? dataToSend.returnedAt
        : new Date(dataToSend.returnedAt);
    const now = new Date();
    dataToSend.status = returnedAtDate <= now ? 'completed' : 'active';
  }

  const response = await api.put(`/rents/${id}`, dataToSend, {
    headers: {
      'Content-Type': 'application/json',
    },
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
