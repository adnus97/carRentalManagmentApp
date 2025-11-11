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
    totalRentals: number;
    activeRentals: number;
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
}

export interface UserDetails {
  user: User;
  organization: any;
  statistics: {
    rentals: {
      totalRentals: number;
      activeRentals: number;
      completedRentals: number;
      totalRevenue: number;
    };
    cars: {
      totalCars: number;
      activeCars: number;
    };
  };
}

export interface ExpiringUser extends User {
  urgency: 'critical' | 'high' | 'medium';
}

// ✅ Get dashboard statistics
export const getDashboardStats = async (): Promise<DashboardStats> => {
  const response = await api.get('/admin/stats');
  return response.data;
};

// ✅ Get all users with pagination and filters
export const getUsers = async (params: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}): Promise<UsersResponse> => {
  const response = await api.get('/admin/users', { params });
  return response.data;
};

// ✅ Get user details
export const getUserDetails = async (userId: string): Promise<UserDetails> => {
  const response = await api.get(`/admin/users/${userId}`);
  return response.data;
};

// ✅ Activate user subscription
export const activateSubscription = async (
  userId: string,
  years: number = 1,
) => {
  const response = await api.post(
    `/admin/users/${userId}/activate`,
    { years },
    {
      headers: { 'Content-Type': 'application/json' },
    },
  );
  return response.data;
};

// ✅ Deactivate user subscription
export const deactivateSubscription = async (userId: string) => {
  const response = await api.post(
    `/admin/subscription/${userId}/deactivate`, // ← Fixed URL!
    {}, // Send empty object instead of null
    {
      headers: { 'Content-Type': 'application/json' },
    },
  );
  return response.data;
};

// ✅ Get user subscription status
export const getUserSubscription = async (userId: string) => {
  const response = await api.get(`/admin/users/${userId}/subscription`);
  return response.data;
};

// ✅ Get users with expiring subscriptions
export const getExpiringSubscriptions = async (
  days: number = 30,
): Promise<ExpiringUser[]> => {
  const response = await api.get('/admin/users-expiring', {
    params: { days },
  });
  return response.data;
};

// ✅ Update user role
export const updateUserRole = async (
  userId: string,
  role: 'user' | 'super_admin',
) => {
  const response = await api.patch(
    `/admin/users/${userId}/role`,
    { role },
    {
      headers: { 'Content-Type': 'application/json' },
    },
  );
  return response.data;
};

// ✅ Delete user (soft delete)
export const deleteUser = async (userId: string) => {
  const response = await api.delete(`/admin/users/${userId}`);
  return response.data;
};
