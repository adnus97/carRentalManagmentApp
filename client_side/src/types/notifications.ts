// client_side/src/types/notifications.ts
export type NotificationCategory =
  | 'RENTAL'
  | 'PAYMENT'
  | 'CUSTOMER'
  | 'CAR'
  | 'MAINTENANCE'
  | 'FINANCIAL'
  | 'SYSTEM';

export type NotificationType =
  | 'RENT_STARTED'
  | 'RENT_COMPLETED'
  | 'RENT_OVERDUE'
  | 'RENT_RETURN_REMINDER'
  | 'RENT_CANCELLED'
  | 'RENT_EXTENDED'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_OVERDUE'
  | 'PAYMENT_PARTIAL'
  | 'DEPOSIT_REFUND_DUE'
  | 'CUSTOMER_REGISTERED'
  | 'CUSTOMER_BLACKLISTED'
  | 'CUSTOMER_RATING_CHANGED'
  | 'CAR_AVAILABLE'
  | 'CAR_MAINTENANCE_DUE'
  | 'CAR_INSURANCE_EXPIRING'
  | 'CAR_DAMAGE_REPORTED'
  | 'REVENUE_TARGET_MET'
  | 'REVENUE_TARGET_MISSED'
  | 'MONTHLY_REPORT_READY'
  | 'SYSTEM_MAINTENANCE'
  | 'USER_ACCOUNT_CHANGED';

export type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type NotificationLevel = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  userId: string;
  orgId?: string;
  category: NotificationCategory;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  level: NotificationLevel;
  read: boolean;
  dismissed: boolean;
  emailSent: boolean;
  createdAt: string;
  readAt?: string;
  expiresAt?: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, any>;
}

export interface NotificationSummary {
  total: number;
  unread: number;
  byCategory: Record<NotificationCategory, number>;
  byPriority: Record<NotificationPriority, number>;
}

export interface NotificationPreferences {
  emailEnabled: boolean;
  pushEnabled: boolean;
  categories: Record<NotificationCategory, boolean>;
  quietHours?: {
    start: string;
    end: string;
  };
}

export interface PaginatedNotifications {
  data: Notification[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
