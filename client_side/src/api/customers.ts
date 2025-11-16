import { api } from './api';

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  address: string;
  documentId?: string;
  documentType?: 'passport' | 'id_card';
  driversLicense?: string; // NEW
  rating: number;
  ratingCount: number;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  isBlacklisted?: boolean;
  blacklistReason?: string | null;
  idCardId?: string;
  driversLicenseId?: string; // file id
}

// Extended interface for populated file data (similar to Organization)
export interface CustomerWithFiles extends Customer {
  idCardFile?: {
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  };
  driversLicenseFile?: {
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  };
}

export interface CustomerRating {
  id: string;
  customerId: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface BlacklistEntry {
  id: string;
  customerId: string;
  reason: string;
  isActive: boolean;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerDocumentId: string;
  orgName?: string; // Only for global blacklist
}

export interface BlacklistResponse {
  data: BlacklistEntry[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** ✅ Create customer (orgId resolved from backend) */
export const createCustomer = async (data: Partial<Customer>) => {
  const response = await api.post('/customers', data, {
    headers: { 'Content-Type': 'application/json' },
  });
  return response.data;
};

/** ✅ Get all customers (backend resolves orgId from auth/session) */
export const getCustomers = async (page: number = 1, pageSize: number = 20) => {
  const response = await api.get('/customers/org', {
    params: { page, pageSize },
  });
  return response.data;
};

/** ✅ Get one customer */
export const getCustomerById = async (id: string) => {
  const response = await api.get(`/customers/${id}`);
  return response.data;
};

/** ✅ Update customer */
export const updateCustomer = async (
  id: string,
  updateData: Partial<Customer>,
) => {
  const response = await api.put(`/customers/${id}`, updateData, {
    headers: { 'Content-Type': 'application/json' },
  });
  return response.data;
};

/** ✅ Soft delete customer */
export const deleteCustomer = async (id: string) => {
  const response = await api.delete(`/customers/${id}`);
  return response.data;
};

/** ✅ Restore customer */
export const restoreCustomer = async (id: string) => {
  const response = await api.put(`/customers/${id}/restore`);
  return response.data;
};

/** ✅ Blacklist customer */
export const blacklistCustomer = async (
  id: string,
  data: { reason: string },
) => {
  const response = await api.post(`/customers/${id}/blacklist`, data, {
    headers: { 'Content-Type': 'application/json' },
  });
  return response.data;
};

/** ✅ Unblacklist customer */
export const unblacklistCustomer = async (id: string) => {
  const response = await api.put(`/customers/${id}/unblacklist`);
  return response.data;
};

/** ✅ Get organization blacklist - NEW */
export const getOrganizationBlacklist = async (
  page: number = 1,
  pageSize: number = 20,
): Promise<BlacklistResponse> => {
  const response = await api.get('/customers/blacklist/org', {
    params: { page, pageSize },
  });
  return response.data;
};

/** ✅ Get global blacklist - NEW */
export const getGlobalBlacklist = async (
  page: number = 1,
  pageSize: number = 20,
): Promise<BlacklistResponse> => {
  const response = await api.get('/customers/blacklist/global', {
    params: { page, pageSize },
  });
  return response.data;
};

/** ✅ Get blacklist (legacy - keeping for backwards compatibility) */
export const getBlacklist = async (page: number = 1, pageSize: number = 20) => {
  const response = await api.get('/customers/blacklist/all', {
    params: { page, pageSize },
  });
  return response.data;
};

/** ✅ Rate customer */
export const rateCustomer = async (
  id: string,
  data: { rating: number; comment?: string },
) => {
  const response = await api.post(`/customers/${id}/rate`, data, {
    headers: { 'Content-Type': 'application/json' },
  });
  return response.data;
};

/** ✅ Get customer ratings */
export const getCustomerRatings = async (
  id: string,
  page: number = 1,
  pageSize: number = 10,
) => {
  const response = await api.get(`/customers/${id}/ratings`, {
    params: { page, pageSize },
  });
  return response.data;
};

/** ✅ Get customer rental history */
export const getRentsByCustomer = async (
  customerId: string,
  page: number = 1,
  pageSize: number = 10,
) => {
  const response = await api.get(`/customers/customer/${customerId}`, {
    params: { page, pageSize },
  });
  return response.data;
};

/** ✅ Get customer with files */
export const getCustomerWithFiles = async (
  id: string,
): Promise<CustomerWithFiles> => {
  const response = await api.get(`/customers/${id}/with-files`);
  return response.data;
};
