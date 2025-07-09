import { api } from './api';

export const createCar = async (data: {
  make: string;
  model: string;
  year: number;
  purchasePrice: number;
  pricePerDay: number;
  mileage: number;
  monthlyLeasePrice: number;
  lastOilChangeAt: Date;
  insuranceExpiryDate: Date;
  status: 'active' | 'sold' | 'leased' | 'maintenance' | 'deleted';
}) => {
  const response = await api.post('/cars', data, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return response.data;
};

export const getCars = async () => {
  const response = await api.get('/cars/org');
  return response.data;
};
