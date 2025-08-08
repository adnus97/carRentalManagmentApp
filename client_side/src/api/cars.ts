import { api } from './api';

// Car type with new fields from backend
export interface Car {
  id: string;
  make: string;
  model: string;
  year: number;
  purchasePrice: number;
  pricePerDay: number;
  orgId: string;
  mileage: number;
  monthlyLeasePrice: number;
  insuranceExpiryDate: string; // ISO date string
  status: 'active' | 'sold' | 'leased' | 'maintenance' | 'deleted';
  createdAt?: string;
  updatedAt?: string;
  isAvailable: boolean; // ✅ New dynamic field
  nextAvailableDate: string | null; // ✅ New dynamic field
}

// Create a new car
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
    headers: { 'Content-Type': 'application/json' },
  });
  return response.data;
};

// Get paginated cars for the current user's organization
export const getCars = async (
  page: number = 1,
  pageSize: number = 5,
): Promise<{
  data: Car[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}> => {
  const response = await api.get('/cars/org', { params: { page, pageSize } });
  return response.data;
};

// Get a single car by ID (with isAvailable + nextAvailableDate)
export const getCarById = async (id: string): Promise<Car> => {
  const response = await api.get(`/cars/${id}`);
  return response.data;
};

// Soft delete a car
export const deleteCar = async (id: string) => {
  const response = await api.put(
    `/cars/${id}`,
    { status: 'deleted' },
    { headers: { 'Content-Type': 'application/json' } },
  );
  return response.data;
};
