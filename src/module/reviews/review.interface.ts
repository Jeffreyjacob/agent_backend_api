import { Booking, Property, Review, User } from "@prisma/client";

export interface ICreateReviewPayload {
  propertyId: string;
  bookingId: string;
  rating: number;
  comment: string;
}

export interface IUpdateReviewPayload {
  rating?: number;
  comment?: string;
}

export interface IGetPropertyReview {
  reviews: {
    id: string;
    rating: number;
    comment: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
    createdAt: Date;
  }[];
  averageRating: number;
  totalReviews: number;
}
