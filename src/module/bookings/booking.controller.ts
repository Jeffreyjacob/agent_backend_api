import { Request, Response } from "express";
import { BookingService } from "./booking.service";
import { ResponseHelper } from "../../shared/utils/apiResponse";
import { Role } from "@prisma/client";

export class BookingController {
  constructor(private readonly service: BookingService) {}

  async createBooking(req: Request, res: Response): Promise<void> {
    const result = await this.service.createBooking(
      req.user?.userId as string,
      req.body as any,
    );

    req.log?.info(
      { bookingId: result.id, createdBy: req.user?.userId },
      "Booking created",
    );
    ResponseHelper.created(res, result, "booking created successfully!");
  }

  async confirmBooking(req: Request, res: Response): Promise<void> {
    const result = await this.service.confirmBooking(
      req.user?.userId as string,
      req.params.id as string,
    );

    req.log?.info(
      { bookingId: result.id, confirmedBy: req.user?.userId },
      "booking was confirmed",
    );

    ResponseHelper.success(
      res,
      {
        id: result.id,
        startTime: result.startTime,
        endTime: result.endTime,
        buyer: result.buyerId,
      },
      200,
      "booking has been confirmed",
    );
  }

  async completeBooking(req: Request, res: Response): Promise<void> {
    const result = await this.service.completedBooking(
      req.user?.userId as string,
      req.params.id as string,
    );

    req.log?.info(
      { bookingId: result.id, updatedBy: req.user?.userId },
      "Booking updated to completed",
    );

    ResponseHelper.success(
      res,
      {
        id: result.id,
        startTime: result.startTime,
        endTime: result.endTime,
        buyer: result.buyerId,
      },
      200,
      "Booking updated succcessfully!",
    );
  }

  async noShowBooking(req: Request, res: Response): Promise<void> {
    const result = await this.service.noShowBooking(
      req.user?.userId as string,
      req.params.id as string,
    );

    req.log?.info(
      { bookingId: result.id, updatedBy: req.user?.userId },
      "Booking updated to noshow",
    );

    ResponseHelper.success(
      res,
      {
        id: result.id,
        startTime: result.startTime,
        endTime: result.endTime,
        buyer: result.buyerId,
      },
      200,
      "Booking updated successfully",
    );
  }

  async rescheduleBooking(req: Request, res: Response): Promise<void> {
    const result = await this.service.rescheduleBooking(
      req.user?.userId as string,
      req.params.id as string,
      req.body as any,
    );

    req.log?.info(
      { bookingId: result.id, updatedBy: req.user?.userId },
      "booking reschedule ",
    );

    ResponseHelper.success(
      res,
      {
        id: result.id,
        startTime: result.startTime,
        endTime: result.endTime,
        agentId: result.agentId,
      },
      200,
      "Booking Reschedule successfully!",
    );
  }

  async cancelBooking(req: Request, res: Response): Promise<void> {
    const result = await this.service.cancelBooking(
      req.user?.userId as string,
      req.params.id as string,
      req.body as any,
      req.user?.role as Role,
    );

    req.log?.info(
      {
        bookingId: result.id,
        cancelledBy: req.user?.userId,
        userRole: req.user?.role,
      },
      "booking cancelled",
    );

    ResponseHelper.success(
      res,
      {
        id: result.id,
      },
      200,
      "Booking cancelled successfully!",
    );
  }

  async getBuyerBookings(req: Request, res: Response): Promise<void> {
    const result = await this.service.getBuyerBooking(
      req.user?.userId as string,
      req.query as any,
    );
    ResponseHelper.success(
      res,
      result.data,
      200,
      "buyer booking fetched",
      result.meta,
    );
  }

  async getAgentBookings(req: Request, res: Response): Promise<void> {
    const result = await this.service.getAgentBooking(
      req.user?.userId as string,
      req.query as any,
    );

    ResponseHelper.success(
      res,
      result.data,
      200,
      "Agent booking fetched!",
      result.meta,
    );
  }

  async getBookingById(req: Request, res: Response): Promise<void> {
    const result = await this.service.getBookingById(req.params.id as string);
    ResponseHelper.success(res, result, 200, "booking fetched!");
  }
}
