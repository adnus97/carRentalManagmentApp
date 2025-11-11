// src/api/auth.ts
import { api } from './api';
import type { User } from '@/types/user'; // ✅ Use existing type

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const response = await api.get<User>('/auth/me');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch current user:', error);
    return null;
  }
};
