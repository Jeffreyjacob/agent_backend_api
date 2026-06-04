import {
  BookingStatus,
  PaymentStatus,
  PaymentType,
  PropertyStatus,
  Role,
  SubscriptionPlan,
  SubscriptionStatus,
} from "@prisma/client";

export interface IGetUserQuery {
  role?: Role;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface IGetPropertiesQuery {
  status?: PropertyStatus;
  city?: string;
  agentId?: string;
  page?: number;
  limit?: number;
}

export interface IGetBookingsQuery {
  status?: BookingStatus;
  agentId?: string;
  buyerId?: string;
  page?: number;
  limit?: number;
}

export interface IGetSubscriptionsQuery {
  status?: SubscriptionStatus;
  plan?: SubscriptionPlan;
  page?: number;
  limit?: number;
}

export interface IGetPaymentsQuery {
  status?: PaymentStatus;
  type?: PaymentType;
  userId?: string;
  page?: number;
  limit?: number;
}

export interface IGetWebhooksQuery {
  status?: string;
  eventType?: string;
  page?: number;
  limit?: number;
}

export interface IAnalyticsOverview {
  totalUsers: number;
  totalAgents: number;
  totalBuyers: number;
  totalProperties: number;
  activeProperties: number;
  totalBookings: number;
  completedBookings: number;
  totalRevenue: number;
  monthlyRevenue: number;
  activeSubscriptions: number;
  trialingSubscriptions: number;
  failedWebhooks: number;
}

export interface IRevenueAnalytics {
  period: string;
  subscriptionRevenue: number;
  featuredListingRevenue: number;
  totalRevenue: number;
  paymentCount: number;
}
