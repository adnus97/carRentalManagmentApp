import { api } from './api';

export const createCar = async (data: {
  make: string;
  model: string;
  year: number;
  purchasePrice: number;
  pricePerDay: number;
  mileage: number;
  monthlyLeasePrice: number;
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

export const deleteCar = async (id: string) => {
  const response = await api.put(
    `/cars/${id}`,
    {
      status: 'deleted',
    },
    {
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );
  return response.data;
};
