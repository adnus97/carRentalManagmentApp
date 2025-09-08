// src/api/rents.ts
import { api } from './api';
import { RentStatus } from '@/types/rent-status.type';

export interface CreateRentResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    rentContractId: string; // 🆕 New field
    rentNumber: number; // 🆕 New field
    year: number; // 🆕 New field
    carId: string;
    customerId: string;
    startDate: string;
    expectedEndDate?: string;
    returnedAt?: string;
    totalPrice: number;
    deposit: number;
    guarantee: number;
    lateFee: number;
    totalPaid: number;
    isFullyPaid: boolean;
    status: RentStatus;
    damageReport?: string;
    isOpenContract: boolean;
    isDeleted: boolean;
    orgId: string;
  };
  contractUrl?: string; // Added by backend
}

export interface RentWithDetails {
  id: string;
  rentContractId: string; // 🆕 New field
  rentNumber: number; // 🆕 New field
  year: number; // 🆕 New field
  carId: string;
  customerId: string;
  startDate: string;
  expectedEndDate?: string;
  returnedAt?: string;
  isOpenContract: boolean;
  totalPrice: number;
  deposit: number;
  guarantee: number;
  lateFee: number;
  totalPaid: number;
  isFullyPaid: boolean;
  status: RentStatus;
  damageReport?: string;
  // Related data from joins
  carModel: string;
  carMake: string;
  pricePerDay: number;
  customerName: string;
  customerEmail: string;
}

export interface GetRentsWithDetailsResponse {
  data: RentWithDetails[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

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
  damageReport?: string | null;
  customerId: string;
  isDeleted?: boolean;
  totalPaid?: number;
  isFullyPaid?: boolean;
}): Promise<CreateRentResponse> => {
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
  return response.data as CreateRentResponse;
};

export const getRents = async (page: number = 1, pageSize: number = 20) => {
  const response = await api.get('/rents', { params: { page, pageSize } });
  return response.data;
};

export const getRentById = async (id: string): Promise<RentWithDetails[]> => {
  const response = await api.get(`/rents/${id}`);
  return response.data;
};

export const removeRent = async (id: string) => {
  const response = await api.put(
    `/rents/${id}/soft-delete`,
    {},
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
      'status',
      'damageReport',
    ],
    active: [
      'totalPrice',
      'lateFee',
      'totalPaid',
      'isFullyPaid',
      'damageReport',
      'status',
      ...(isOpenContract ? ['returnedAt'] : []),
    ],
    completed: ['totalPaid', 'isFullyPaid', 'damageReport', 'lateFee'],
    canceled: ['status'],
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
): Promise<GetRentsWithDetailsResponse> => {
  const response = await api.get('/rents/with-car-and-customer', {
    params: { page, pageSize },
  });
  return response.data;
};

// 🆕 Contract-related functions
export const getRentContract = async (id: string) => {
  const response = await api.get(`/rents/${id}/contract`);
  return response.data;
};

export const getRentContractHTML = async (id: string) => {
  const response = await api.get(`/rents/${id}/contract/html`);
  return response.data;
};

// Uses your preconfigured `api` instance (Axios)
export async function downloadRentContractPDF(id: string) {
  // 1) Request the PDF as a blob
  const res = await api.get(`/rents/${id}/contract-pdf`, {
    responseType: 'blob',
    headers: { Accept: 'application/pdf' },
    withCredentials: true, // keep if your API uses cookies/session
  });

  // 2) Validate content-type (optional but helpful)
  const ct =
    (res.headers?.['content-type'] as string) ||
    (res.headers?.['Content-Type'] as string) ||
    '';
  if (!ct.toLowerCase().includes('pdf')) {
    // Try to read as text for better error details
    try {
      const text = await (res.data as Blob).text();
      throw new Error(
        text || `Unexpected content-type: ${ct || 'unknown'} (expected PDF)`,
      );
    } catch {
      throw new Error(
        `Unexpected content-type: ${ct || 'unknown'} (expected PDF)`,
      );
    }
  }

  // 3) Derive filename from headers, fallback to contract-{id}.pdf
  const cd =
    (res.headers?.['content-disposition'] as string) ||
    (res.headers?.['Content-Disposition'] as string) ||
    '';
  const match = cd.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
  const filename = match ? decodeURIComponent(match[1]) : `contract-${id}.pdf`;

  // 4) Create a blob URL and download
  const blob = res.data as Blob;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
