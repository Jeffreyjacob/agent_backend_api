import {
  Booking,
  BookingReminderJob,
  BookingStatus,
  PropertyStatus,
  Role,
} from "@prisma/client";
import { BookingRepository } from "./booking.repository";
import {
  ICancelBookingPayload,
  ICreateBookingPayload,
} from "./booking.interface";
import { PropertyRepository } from "../property/property.repository";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../shared/error";
import { UserRepositrory } from "../users/user.repository";
import { getCancelBookingQueue } from "../../jobs/queues/cancelBooking";
import { getEmailQueue } from "../../jobs/queues/email";
import { logger } from "../../config/logger";
import { agentBookingNotificationEmail } from "../../shared/utils/emailTemplate/agentNotificationBooking";
import { bookingConfirmedBuyerEmail } from "../../shared/utils/emailTemplate/bookingConfirmationEmail";
import { bookingReminderEmail } from "../../shared/utils/emailTemplate/bookingReminderEmail";
import { prisma } from "../../config/database";
import { bookingNoShowEmail } from "../../shared/utils/emailTemplate/buyerNoShowEmail";
import { bookingCancelledBuyerEmail } from "../../shared/utils/emailTemplate/bookingCancelledBuyerEmail";
import { bookingCancelledAgentEmail } from "../../shared/utils/emailTemplate/bookingCancelledAgentEmail";

export class BookingService {
  constructor(
    private readonly bookingRepo: BookingRepository,
    private readonly propertyRepo: PropertyRepository,
    private readonly userRepo: UserRepositrory,
  ) {}

  async createBooking(
    userId: string,
    data: ICreateBookingPayload,
  ): Promise<Booking> {
    const property = await this.propertyRepo.findById(data.propertyId);
    if (!property) throw new NotFoundError("unable to find property");

    if (
      property.status !== PropertyStatus.ACTIVE &&
      property.status !== PropertyStatus.PENDING
    ) {
      throw new BadRequestError("Propery must be actives");
    }

    const buyer = await this.userRepo.findById(userId);

    if (!buyer) throw new NotFoundError("unable to find buyer");

    const agent = await this.userRepo.findById(property.agentId);
    if (!agent) throw new NotFoundError("unable to find property agent");

    const viewingDuration =
      property.viewingDuration ?? agent.defaultViewingDuration ?? 30;

    const startTime = new Date(data.startTime);
    const endTime = new Date(startTime.getTime() + viewingDuration * 60 * 1000);

    if (startTime < new Date())
      throw new BadRequestError("start time must be greater than now");

    const buyerCheck = await this.bookingRepo.checkBuyerBookingTimeConflict(
      userId,
      startTime,
      endTime,
    );
    const agentCheck = await this.bookingRepo.checkAgentBookingTimeConflict(
      property.agentId,
      startTime,
      endTime,
    );

    if (buyerCheck)
      throw new ConflictError(
        "buyer already have a booking conflicting with the selected time, Please pick a different time",
      );

    if (agentCheck)
      throw new ConflictError(
        "agent already have a booking conflicting with the selected time, Please pick a different time",
      );

    const booking = await this.bookingRepo.create({
      propertyId: data.propertyId,
      buyerId: userId,
      agentId: property.agentId,
      status: BookingStatus.PENDING,
      startTime,
      endTime: endTime,
      ...(data.note && { notes: data.note }),
    });

    // autocancel booking, after 48 hours if agent does not confirmed booking

    const cancelBooking = getCancelBookingQueue();
    const cancelBookingTime = new Date();
    cancelBookingTime.setDate(cancelBookingTime.getDate() + 2);
    const cancelBookingDelay = cancelBookingTime.getTime() - Date.now();

    const cancelBookingJob = await cancelBooking.add(
      "cancelBooking",
      {
        bookingId: booking.id,
        buyerId: userId,
        propertyTitle: property.title,
        propertyAddress: property.address,
      },
      {
        delay: cancelBookingDelay,
      },
    );

    const updateBooking = await this.bookingRepo.update(
      {
        id: booking.id,
      },
      {
        autoConfirmJobId: cancelBookingJob.id,
      },
    );

    if (!updateBooking)
      throw new BadRequestError("unable to update cancel booking job id");

    try {
      const emailJob = getEmailQueue();
      await emailJob.add("email", {
        email: agent.email,
        subject: " New Booking",
        html: agentBookingNotificationEmail({
          agentName: `${agent.firstName} ${agent.lastName}`,
          bookingId: booking.id,
          buyerName: `${buyer.firstName} ${buyer.lastName}`,
          buyerEmail: buyer.email,
          propertyTitle: property.title,
          propertyAddress: property.address,
          viewingDate: booking.startTime.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
          viewingTime: booking.startTime.toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        }),
      });
    } catch (error: any) {
      logger.warn({ err: error }, "unable to add email to queue");
    }

    return booking;
  }

