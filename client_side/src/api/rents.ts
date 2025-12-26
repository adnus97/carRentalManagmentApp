// src/api/rents.ts
import { api } from './api';
import { RentStatus } from '@/types/rent-status.type';

export interface CreateRentResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    rentContractId: string;
    rentNumber: number;
    year: number;
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
  contractUrl?: string;
}

export interface RentWithDetails {
  id: string;
  rentContractId: string;
  rentNumber: number;
  year: number;
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
  carModel: string;
  carMake: string;
  pricePerDay: number;
  customerName: string;
  customerEmail: string;
  // image ids from backend pagination endpoint
  carImg1Id?: string | null;
  carImg2Id?: string | null;
  carImg3Id?: string | null;
  carImg4Id?: string | null;
  carImagesCount?: number;
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

  if (data.isOpenContract && !returnedAt) {
    returnedAt = new Date('9999-12-31');
  }
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
    withCredentials: true,
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
      'carId',
      'customerId',
      'startDate',
      'expectedEndDate',
      'returnedAt',
      'totalPrice',
      'deposit',
      'guarantee',
      'lateFee',
      'totalPaid',
      'isFullyPaid',
      'status',
      'damageReport',
      // ...(isOpenContract ? ['returnedAt'] : []),
    ],
    completed: ['totalPaid', 'isFullyPaid', 'damageReport', 'lateFee'],
    canceled: ['status'],
  };

  const allowedFields = currentStatus
    ? allowedFieldsByStatus[currentStatus]
    : Object.keys(updateData);

  const filteredData: Record<string, any> = {};
  for (const key of allowedFields) {
    const value = updateData[key];
    if (value !== undefined) {
      filteredData[key] =
        key === 'damageReport' ? (value === '' ? null : value) : value;
    }
  }

  if (filteredData.startDate instanceof Date) {
    filteredData.startDate = filteredData.startDate.toISOString();
  }
  if (filteredData.expectedEndDate instanceof Date) {
    filteredData.expectedEndDate = filteredData.expectedEndDate.toISOString();
  }
  if (filteredData.returnedAt instanceof Date) {
    filteredData.returnedAt = filteredData.returnedAt.toISOString();
  }

  const response = await api.put(`/rents/${id}`, filteredData, {
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true,
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

// Contract-related
export const getRentContract = async (id: string) => {
  const response = await api.get(`/rents/${id}/contract`);
  return response.data;
};

export const getRentContractHTML = async (id: string) => {
  const response = await api.get(`/rents/${id}/contract/html`);
  return response.data;
};

export async function downloadRentContractPDF(id: string) {
  const res = await api.get(`/rents/${id}/contract-pdf`, {
    responseType: 'blob',
    headers: { Accept: 'application/pdf' },
    withCredentials: true,
  });

  const ct =
    (res.headers?.['content-type'] as string) ||
    (res.headers?.['Content-Type'] as string) ||
    '';
  if (!ct.toLowerCase().includes('pdf')) {
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

  const cd =
    (res.headers?.['content-disposition'] as string) ||
    (res.headers?.['Content-Disposition'] as string) ||
    '';
  const match = cd.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
  const filename = match ? decodeURIComponent(match[1]) : `contract-${id}.pdf`;

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

// =======================
// Car images (multipart)
// =======================

export interface RentWithImages {
  id: string;
  rentContractId: string;
  carId: string;
  customerId: string;
  startDate: string;
  expectedEndDate?: string | null;
  returnedAt?: string | null;
  isOpenContract: boolean;
  status: RentStatus;
  totalPrice?: number | null;

  carImg1Id?: string | null;
  carImg2Id?: string | null;
  carImg3Id?: string | null;
  carImg4Id?: string | null;

  carImages?: Array<{
    id: string;
    name: string;
    url: string;
    size?: number;
    path?: string;
  }>;
  carImagesCount?: number;
}

export const createRentWithImages = async (
  formData: FormData,
): Promise<
  CreateRentResponse & {
    data: CreateRentResponse['data'] & {
      carImagesCount?: number;
      carImageIds?: string[];
    };
  }
> => {
  const response = await api.post('/rents', formData, {
    withCredentials: true,
    // Do not set Content-Type; browser sets boundary.
  });
  return response.data;
};

export const updateRentImages = async (
  rentId: string,
  images: File[],
): Promise<{
  success: boolean;
  message: string;
  data: { carImagesCount: number; carImageIds: string[] };
}> => {
  const fd = new FormData();
  images.slice(0, 4).forEach((img) => fd.append('carImages', img));
  const res = await api.patch(`/rents/${rentId}/images`, fd, {
    withCredentials: true,
  });
  return res.data;
};

export const getRentWithImages = async (
  rentId: string,
): Promise<RentWithImages> => {
  const res = await api.get(`/rents/${rentId}/with-images`, {
    withCredentials: true,
  });
  return res.data;
};

// Helper to build multipart payload if you want to switch dynamically
export function buildCreateRentFormData(
  payload: {
    carId: string;
    customerId: string;
    startDate: Date;
    expectedEndDate?: Date | null;
    returnedAt?: Date | null;
    totalPrice?: number | null;
    deposit?: number | null;
    guarantee?: number | null;
    lateFee?: number | null;
    totalPaid?: number | null;
    isFullyPaid?: boolean;
    isOpenContract: boolean;
    status: RentStatus;
    damageReport?: string | null;
  },
  images: File[],
): FormData {
  const fd = new FormData();

  const entries: Record<string, any> = {
    ...payload,
    startDate: payload.startDate?.toISOString(),
    expectedEndDate: payload.expectedEndDate
      ? payload.expectedEndDate.toISOString()
      : '',
    returnedAt: payload.returnedAt ? payload.returnedAt.toISOString() : '',
  };

  Object.entries(entries).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    fd.append(
      k,
      typeof v === 'boolean' || typeof v === 'number' ? String(v) : v,
    );
  });

  images.slice(0, 4).forEach((img) => fd.append('carImages', img));
  return fd;
}

export const getRentImages = async (rentId: string) => {
  const response = await api.get(`/rents/${rentId}/images`);
  return response.data.data;
};
