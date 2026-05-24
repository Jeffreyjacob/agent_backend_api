import { Booking, BookingStatus, Prisma, Role } from "@prisma/client";
import { BaseRepository } from "../../shared/repository/baseRepository";
import { prisma } from "../../config/database";
import {
  BookingDurationEnum,
  IBookingList,
  ICancelBookingPayload,
  IGetBookingPayload,
} from "./booking.interface";
import { getDateRange } from "../../shared/utils/helper";

export class BookingRepository extends BaseRepository<
  Prisma.BookingDelegate,
  Booking
> {
  constructor() {
    super(prisma.booking);
  }

  async checkBuyerBookingTimeConflict(
    buyerId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<boolean> {
    const checkBooking = await this.findOne({
      buyerId,
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    });

    return !!checkBooking;
  }

  async checkAgentBookingTimeConflict(
    agentId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<boolean> {
    const checkBooking = await this.findOne({
      agentId,
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    });

    return !!checkBooking;
  }

  async getBookings(
    userId: string,
    data: IGetBookingPayload,
    role: Role,
  ): Promise<IBookingList> {
    const dateDuration = getDateRange({
      date: data.date,
      duration: data.duration ?? BookingDurationEnum.Daily,
    });

    const where: Prisma.Args<Prisma.BookingDelegate, "findMany">["where"] = {
      createdAt: { gte: dateDuration.start, lte: dateDuration.end },
      ...(role === Role.AGENT
        ? { agentId: userId }
        : role === Role.BUYER
          ? { buyerId: userId }
          : {}),
    };

    if (data.status) {
      where.status = data.status;
    }

    const result = await this.findMany({
      where,
      page: data.page,
      limit: data.limit,
    });

    return {
      data: result.data,
      meta: {
        total: result.total,
        totalPages: result.totalPages,
        page: result.page,
      },
    };
  }

  async cancelBooking(
    bookingId: string,
    userId: string,
    data: ICancelBookingPayload,
  ): Promise<Booking | null> {
    return await this.update(
      { id: bookingId },
      {
        status: BookingStatus.CANCELLED,
        cancelledBy: userId,
        cancelReason: data.cancelReason,
      },
    );
  }

  async rescheduleBooking(
    bookingId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<Booking | null> {
    return await this.update(
      { id: bookingId },
      {
        startTime,
        endTime,
      },
    );
  }
}
