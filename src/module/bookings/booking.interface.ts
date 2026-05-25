import { Booking, BookingStatus, Property, User } from "@prisma/client";

export enum BookingDurationEnum {
  Daily = "Daily",
  Weekly = "Weekly",
  Monthly = "Monthly",
}

export interface ICreateBookingPayload {
  propertyId: string;
  startTime: Date;
  note?: string;
}

export interface IGetBookingPayload {
  status: BookingStatus;
  date: Date;
  duration: BookingDurationEnum;
  page?: number;
  limit?: number;
}

export interface ICancelBookingPayload {
  cancelReason?: string;
}

export interface IRescheduleBookingPayload {
  startTime: Date;
}

export interface IBookingResponse extends Booking {
  buyer: Pick<User, "id" | "firstName" | "lastName" | "email">;
  property: Pick<Property, "id" | "title" | "type" | "category" | "address">;
  agent: Pick<User, "id" | "firstName" | "lastName" | "email">;
}

export interface IBookingList {
  data: Booking[];
  meta: {
    total: number;
    totalPages: number;
    page: number;
  };
}
