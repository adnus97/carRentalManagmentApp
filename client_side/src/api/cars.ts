// import {
//   RentalRow,
//   MaintenanceLogRow,
//   OilChangeRow,
//   TargetRow,
// } from '@/types/car-tables';
// import { api } from './api';

// // Car type with new fields from backend
// export interface Car {
//   id: string;
//   make: string;
//   model: string;
//   year: number;
//   purchasePrice: number;
//   pricePerDay: number;
//   orgId: string;
//   mileage: number;
//   monthlyLeasePrice: number;
//   insuranceExpiryDate: string; // ISO date string
//   status: 'active' | 'sold' | 'leased' | 'maintenance' | 'deleted';
//   createdAt?: string;
//   updatedAt?: string;
//   isAvailable: boolean; // ✅ New dynamic field
//   nextAvailableDate: string | null; // ✅ New dynamic field
// }

// // Create a new car
// export const createCar = async (data: {
//   make: string;
//   model: string;
//   year: number;
//   purchasePrice: number;
//   pricePerDay: number;
//   mileage: number;
//   monthlyLeasePrice: number;
//   insuranceExpiryDate: Date;
//   status: 'active' | 'sold' | 'leased' | 'maintenance' | 'deleted';
// }) => {
//   const response = await api.post('/cars', data, {
//     headers: { 'Content-Type': 'application/json' },
//   });
//   return response.data;
// };

// // Get paginated cars for the current user's organization
// export const getCars = async (
//   page: number = 1,
//   pageSize: number = 5,
// ): Promise<{
//   data: Car[];
//   page: number;
//   pageSize: number;
//   total: number;
//   totalPages: number;
// }> => {
//   const response = await api.get('/cars/org', { params: { page, pageSize } });
//   return response.data;
// };

// // Get a single car by ID (with isAvailable + nextAvailableDate)
// export const getCarById = async (id: string): Promise<Car> => {
//   const response = await api.get(`/cars/${id}`);
//   return response.data;
// };

// // Soft delete a car
// export const deleteCar = async (id: string) => {
//   const response = await api.put(
//     `/cars/${id}`,
//     { status: 'deleted' },
//     { headers: { 'Content-Type': 'application/json' } },
//   );
//   return response.data;
// };

// export const updateCar = async (
//   id: string,
//   data: Partial<{
//     make: string;
//     model: string;
//     year: number;
//     purchasePrice: number;
//     pricePerDay: number;
//     mileage: number;
//     monthlyLeasePrice: number;
//     insuranceExpiryDate: Date;
//     status: 'active' | 'sold' | 'leased' | 'maintenance' | 'deleted';
//   }>,
// ) => {
//   const response = await api.put(`/cars/${id}`, data, {
//     headers: { 'Content-Type': 'application/json' },
//   });
//   return response.data;
// };

// // src/api/cars.ts
// export interface CarDetails {
//   car: Car;
//   rentalHistory: RentalRow[];
//   maintenanceLogs: MaintenanceLogRow[];
//   oilChanges: OilChangeRow[];
//   targets: TargetRow[];
//   financialStats: {
//     totalRevenue: number;
//     totalRents: number;
//     avgRentPrice: number;
//   };
// }

// export const getCarDetails = async (id: string): Promise<CarDetails> => {
//   const response = await api.get(`/cars/${id}/details`);
//   return response.data;
// };
// export const addMaintenanceLog = async (
//   carId: string,
//   data: { description: string; cost: number; date: Date },
// ) => {
//   const response = await api.post(`/cars/${carId}/maintenance`, data, {
//     headers: { 'Content-Type': 'application/json' },
//   });
//   return response.data;
// };

// export const addOilChange = async (
//   carId: string,
//   data: { changedAt: Date; mileage: number; notes?: string },
// ) => {
//   const response = await api.post(
//     `/cars/${carId}/oil-change`,
//     {
//       ...data,
//       changedAt: data.changedAt.toISOString(), // ✅ always ISO
//     },
//     {
//       headers: { 'Content-Type': 'application/json' },
//     },
//   );
//   return response.data;
// };

