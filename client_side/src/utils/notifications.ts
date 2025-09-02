// client_side/src/utils/notifications.ts
import {
  Bell,
  Warning,
  CheckCircle,
  Clock,
  Car,
  User,
  CreditCard,
  Wrench,
  TrendUp,
  Gear,
  Info,
} from '@phosphor-icons/react';
import {
  NotificationCategory,
  NotificationLevel,
  NotificationPriority,
} from '@/types/notifications';

export const CATEGORY_ICONS = {
  RENTAL: Car,
  PAYMENT: CreditCard,
  CUSTOMER: User,
  CAR: Car,
  MAINTENANCE: Wrench,
  FINANCIAL: TrendUp,
  SYSTEM: Gear,
} as const;

export const CATEGORY_COLORS = {
  RENTAL: 'text-blue-500',
  PAYMENT: 'text-green-500',
  CUSTOMER: 'text-purple-500',
  CAR: 'text-orange-500',
  MAINTENANCE: 'text-yellow-500',
  FINANCIAL: 'text-emerald-500',
  SYSTEM: 'text-gray-500',
} as const;

export const PRIORITY_COLORS = {
  LOW: 'text-gray-500',
  MEDIUM: 'text-blue-500',
  HIGH: 'text-orange-500',
  URGENT: 'text-red-500',
} as const;

export const LEVEL_STYLES = {
  info: 'border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800',
  success:
    'border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800',
  warning:
    'border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800',
  error: 'border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800',
} as const;

export function getCategoryIcon(category: NotificationCategory) {
  return CATEGORY_ICONS[category] || Bell;
}

export function getLevelIcon(level: NotificationLevel) {
  switch (level) {
    case 'success':
      return CheckCircle;
    case 'warning':
      return Warning;
    case 'error':
      return Warning;
    default:
      return Info;
  }
}

export function getPriorityBadgeColor(priority: NotificationPriority) {
  switch (priority) {
    case 'URGENT':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'HIGH':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    case 'MEDIUM':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'LOW':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
}
export const getPriorityCircleColor = (priority: NotificationPriority) => {
  switch (priority) {
    case 'URGENT':
      return 'bg-red-500';
    case 'HIGH':
      return 'bg-orange-500';
    case 'MEDIUM':
      return 'bg-blue-500'; // Changed from yellow to blue
    case 'LOW':
      return 'bg-gray-400';
    default:
      return 'bg-gray-400';
  }
};
export function formatTimeAgo(dateString: string): string {
  try {
    const now = new Date();
    const date = new Date(dateString);

    // Debug logging (remove after fixing)
    console.log('formatTimeAgo - Input:', dateString);
    console.log('formatTimeAgo - Parsed date:', date.toISOString());
    console.log('formatTimeAgo - Current time:', now.toISOString());

    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date string:', dateString);
      return 'Invalid date';
    }

    const diffInMilliseconds = now.getTime() - date.getTime();
    const diffInSeconds = Math.floor(diffInMilliseconds / 1000);

    console.log('formatTimeAgo - Diff in seconds:', diffInSeconds);

    // Handle future dates
    if (diffInSeconds < 0) {
      return 'Just now';
    }

    // Less than 30 seconds
    if (diffInSeconds < 30) {
      return 'Just now';
    }

    // Less than 60 seconds
    if (diffInSeconds < 60) {
      return `${diffInSeconds}s ago`;
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${diffInDays}d ago`;
    }

    if (diffInDays < 30) {
      const diffInWeeks = Math.floor(diffInDays / 7);
      return `${diffInWeeks}w ago`;
    }

    // For very old notifications, show the actual date
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: now.getFullYear() !== date.getFullYear() ? 'numeric' : undefined,
    });
  } catch (error) {
    console.error('Error formatting time ago:', error, 'Input:', dateString);
    return 'Unknown';
  }
}
