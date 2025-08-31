// client_side/src/api/notifications.ts
import { api } from './api';

/**
 * Get notifications for the current user
 * @param unread - if true, only fetch unread notifications
 */
export async function getNotifications(unread = false) {
  const res = await api.get('/notifications', {
    params: { unread },
  });
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
 * Mark all notifications as read for the current user
 */
export async function markAllNotificationsAsRead() {
  const res = await api.patch(`/notifications/read-all`);
  return res.data;
}
