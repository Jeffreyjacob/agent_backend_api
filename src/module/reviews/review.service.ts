import { BookingStatus, Review } from "@prisma/client";
import { ReviewRepository } from "./review.repository";
import {
  ICreateReviewPayload,
  IGetPropertyReview,
  IUpdateReviewPayload,
} from "./review.interface";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../shared/error";
import { BookingRepository } from "../bookings/booking.repository";

export class ReviewService {
  constructor(
    private readonly reviewRepo: ReviewRepository,
    private readonly bookingRepo: BookingRepository,
  ) {}

  async createReview(
    userId: string,
    data: ICreateReviewPayload,
  ): Promise<Review> {
    const checkIfReviewExist = await this.reviewRepo.exists({
      propertyId: data.propertyId,
      bookingId: data.bookingId,
    });

    if (checkIfReviewExist)
      throw new ConflictError("You already left a review on this property");

    const booking = await this.bookingRepo.findOne({
      id: data.bookingId,
      status: BookingStatus.COMPLETED,
    });

    if (!booking)
      throw new BadRequestError(
        "booking does not exist or yet to be completed",
      );

    const review = await this.reviewRepo.create({
      userId,
      ...data,
    });

    return review;
  }

  async updateReview(
    userId: string,
    reviewId: string,
    data: IUpdateReviewPayload,
  ): Promise<Review> {
    const findReview = await this.reviewRepo.findOne({
      userId,
      id: reviewId,
    });

    if (!findReview) throw new NotFoundError("unable to find review");

    const twoDayFromNow = new Date(
      new Date(findReview.createdAt).getTime() + 48 * 60 * 60 * 1000,
    );

    if (Date.now() > twoDayFromNow.getTime())
      throw new BadRequestError(
        "You can't update review after 48 hours after creating review",
      );

    const updateReview = await this.reviewRepo.updateReview(reviewId, data);
    if (!updateReview) throw new BadRequestError("unable to update review");
    return updateReview;
  }

  async deleteReview(userId: string, reviewId: string): Promise<void> {
    const findReview = await this.reviewRepo.findOne({
      id: reviewId,
      userId,
    });

    if (!findReview) throw new NotFoundError("unable to find review");

    await this.reviewRepo.delete({
      id: reviewId,
    });
  }

  async getPropertyReview(propertyId: string): Promise<IGetPropertyReview> {
    return await this.reviewRepo.getPropertiesReview(propertyId);
  }
}
