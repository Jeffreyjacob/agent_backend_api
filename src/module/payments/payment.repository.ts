import { Payment, Prisma } from "@prisma/client";
import { BaseRepository } from "../../shared/repository/baseRepository";
import { prisma } from "../../config/database";
import { IGetPaymentPayload, IPaymentListResponse } from "./payment.interface";
import { BookingDurationEnum } from "../bookings/booking.interface";
import { getDateRange } from "../../shared/utils/helper";

export class PaymentRepository extends BaseRepository<
  Prisma.PaymentDelegate,
  Payment
> {
  constructor() {
    super(prisma.payment);
  }

  async getPayments(
    userId: string,
    data: IGetPaymentPayload,
  ): Promise<IPaymentListResponse> {
    const where: Prisma.Args<Prisma.PaymentDelegate, "findMany">["where"] = {
      userId,
    };

    if (data.date) {
      const duration = data.duration ?? BookingDurationEnum.Daily;
      const dateRange = getDateRange({
        date: data.date,
        duration,
      });

      where.createdAt = { gte: dateRange.start, lte: dateRange.end };
    }

    const payments = await this.findMany({
      where,
      orderBy: {
        createdAt: "asc",
      },
      page: data.page,
      limit: data.limit,
    });

    return {
      data: payments.data,
      meta: {
        total: payments.total,
        totalPages: payments.totalPages,
        page: payments.page,
      },
    };
  }

  async getPaymentById(paymentId: string): Promise<Payment | null> {
    const payment = await this.findById(paymentId);
    return payment;
  }
}
