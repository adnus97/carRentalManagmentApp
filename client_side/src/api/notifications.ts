// client_side/src/api/notifications.ts
import { api } from './api';
import {
  PaginatedNotifications,
  NotificationSummary,
  NotificationPreferences,
  NotificationCategory,
  NotificationPriority,
} from '@/types/notifications';

export interface NotificationFilters {
  category?: NotificationCategory;
  unread?: boolean;
  priority?: NotificationPriority;
  page?: number;
  limit?: number;
}

/**
 * Get notifications with enhanced filtering
 */
export async function getNotifications(
  filters: NotificationFilters = {},
): Promise<PaginatedNotifications> {
  const params = new URLSearchParams();

  if (filters.category) params.append('category', filters.category);
  if (filters.unread !== undefined)
    params.append('unread', filters.unread.toString());
  if (filters.priority) params.append('priority', filters.priority);
  if (filters.page) params.append('page', filters.page.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());

  const res = await api.get(`/notifications?${params.toString()}`);
  return res.data;
}

/**
 * Get notification summary
 */
export async function getNotificationSummary(): Promise<NotificationSummary> {
  const res = await api.get('/notifications/summary');
  return res.data;
}

/**
 * Get user notification preferences
 */
export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const res = await api.get('/notifications/preferences');
  return res.data;
}

/**
 * Update user notification preferences
 */
export async function updateNotificationPreferences(
  preferences: Partial<NotificationPreferences>,
) {
  const res = await api.put('/notifications/preferences', preferences);
  return res.data;
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(id: string) {
  const res = await api.patch(`/notifications/${id}/read`);
  return res.data;
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead() {
  const res = await api.post('/notifications/mark-all-read');
  return res.data;
}

/**
 * Dismiss a notification
 */
export async function dismissNotification(id: string) {
  const res = await api.patch(`/notifications/${id}/dismiss`);
  return res.data;
}

/**
 * Create a test notification
 */
export async function createTestNotification() {
  const res = await api.post('/notifications/test');
  return res.data;
}
