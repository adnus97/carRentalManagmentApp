// src/api/admin.ts
import { api } from './api';

export interface DashboardStats {
  users: {
    totalUsers: number;
    activeSubscriptions: number;
    expiredSubscriptions: number;
    inactiveSubscriptions: number;
  };
  subscriptions: {
    expiringSoon: number;
    newUsersThisMonth: number;
  };
  revenue: {
    totalRevenue: number;
    pricePerSubscription: number;
    currency: string;
    activeSubscriptions: number;
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  subscriptionStatus: 'active' | 'inactive' | 'expired';
  subscriptionEndDate?: string;
  daysRemaining: number;
  isExpired: boolean;
  needsRenewal: boolean;
  role: string;
  createdAt: string;
}

export interface UsersResponse {
  data: User[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface ExpiringUser extends User {
  urgency: 'critical' | 'high' | 'medium';
}

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const response = await api.get('/admin/stats');
  return response.data;
};

export const getUsers = async (params: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}): Promise<UsersResponse> => {
  const response = await api.get('/admin/users', { params });
  return response.data;
};

export const activateSubscription = async (
  userId: string,
  years: number = 1,
) => {
  const response = await api.post(`/admin/users/${userId}/activate`, {
    years,
  });
  return response.data;
};

export const deactivateSubscription = async (userId: string) => {
  const response = await api.post(`/admin/users/${userId}/deactivate`, {});
  return response.data;
};

export const getUserSubscription = async (userId: string) => {
  const response = await api.get(`/admin/users/${userId}/subscription`);
  return response.data;
};

export const getExpiringSubscriptions = async (
  days: number = 30,
): Promise<ExpiringUser[]> => {
  const response = await api.get('/admin/users-expiring', { params: { days } });
  return response.data;
};
