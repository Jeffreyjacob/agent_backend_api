import { Prisma } from "@prisma/client";
import {
  IGetBookingsQuery,
  IGetPaymentsQuery,
  IGetPropertiesQuery,
  IGetSubscriptionsQuery,
  IGetUserQuery,
  IGetWebhooksQuery,
} from "./admin.interface";
import { prisma } from "../../config/database";

export class AdminRepository {
  async getUsers(query: IGetUserQuery) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.Args<Prisma.UserDelegate, "findMany">["where"] = {};

    if (query.role) where.role = query.role;
    if (query.isActive !== undefined) where.isActive = query.isActive;
    if (query.search) {
      where.OR = [
        {
          email: { contains: query.search, mode: "insensitive" },
        },
        {
          firstName: { contains: query.search, mode: "insensitive" },
        },
        {
          lastName: { contains: query.search, mode: "insensitive" },
        },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          firstName: true,
          role: true,
          isActive: true,
          emailVerifed: true,
          lastLogin: true,
          createdAt: true,
          subscription: {
            select: {
              plan: true,
              status: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUserById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        emailVerifed: true,
        lastLogin: true,
        stripeCustomerId: true,
        subscription: true,
        _count: {
          select: {
            properites: true,
            bookingsAsBuyer: true,
            bookingsAsAgent: true,
            reviews: true,
          },
        },
      },
    });
  }

  async getProperties(query: IGetPropertiesQuery) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.Args<Prisma.PropertyDelegate, "findMany">["where"] = {};

    if (query.status) where.status = query.status;
    if (query.city) where.city = { contains: query.city, mode: "insensitive" };
    if (query.agentId) where.agentId = query.agentId;

    const [data, total] = await Promise.all([
      prisma.property.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          agent: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          _count: {
            select: { bookings: true, reviews: true },
          },
        },
      }),
      prisma.property.count({ where }),
    ]);

    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getBooking(query: IGetBookingsQuery) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.Args<Prisma.BookingDelegate, "findMany">["where"] = {};

    if (query.status) where.status = query.status;
    if (query.agentId) where.agentId = query.agentId;
    if (query.buyerId) where.buyerId = query.buyerId;

    const [data, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          buyer: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          agent: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          property: {
            select: { id: true, title: true, address: true, city: true },
          },
        },
      }),
      prisma.booking.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getSubscriptions(query: IGetSubscriptionsQuery) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.Args<Prisma.SubscriptionDelegate, "findMany">["where"] =
      {};

    if (query.status) where.status = query.status;
    if (query.plan) where.plan = query.plan;

    const [data, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      prisma.subscription.count({ where }),
    ]);

    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getPayments(query: IGetPaymentsQuery) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.Args<Prisma.PaymentDelegate, "findMany">["where"] = {};
    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;
    if (query.userId) where.userId = query.userId;

    const [data, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      prisma.payment.count({ where }),
    ]);

    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getWebhooks(query: IGetWebhooksQuery) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.Args<Prisma.WebhookEventDelegate, "findMany">["where"] =
      {};

    const [data, total] = await Promise.all([
      prisma.webhookEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.webhookEvent.count({ where }),
    ]);

    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getOverview() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      totalAgents,
      totalBuyers,
      totalProperties,
      activeProperties,
      totalBookings,
      completedBookings,
      totalRevenue,
      monthlyRevenue,
      activeSubscriptions,
      trialingSubscriptions,
      failedWebhooks,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "AGENT" } }),
      prisma.user.count({ where: { role: "BUYER" } }),
      prisma.property.count(),
      prisma.property.count({ where: { status: "ACTIVE" } }),
      prisma.booking.count(),
      prisma.booking.count({ where: { status: "COMPLETED" } }),
      prisma.payment.aggregate({
        where: { status: "SUCCEEDED" },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { status: "SUCCEEDED", createdAt: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      prisma.subscription.count({ where: { status: "ACTIVE" } }),
      prisma.subscription.count({ where: { status: "TRIAL" } }),
      prisma.webhookEvent.count({ where: { status: "FAILED" } }),
    ]);

    return {
      totalUsers,
      totalAgents,
      totalBuyers,
      totalProperties,
      activeProperties,
      totalBookings,
      completedBookings,
      totalRevenue,
      monthlyRevenue,
      activeSubscriptions,
      trialingSubscriptions,
      failedWebhooks,
    };
  }

  async getRevenueAnalytics(month?: number) {
    const results: any[] = [];
    const currentMonth = month ? month : new Date().getMonth();

    for (let i = 0; i < currentMonth; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - 1);
      const start = new Date(date.getMonth() - 1);
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const [subscription, featured] = await Promise.all([
        prisma.payment.aggregate({
          where: {
            type: "SUBSCRIPTION",
            status: "SUCCEEDED",
            createdAt: { gte: start, lte: end },
          },
          _sum: { amount: true },
          _count: true,
        }),
        prisma.payment.aggregate({
          where: {
            type: "FEATURED_LISTING",
            status: "SUCCEEDED",
            createdAt: { gte: start, lte: end },
          },
          _sum: { amount: true },
          _count: true,
        }),
      ]);

      results.push({
        period: start.toLocaleDateString("en-GB", {
          month: "long",
          year: "numeric",
        }),
        subscriptionRevenue: subscription._sum.amount ?? 0,
        featuredListingRevenue: featured._sum.amount ?? 0,
        totalRevenue:
          (subscription._sum.amount ?? 0) + (featured._sum.amount ?? 0),
        paymentCount: subscription._count + featured._count,
      });

      return results.reverse();
    }
  }
}