// export const addMonthlyTarget = async (
//   carId: string,
//   data: {
//     startDate: Date;
//     endDate: Date;
//     targetRents: number;
//     revenueGoal: number;
//   },
// ) => {
//   const response = await api.post(`/cars/${carId}/targets`, data, {
//     headers: { 'Content-Type': 'application/json' },
//   });
//   return response.data;
// };
import {
  RentalRow,
  MaintenanceLogRow,
  OilChangeRow,
  TargetRow,
} from '@/types/car-tables';
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

// ✅ Create a new car
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

// ✅ Get paginated cars for the current user's organization
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

// ✅ Get a single car by ID
export const getCarById = async (id: string): Promise<Car> => {
  const response = await api.get(`/cars/${id}`);
  return response.data;
};

// ✅ Soft delete a car
export const deleteCar = async (id: string) => {
  const response = await api.put(
    `/cars/${id}`,
    { status: 'deleted' },
    { headers: { 'Content-Type': 'application/json' } },
  );
  return response.data;
};

// ✅ Update a car
export const updateCar = async (
  id: string,
  data: Partial<{
    make: string;
    model: string;
    year: number;
    purchasePrice: number;
    pricePerDay: number;
    mileage: number;
    monthlyLeasePrice: number;
    insuranceExpiryDate: Date;
    status: 'active' | 'sold' | 'leased' | 'maintenance' | 'deleted';
  }>,
) => {
  const response = await api.put(`/cars/${id}`, data, {
    headers: { 'Content-Type': 'application/json' },
  });
  return response.data;
};

// ✅ Car details (summary + limited history)
export interface CarDetails {
  car: Car;
  rentalHistory: RentalRow[];
  maintenanceLogs: MaintenanceLogRow[];
  oilChanges: OilChangeRow[];
  targets: TargetRow[];
  financialStats: {
    totalRevenue: number;
    totalRents: number;
    avgRentPrice: number;
  };
}

export const getCarDetails = async (id: string): Promise<CarDetails> => {
  const response = await api.get(`/cars/${id}/details`);
  return response.data;
};

// ✅ Add maintenance log
export const addMaintenanceLog = async (
  carId: string,
  data: { type: string; description: string; cost: number; mileage?: number },
) => {
  const response = await api.post(`/cars/${carId}/maintenance`, data, {
    headers: { 'Content-Type': 'application/json' },
  });
  return response.data;
};

// ✅ Add oil change
export const addOilChange = async (
  carId: string,
  data: { changedAt: Date; mileage: number; notes?: string },
) => {
  const response = await api.post(
    `/cars/${carId}/oil-change`,
    {
      ...data,
      changedAt: data.changedAt.toISOString(),
    },
    {
      headers: { 'Content-Type': 'application/json' },
    },
  );
  return response.data;
};

// ✅ Add monthly target
export const addMonthlyTarget = async (
  carId: string,
  data: {
    startDate: Date;
    endDate: Date;
    targetRents: number;
    revenueGoal: number;
  },
) => {
  const response = await api.post(`/cars/${carId}/targets`, {
    ...data,
    startDate: data.startDate.toISOString(),
    endDate: data.endDate.toISOString(),
  });
  return response.data;
};

// ✅ Paginated Targets (history)
export const getCarTargets = async (
  carId: string,
  page: number = 1,
  pageSize: number = 10,
): Promise<{
  data: TargetRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}> => {
  const response = await api.get(`/cars/${carId}/targets`, {
    params: { page, pageSize },
  });
  return response.data;
};

// ✅ Paginated Maintenance Logs (history)
export const getCarMaintenanceLogs = async (
  carId: string,
  page: number = 1,
  pageSize: number = 10,
): Promise<{
  data: MaintenanceLogRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}> => {
  const response = await api.get(`/cars/${carId}/maintenance`, {
    params: { page, pageSize },
  });
  return response.data;
};

// ✅ Paginated Rentals (history)
export const getCarRentals = async (
  carId: string,
  page: number = 1,
  pageSize: number = 10,
): Promise<{
  data: RentalRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}> => {
  const response = await api.get(`/cars/${carId}/rentals`, {
    params: { page, pageSize },
  });
  return response.data;
};
