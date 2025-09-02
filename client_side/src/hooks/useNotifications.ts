// src/hooks/useNotifications.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getNotifications,
  getNotificationSummary,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  dismissNotification,
  NotificationFilters,
} from '../api/notifications';

export function useNotifications(filters: NotificationFilters = {}) {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['notifications', filters],
    queryFn: () => getNotifications(filters),
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
    staleTime: 5000, // Consider data stale after 5 seconds
  });

  const markAsReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-summary'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-summary'] });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: dismissNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-summary'] });
    },
  });

  return {
    notifications: data?.data || [],
    pagination: data
      ? {
          page: data.page,
          limit: data.limit,
          total: data.total,
          totalPages: data.totalPages,
        }
      : null,
    isLoading,
    error,
    refetch, // Expose refetch function
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    dismiss: dismissMutation.mutate,
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
    isDismissing: dismissMutation.isPending,
  };
}

export function useNotificationSummary() {
  return useQuery({
    queryKey: ['notification-summary'],
    queryFn: getNotificationSummary,
    refetchInterval: 30000,
    staleTime: 5000,
  });
}
