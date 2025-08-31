'use client';

import { Bell, Warning, CheckCircle, Clock } from '@phosphor-icons/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '@/api/notifications';
import { Button } from '../ui/button';

export function NotificationsDropdown() {
  const queryClient = useQueryClient();

  // ✅ Fetch notifications (no userId needed anymore)
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => getNotifications(false),
  });

  const unreadCount = notifications.filter((n: any) => !n.read).length;

  const markOne = useMutation({
    mutationFn: (id: string) => markNotificationAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAll = useMutation({
    mutationFn: () => markAllNotificationsAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const getIcon = (level: string) => {
    switch (level) {
      case 'success':
        return <CheckCircle className="text-green-500" size={18} />;
      case 'warning':
        return <Warning className="text-yellow-500" size={18} />;
      case 'error':
        return <Warning className="text-red-500" size={18} />;
      default:
        return <Bell className="text-blue-500" size={18} />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell size={22} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-80 max-h-96 overflow-y-auto">
        <div className="flex items-center justify-between p-2 border-b">
          <span className="font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <Button size="sm" onClick={() => markAll.mutate()}>
              Mark all as read
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="p-4 text-sm text-gray-500">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">No notifications</div>
        ) : (
          notifications.map((n: any) => (
            <DropdownMenuItem
              key={n.id}
              onClick={() => markOne.mutate(n.id)}
              className={`flex items-start gap-2 p-3 cursor-pointer ${
                !n.read ? 'bg-gray-100 dark:bg-gray-800' : ''
              }`}
            >
              {getIcon(n.level)}
              <div>
                <span className="text-sm font-medium">{n.message}</span>
                <span className="text-xs text-gray-500 block">
                  {new Date(n.createdAt).toLocaleString()}
                </span>
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