  async confirmBooking(agentId: string, bookingId: string): Promise<Booking> {
    const booking = await this.bookingRepo.findOne({
      id: bookingId,
      agentId,
    });

    if (!booking) throw new NotFoundError("unable to find booking");

    if (booking.status !== "PENDING")
      throw new BadRequestError(
        "booking has already been confirmed or cancelled ",
      );

    const property = await this.propertyRepo.findById(booking.propertyId);
    if (!property) throw new NotFoundError("unable to find property");

    const buyer = await this.userRepo.findById(booking.buyerId);
    if (!buyer) throw new NotFoundError("unable to find buyer");

    const agent = await this.userRepo.findById(agentId);
    if (!agent) throw new NotFoundError("unable to find agent");

    const updateBooking = await this.bookingRepo.update(
      {
        id: booking.id,
      },
      {
        status: BookingStatus.CONFIRMED,
      },
    );

    if (!updateBooking) throw new BadRequestError("unable to confirm booking");

    const emailJob = getEmailQueue();

    // send email to buyer
    try {
      await emailJob.add("email", {
        email: buyer.email,
        subject: "Booking has been confirmed by agent",
        html: bookingConfirmedBuyerEmail({
          buyerName: `${buyer.firstName} ${buyer.lastName}`,
          bookingId: booking.id,
          agentName: `${agent.firstName} ${agent.lastName}`,
          agentEmail: agent.email,
          propertyTitle: property.title,
          propertyAddress: property.address,
          viewingDate: booking.startTime.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
          viewingTime: booking.startTime.toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        }),
      });
    } catch (error: any) {
      logger.warn({ err: error }, "unable to add email to queue");
    }

    // remove cancel booking job

    if (booking.autoConfirmJobId) {
      const cancelQueue = getCancelBookingQueue();
      await cancelQueue.remove(booking.autoConfirmJobId);
    }

    // reminder email to both agent and buyer

    const reminderTime = new Date();
    reminderTime.setDate(reminderTime.getDate() + 1);

    if (reminderTime > booking.startTime) {
      try {
        const emailJob = getEmailQueue();
        const agentEmailJob = await emailJob.add(
          "email",
          {
            email: agent.email,
            subject: "Booking Reminder",
            html: bookingReminderEmail({
              recipientName: `${agent.firstName} ${agent.lastName}`,
              role: "agent",
              bookingId: booking.id,
              propertyTitle: property.title,
              propertyAddress: property.address,
              viewingDate: booking.startTime.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              }),
              viewingTime: booking.startTime.toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              counterpartEmail: buyer.email,
              counterpartName: `${buyer.firstName} ${buyer.lastName}`,
            }),
          },
          {
            delay: reminderTime.getTime() - Date.now(),
          },
        );

        const buyerEmailJob = await emailJob.add(
          "email",
          {
            email: buyer.email,
            subject: "Booking Reminder",
            html: bookingReminderEmail({
              recipientName: `${buyer.firstName} ${buyer.lastName}`,
              role: "buyer",
              bookingId: booking.id,
              propertyAddress: property.address,
              propertyTitle: property.title,
              viewingDate: booking.startTime.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              }),
              viewingTime: booking.startTime.toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              counterpartEmail: agent.email,
              counterpartName: `${agent.firstName} ${agent.lastName}`,
            }),
          },
          {
            delay: reminderTime.getTime() - Date.now(),
          },
        );
        const jobs = [buyerEmailJob.id, agentEmailJob.id];

        await Promise.all(
          jobs.map(
            async (job) =>
              await prisma.bookingReminderJob.create({
                data: {
                  reminderJobId: job!,
                  bookingId,
                },
              }),
          ),
        );
      } catch (error: any) {
        logger.warn({ err: error }, "unable to add email job to queue");
      }
    } else {
      try {
        const emailJob = getEmailQueue();
        await emailJob.add("email", {
          email: agent.email,
          subject: "Booking Reminder",
          html: bookingReminderEmail({
            recipientName: `${agent.firstName} ${agent.lastName}`,
            role: "agent",
            bookingId: booking.id,
            propertyTitle: property.title,
            propertyAddress: property.address,
            viewingDate: booking.startTime.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            }),
            viewingTime: booking.startTime.toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            counterpartEmail: buyer.email,
            counterpartName: `${buyer.firstName} ${buyer.lastName}`,
          }),
        });

        await emailJob.add("email", {
          email: buyer.email,
          subject: "Booking Reminder",
          html: bookingReminderEmail({
            recipientName: `${buyer.firstName} ${buyer.lastName}`,
            role: "buyer",
            bookingId: booking.id,
            propertyAddress: property.address,
            propertyTitle: property.title,
            viewingDate: booking.startTime.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            }),
            viewingTime: booking.startTime.toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            counterpartEmail: agent.email,
            counterpartName: `${agent.firstName} ${agent.lastName}`,
          }),
        });
      } catch (error: any) {
        logger.warn({ err: error }, "unable to add email job to queue");
      }
    }

    return updateBooking;
  }

  async completedBooking(agentId: string, bookingId: string): Promise<Booking> {
    const booking = await this.bookingRepo.findOne({
      agentId,
      id: bookingId,
    });

    if (!booking) throw new NotFoundError("unable to find booking");

    if (booking.status !== "CONFIRMED")
      throw new BadRequestError(
        "You can't completed a booking that yet to be confirmed",
      );

    if (new Date(booking.startTime).getTime() > Date.now())
      throw new BadRequestError(
        "You can't update booking to completed at the moment",
      );

    const updateBooking = await this.bookingRepo.update(
      {
        id: booking.id,
      },
      {
        status: BookingStatus.COMPLETED,
      },
    );

    if (updateBooking) throw new BadRequestError("unable to update booking");

    return booking;
  }

  async noShowBooking(agentId: string, bookingId: string): Promise<Booking> {
    const booking = await this.bookingRepo.findOne({
      agentId,
      id: bookingId,
    });

    if (!booking) throw new NotFoundError("unable to find booking");

    const buyer = await this.userRepo.findById(booking.buyerId);
    if (!buyer) throw new NotFoundError("unable to find buyer");

    const agent = await this.userRepo.findById(agentId);
    if (!agent) throw new NotFoundError("unable to find agent");

    const property = await this.propertyRepo.findById(booking.propertyId);
    if (!property) throw new NotFoundError("unable to find property");

    if (booking.status !== "CONFIRMED")
      throw new BadRequestError(
        "You can't update a booking that yet to be confirmed",
      );

    if (new Date(booking.startTime).getTime() > Date.now())
      throw new BadRequestError(
        "You can't update booking to no show at the moment",
      );

    const updateBooking = await this.bookingRepo.update(
      {
        id: booking.id,
      },
      {
        status: BookingStatus.NO_SHOW,
      },
    );

    if (updateBooking) throw new BadRequestError("unable to update booking");

    try {
      const emailJob = getEmailQueue();
      await emailJob.add("email", {
        email: buyer.email,
        subject: "Booking update",
        html: bookingNoShowEmail({
          buyerName: `${buyer.firstName} ${buyer.lastName}`,
          bookingId: booking.id,
          agentName: `${agent.firstName} ${agent.lastName}`,
          propertyTitle: property.title,
          propertyAddress: property.address,
          viewingDate: booking.startTime.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
          viewingTime: booking.startTime.toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        }),
      });
    } catch (error: any) {
      logger.warn({ err: error }, "unable to queue email job");
    }

    return booking;
  }

  async cancelBooking(
    userId: string,
    bookingId: string,
    data: ICancelBookingPayload,
    role: Role,
  ): Promise<Booking> {
    const booking = await this.bookingRepo.findOne(
      {
        id: bookingId,
        ...(role === Role.AGENT ? { agentId: userId } : { buyerId: userId }),
      },
      {
        reminderJobs: true,
        property: {
          select: {
            title: true,
            address: true,
          },
        },
        buyer: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        agent: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    );

    if (!booking) throw new NotFoundError("unable to find booking");

    if (
      booking.status !== BookingStatus.PENDING &&
      booking.status !== BookingStatus.CONFIRMED
    )
      throw new BadRequestError("You cant update booking at the moment");

    const updateBooking = await this.bookingRepo.update(
      {
        id: booking.id,
      },
      {
        status: BookingStatus.CANCELLED,
        ...(data.cancelReason && { cancelReason: data.cancelReason }),
        cancelledBy: userId,
      },
    );

    if (!updateBooking) throw new BadRequestError("unable to update booking");

    if (booking.status === BookingStatus.PENDING && booking.autoConfirmJobId) {
      const cancelQueue = getCancelBookingQueue();
      await cancelQueue.remove(booking.autoConfirmJobId);
    }

    if (
      booking.status === BookingStatus.CONFIRMED &&
      (booking as any).reminderJobs.length > 0
    ) {
      try {
        const emailJob = getEmailQueue();
        await Promise.all(
          (booking as any).reminderJobs.map(
            async (job: BookingReminderJob) =>
              await emailJob.remove(job.reminderJobId),
          ),
        );
      } catch (error: any) {
        logger.warn(
          { err: error },
          "unable to remove booking reminder job from email queue",
        );
      }

      await prisma.bookingReminderJob.deleteMany({
        where: {
          bookingId: booking.id,
        },
      });
    }
    const emailJob = getEmailQueue();
    if (role === Role.BUYER) {
      try {
        await emailJob.add("email", {
          email: (booking as any).buyer.email,
          subject: "Booking Cancelled",
          html: bookingCancelledBuyerEmail({
            buyerName: `${(booking as any).buyer.firstName} ${(booking as any).buyer.lastName}`,
            bookingId: booking.id,
            agentName: `${(booking as any).agent.firstName} ${(booking as any).agent.lastName}`,
            propertyTitle: (booking as any).property.title,
            propertyAddress: (booking as any).property.address,
            viewingDate: booking.startTime.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            }),
            viewingTime: booking.startTime.toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            cancelReason: data.cancelReason,
          }),
        });
      } catch (error: any) {
        logger.warn({ err: error }, "unable to add email job to queue");
      }
    } else if (role === "AGENT") {
      try {
        await emailJob.add("email", {
          email: (booking as any).agent.email,
          subject: "Booking Cancelled",
          html: bookingCancelledAgentEmail({
            buyerName: `${(booking as any).buyer.firstName} ${(booking as any).buyer.lastName}`,
            bookingId: booking.id,
            agentName: `${(booking as any).agent.firstName} ${(booking as any).agent.lastName}`,
            propertyTitle: (booking as any).property.title,
            propertyAddress: (booking as any).property.address,
            viewingDate: booking.startTime.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            }),
            viewingTime: booking.startTime.toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            cancelReason: data.cancelReason,
          }),
        });
      } catch (error: any) {
        logger.warn({ err: error }, "unable to add email job to queue");
      }
    }

    return updateBooking;
  }
}
