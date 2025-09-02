// src/components/notifications/NotificationsDropdown.tsx
import {
  Bell,
  X,
  Check,
  FunnelSimple,
  Gear,
  ArrowClockwise,
} from '@phosphor-icons/react';
import { useNavigate } from '@tanstack/react-router';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import {
  useNotifications,
  useNotificationSummary,
} from '../../hooks/useNotifications';
import {
  getCategoryIcon,
  formatTimeAgo,
  CATEGORY_ICONS,
} from '../../utils/notifications';
import { useState, useEffect } from 'react';
import { NotificationFilters } from '../../api/notifications';
import {
  Notification,
  NotificationCategory,
  NotificationPriority,
} from '../../types/notifications';
import { useQueryClient } from '@tanstack/react-query';

// Updated priority colors with blue Medium
const getPriorityBadgeColor = (priority: NotificationPriority) => {
  switch (priority) {
    case 'URGENT':
      return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
    case 'HIGH':
      return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800';
    case 'MEDIUM':
      return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800';
    case 'LOW':
      return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800/20 dark:text-gray-400 dark:border-gray-700';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export function NotificationsDropdown() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<NotificationFilters>({ limit: 15 });
  const [showFilters, setShowFilters] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [timeUpdateTrigger, setTimeUpdateTrigger] = useState(0);
  const { data: summary, refetch: refetchSummary } = useNotificationSummary();

  const {
    notifications,
    isLoading,
    markAsRead,
    markAllAsRead,
    dismiss,
    isMarkingAllAsRead,
    refetch: refetchNotifications,
  } = useNotifications(filters);

  const unreadCount = summary?.unread || 0;

  // Auto-refresh when dropdown opens
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchNotifications(),
        refetchSummary(),
        queryClient.invalidateQueries({ queryKey: ['notifications'] }),
        queryClient.invalidateQueries({ queryKey: ['notification-summary'] }),
      ]);
    } catch (error) {
      console.error('Failed to refresh notifications:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle dropdown open/close
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      handleRefresh(); // Auto-refresh when opened
    }
  };

  // Refresh when filters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      refetchNotifications();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [filters, refetchNotifications]);
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      // Force re-render to update time displays
      setTimeUpdateTrigger((prev) => prev + 1);
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [isOpen]);
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }

    if (notification.actionUrl) {
      navigate({ to: notification.actionUrl });
    }
  };

  const CategoryIcon = ({ category }: { category: NotificationCategory }) => {
    const Icon = getCategoryIcon(category);
    return (
      <Icon
        size={18}
        className={`${CATEGORY_ICONS[category] ? 'text-current' : 'text-blue-500'}`}
      />
    );
  };

  const NotificationItem = ({
    notification,
  }: {
    notification: Notification;
  }) => {
    return (
      <div
        className={`group relative p-4 transition-all duration-200 cursor-pointer hover:bg-gray-50/80 dark:hover:bg-gray-800/50 border-l-3 ${
          !notification.read
            ? 'bg-blue-50/30 dark:bg-blue-950/10 border-l-blue-500 shadow-sm'
            : 'border-l-transparent hover:border-l-gray-200 dark:hover:border-l-gray-700'
        }`}
        onClick={() => handleNotificationClick(notification)}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <div
              className={`p-2 rounded-full ${
                !notification.read
                  ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
              }`}
            >
              <CategoryIcon category={notification.category} />
            </div>
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 leading-5">
                {notification.title}
              </h4>

              <div className="flex items-center gap-2 flex-shrink-0">
                {notification.priority !== 'LOW' && (
                  <Badge
                    variant="secondary"
                    className={`text-xs font-medium ${getPriorityBadgeColor(notification.priority)}`}
                  >
                    {notification.priority}
                  </Badge>
                )}
                {!notification.read && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                )}
              </div>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-300 leading-5 line-clamp-2">
              {notification.message}
            </p>

            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400 font-medium">
                {formatTimeAgo(notification.createdAt)}
              </span>

              {notification.actionUrl && (
                <span className="text-blue-600 dark:text-blue-400 font-medium">
                  {notification.actionLabel || 'View details'} →
                </span>
              )}
            </div>
          </div>

          {/* Dismiss button */}
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              dismiss(notification.id);
            }}
          >
            <X size={14} />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <Bell size={20} className="text-gray-600 dark:text-gray-300" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs font-bold border-2 border-white dark:border-gray-900 text-white"
              style={{ backgroundColor: '#EC6142' }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-[420px] max-h-[600px] p-0 shadow-lg border"
        align="end"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex items-center gap-3">
            <Bell size={20} className="text-gray-600 dark:text-gray-300" />
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <p className="text-xs text-gray-500">{unreadCount} unread</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Refresh button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-8 w-8 p-0"
              title="Refresh notifications"
            >
              <ArrowClockwise
                size={16}
                className={isRefreshing ? 'animate-spin' : ''}
              />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={`h-8 w-8 p-0 transition-colors ${showFilters ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
            >
              <FunnelSimple size={16} />
            </Button>

            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllAsRead()}
                disabled={isMarkingAllAsRead}
                className="text-xs px-3 h-8 font-medium"
              >
                <Check size={14} className="mr-1" />
                Mark all read
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="p-4 border-b bg-white dark:bg-gray-900/50 space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <Gear size={16} className="text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Filter options
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Category Filter */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  Category
                </label>
                <Select
                  value={filters.category || 'all'}
                  onValueChange={(value) =>
                    setFilters((f) => ({
                      ...f,
                      category:
                        value === 'all'
                          ? undefined
                          : (value as NotificationCategory),
                    }))
                  }
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    <SelectItem value="RENTAL">🚗 Rentals</SelectItem>
                    <SelectItem value="PAYMENT">💳 Payments</SelectItem>
                    <SelectItem value="CUSTOMER">👤 Customers</SelectItem>
                    <SelectItem value="CAR">🚙 Cars</SelectItem>
                    <SelectItem value="MAINTENANCE">🔧 Maintenance</SelectItem>
                    <SelectItem value="FINANCIAL">📊 Financial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Priority Filter */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  Priority
                </label>
                <Select
                  value={filters.priority || 'all'}
                  onValueChange={(value) =>
                    setFilters((f) => ({
                      ...f,
                      priority:
                        value === 'all'
                          ? undefined
                          : (value as NotificationPriority),
                    }))
                  }
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All priorities</SelectItem>
                    <SelectItem value="URGENT">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        Urgent
                      </div>
                    </SelectItem>
                    <SelectItem value="HIGH">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                        High
                      </div>
                    </SelectItem>
                    <SelectItem value="MEDIUM">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        Medium
                      </div>
                    </SelectItem>
                    <SelectItem value="LOW">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                        Low
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Quick filter buttons */}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                variant={filters.unread ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilters((f) => ({ ...f, unread: !f.unread }))}
                className="h-8 text-xs font-medium"
              >
                Unread only
              </Button>

              {(filters.category || filters.priority || filters.unread) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilters({ limit: 15 })}
                  className="h-8 text-xs text-gray-500"
                >
                  Clear filters
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Notifications List */}
        <ScrollArea className="max-h-[450px] overflow-y-auto overflow-x-hidden">
          {isLoading || isRefreshing ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-sm text-gray-500">
                {isRefreshing
                  ? 'Refreshing notifications...'
                  : 'Loading notifications...'}
              </p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                <Bell size={32} className="text-gray-400" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                  No notifications found
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  You're all caught up! 🎉
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-3 border-t bg-gray-50/50 dark:bg-gray-800/50 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Showing {notifications.length} of {summary?.total || 0}{' '}
              notifications
            </p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
