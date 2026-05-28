import { Payment, PaymentStatus } from "@prisma/client";
import { BookingDurationEnum } from "../bookings/booking.interface";

export interface IGetPaymentPayload {
  page: number;
  limit: number;
  status: PaymentStatus;
  date: Date;
  duration: BookingDurationEnum;
}

export interface IPaymentListResponse {
  data: Payment[];
  meta: {
    total: number;
    totalPages: number;
    page: number;
  };
}
