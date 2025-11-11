// src/types/user.ts
export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string;
  role: 'user' | 'super_admin';
  subscriptionStatus: 'active' | 'inactive' | 'expired';
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
  subscriptionType?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
