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
import { ConflictError } from "../../shared/error";

export class BookingRepository extends BaseRepository<
  Prisma.BookingDelegate,
  Booking
> {
  constructor() {
    super(prisma.booking);
  }

  async createBookingWithLock(data: {
    startTime: Date;
    endTime: Date;
    agentId: string;
    buyerId: string;
    propertyId: string;
    note?: string;
  }): Promise<Booking> {
    const booking = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${data.agentId}))`;

      const agentConflict = await tx.booking.findFirst({
        where: {
          agentId: data.agentId,
          status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
          startTime: { lt: data.endTime },
          endTime: { gt: data.startTime },
        },
      });

      if (agentConflict)
        throw new ConflictError(
          "Agent already has a booking at this time, Please pick a different time",
        );

      const buyerConflict = await tx.booking.findFirst({
        where: {
          buyerId: data.buyerId,
          status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
          startTime: { lt: data.endTime },
          endTime: { gt: data.startTime },
        },
      });

      if (buyerConflict)
        throw new ConflictError("You already have a booking at this");

      return await tx.booking.create({
        data: {
          propertyId: data.propertyId,
          buyerId: data.buyerId,
          agentId: data.agentId,
          status: BookingStatus.PENDING,
          startTime: data.startTime,
          endTime: data.endTime,
          ...(data.note && { notes: data.note }),
        },
      });
    });

    return booking;
  }
  async updateBookingWithLock(data: {
    startTime: Date;
    endTime: Date;
    agentId: string;
    buyerId: string;
    bookingId: string;
  }): Promise<Booking> {
    const booking = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${data.agentId}))`;

      const agentConflict = await tx.booking.findFirst({
        where: {
          agentId: data.agentId,
          status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
          startTime: { lt: data.endTime },
          endTime: { gt: data.startTime },
        },
      });

      if (agentConflict)
        throw new ConflictError(
          "Agent already has a booking at this time, Please pick a different time",
        );

      const buyerConflict = await tx.booking.findFirst({
        where: {
          buyerId: data.buyerId,
          status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
          startTime: { lt: data.endTime },
          endTime: { gt: data.startTime },
        },
      });

      if (buyerConflict)
        throw new ConflictError("You already have a booking at this");

      return await tx.booking.update({
        where: {
          id: data.bookingId,
        },
        data: {
          startTime: data.startTime,
          endTime: data.endTime,
        },
      });
    });

    return booking;
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
