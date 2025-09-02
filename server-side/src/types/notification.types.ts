// src/types/notification.types.ts
export type NotificationCategory =
  | 'RENTAL'
  | 'PAYMENT'
  | 'CUSTOMER'
  | 'CAR'
  | 'MAINTENANCE'
  | 'FINANCIAL'
  | 'SYSTEM';

export type NotificationType =
  // Rental notifications
  | 'RENT_STARTED'
  | 'RENT_COMPLETED'
  | 'RENT_OVERDUE'
  | 'RENT_RETURN_REMINDER'
  | 'RENT_CANCELLED'
  | 'RENT_EXTENDED'

  // Payment notifications
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_OVERDUE'
  | 'PAYMENT_PARTIAL'
  | 'DEPOSIT_REFUND_DUE'

  // Customer notifications
  | 'CUSTOMER_REGISTERED'
  | 'CUSTOMER_BLACKLISTED'
  | 'CUSTOMER_RATING_CHANGED'

  // Car notifications
  | 'CAR_AVAILABLE'
  | 'CAR_MAINTENANCE_DUE'
  | 'CAR_INSURANCE_EXPIRING'
  | 'CAR_DAMAGE_REPORTED'

  // Financial notifications
  | 'REVENUE_TARGET_MET'
  | 'REVENUE_TARGET_MISSED'
  | 'MONTHLY_REPORT_READY'

  // System notifications
  | 'SYSTEM_MAINTENANCE'
  | 'USER_ACCOUNT_CHANGED';

export type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface NotificationPreferences {
  emailEnabled: boolean;
  pushEnabled: boolean;
  categories: Record<NotificationCategory, boolean>;
  quietHours?: {
    start: string; // HH:mm format
    end: string;
  };
}

export interface NotificationSummary {
  total: number;
  unread: number;
  byCategory: Record<NotificationCategory, number>;
  byPriority: Record<NotificationPriority, number>;
}
