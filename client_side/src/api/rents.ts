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
}) => {
  const response = await api.post('/rents', data, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return response.data;
};
